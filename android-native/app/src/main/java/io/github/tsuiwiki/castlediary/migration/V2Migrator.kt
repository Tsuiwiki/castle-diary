package io.github.tsuiwiki.castlediary.migration

import android.content.Context
import io.github.tsuiwiki.castlediary.data.CastleDatabase
import io.github.tsuiwiki.castlediary.data.DiaryMediaRelation
import io.github.tsuiwiki.castlediary.data.LegacyRaw
import io.github.tsuiwiki.castlediary.data.MediaAsset
import io.github.tsuiwiki.castlediary.media.MediaStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.Base64

/**
 * v2 备份导入导出（M9）：与网页版 castle-books v2 格式严格互通。
 * 导出：Room（核心表 + LegacyRaw 重组）+ 媒体 base64 内联 + SHA-1 校验和。
 * 导入：校验 → 媒体落盘 → 核心入库 + LegacyRaw 兜底 → 完整性报告。
 */
class V2Migrator(
    private val context: Context,
    private val db: CastleDatabase,
    private val mediaStore: MediaStore,
    private val profileStore: io.github.tsuiwiki.castlediary.data.ProfileStore,
) {

    private val mediaDao = db.mediaDao()
    private val relationDao = db.relationDao()
    private val legacyDao = db.legacyRawDao()

    // ---------- 导出 ----------

    suspend fun export(): String = withContext(Dispatchers.IO) {
        val root = JSONObject()
        root.put("app", "castle-books")
        root.put("version", 2)
        root.put("exportedAt", nowIso())

        // settings（孩子档案，从 DataStore 读）
        val profile = profileStore.current()
        root.put("settings", JSONObject().apply {
            put("childName", profile.childName)
            put("birthday", profile.birthday)
            put("pronoun", profile.pronoun)
        })

        // 核心集合：从 Room 重组
        val diaries = JSONArray()
        val dayStates = JSONArray()
        val photos = JSONArray()
        val covers = JSONArray()

        // 日记 → diaries
        // 注意：MVP 的 DiaryEntry 承载了原 PWA 的 diaries + 五种贴纸记录；
        // 导出时统一写进 diaries 数组（text 保留），保持 v2 兼容。
        val allDiaries = db.diaryDao().observeAllForExport()
        val mediaSet = HashSet<String>()

        for (e in allDiaries) {
            diaries.put(JSONObject().apply {
                put("id", e.id)
                put("date", e.date)
                put("mood", "")
                put("text", e.text)
                put("by", e.by)
                put("createdAt", e.createdAt)
                put("updatedAt", e.updatedAt)
            })
        }

        // 每日状态
        val allSummary = db.dailySummaryDao().allForExport()
        for (s in allSummary) {
            dayStates.put(JSONObject().apply {
                put("id", "ds-" + s.date)
                put("date", s.date)
                put("mood", s.mood)
            })
        }

        // 媒体 + 照片关系
        val allMedia = mediaDao.allForExport()
        for (m in allMedia) {
            val file = mediaStore.resolve(m.relativePath)
            val dataUrl = if (file.exists()) {
                val bytes = file.readBytes()
                "data:${m.mimeType};base64," + Base64.getEncoder().encodeToString(bytes)
            } else null
            covers.put(JSONObject().apply {
                put("id", m.id)
                if (dataUrl != null) put("dataUrl", dataUrl)
            })
        }
        val allRels = relationDao.allForExport()
        for (r in allRels) {
            photos.put(JSONObject().apply {
                put("id", "ph-" + r.diaryId + "-" + r.mediaId)
                put("date", "")
                put("note", "")
                put("imageId", r.mediaId)
            })
        }

        root.put("diaries", diaries)
        root.put("dayStates", dayStates)
        root.put("photos", photos)
        root.put("covers", covers)

        // LegacyRaw 兜底集合重组（保证旧数据不丢、网页版可读）
        for (collection in LEGACY_COLLECTIONS) {
            val arr = JSONArray()
            legacyDao.byCollection(collection).forEach { arr.put(JSONObject(it.json)) }
            root.put(collection, arr)
        }

        // 其余必需的空集合（网页版 dataCheck 要求存在）
        for (c in listOf("books", "words", "medicines", "healths", "vaccines",
            "meals", "toys", "milestones", "trips", "games", "foods", "places",
            "illnesses", "members")) {
            if (!root.has(c)) root.put(c, JSONArray())
        }

        val json = root.toString()
        val checksum = sha1(json)
        // 网页版 checksum 是放在导出时计算的；这里把 checksum 附加到顶层（dataCheck 读取）
        root.put("checksum", checksum)
        root.toString()
    }

    // ---------- 导入 ----------

    data class ImportReport(
        val diariesImported: Int,
        val mediaImported: Int,
        val legacyCollections: Int,
        val legacyItems: Int,
        val warnings: List<String>,
    )

    suspend fun import(jsonText: String): ImportReport = withContext(Dispatchers.IO) {
        val root = JSONObject(jsonText)
        val version = root.optInt("version", -1)
        if (version != 2) throw IllegalArgumentException("不支持的备份版本：$version（当前仅支持 v2）")

        val warnings = mutableListOf<String>()

        // 0. 孩子档案（settings → DataStore）
        val settings = root.optJSONObject("settings")
        if (settings != null) {
            profileStore.importFrom(
                settings.optString("childName"),
                settings.optString("birthday"),
                settings.optString("pronoun"),
            )
        }

        // 1. 日记
        var diariesImported = 0
        val diariesArr = root.optJSONArray("diaries") ?: JSONArray()
        for (i in 0 until diariesArr.length()) {
            val o = diariesArr.getJSONObject(i)
            db.diaryDao().upsert(io.github.tsuiwiki.castlediary.data.DiaryEntry(
                id = o.optString("id", "imp-" + i),
                date = o.optString("date"),
                happenedAt = o.optString("createdAt").ifBlank { null },
                title = "",
                text = o.optString("text"),
                by = o.optString("by"),
                entryKind = "migrated",
                payload = "{}",
                createdAt = o.optString("createdAt"),
                updatedAt = o.optString("updatedAt"),
            ))
            diariesImported++
        }

        // 2. 每日状态
        val dayStatesArr = root.optJSONArray("dayStates") ?: JSONArray()
        for (i in 0 until dayStatesArr.length()) {
            val o = dayStatesArr.getJSONObject(i)
            db.dailySummaryDao().upsert(io.github.tsuiwiki.castlediary.data.DailySummary(
                date = o.optString("date"),
                mood = o.optString("mood"),
                energyState = "",
                note = "",
                createdAt = nowIso(),
                updatedAt = nowIso(),
            ))
        }

        // 3. 媒体
        var mediaImported = 0
        val coversArr = root.optJSONArray("covers") ?: JSONArray()
        for (i in 0 until coversArr.length()) {
            val o = coversArr.getJSONObject(i)
            val id = o.optString("id", "media-" + i)
            val dataUrl = o.optString("dataUrl")
            if (dataUrl.isBlank()) { warnings.add("媒体 $id 缺失 dataUrl，已跳过"); continue }
            val (mime, b64) = parseDataUrl(dataUrl)
            if (b64 == null) { warnings.add("媒体 $id 格式无法解析，已跳过"); continue }
            val bytes = Base64.getDecoder().decode(b64)
            val stored = mediaStore.save(id, if (mime.contains("audio")) MediaStore.Kind.AUDIO else MediaStore.Kind.IMAGE, bytes, mime)
            mediaDao.upsert(MediaAsset(id, if (mime.contains("audio")) "audio" else "image", stored.relativePath, mime, stored.sizeBytes, stored.sha256, nowIso()))
            mediaImported++
        }

        // 4. LegacyRaw 兜底：17 集合原样保留
        var legacyCollections = 0
        var legacyItems = 0
        for (collection in LEGACY_COLLECTIONS) {
            val arr = root.optJSONArray(collection) ?: continue
            val raws = mutableListOf<LegacyRaw>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val id = o.optString("id", collection + "-" + i)
                raws.add(LegacyRaw(collection + ":" + id, collection, o.toString()))
            }
            if (raws.isNotEmpty()) {
                legacyDao.upsertAll(raws)
                legacyCollections++
                legacyItems += raws.size
            }
        }

        ImportReport(diariesImported, mediaImported, legacyCollections, legacyItems, warnings)
    }

    // ---------- 工具 ----------

    private fun parseDataUrl(dataUrl: String): Pair<String, String?> {
        if (!dataUrl.startsWith("data:")) return dataUrl to null
        val comma = dataUrl.indexOf(',')
        if (comma < 0) return dataUrl to null
        val meta = dataUrl.substring(5, comma)
        val mime = meta.substringBefore(';').ifBlank { "application/octet-stream" }
        return mime to dataUrl.substring(comma + 1)
    }

    private fun sha1(s: String): String =
        MessageDigest.getInstance("SHA-1").digest(s.toByteArray())
            .joinToString("") { "%02x".format(it) }

    private fun nowIso(): String = java.time.LocalDateTime.now().toString()

    companion object {
        private val LEGACY_COLLECTIONS = listOf(
            "books", "words", "medicines", "healths", "vaccines", "meals", "toys",
            "milestones", "trips", "games", "foods", "places", "illnesses", "members",
        )
    }
}
