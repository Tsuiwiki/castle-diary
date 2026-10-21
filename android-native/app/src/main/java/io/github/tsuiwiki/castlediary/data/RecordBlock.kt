package io.github.tsuiwiki.castlediary.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * 日记内的结构化记录块（需求 4.3/5.2）。
 * 一篇日记可含多个块，序列化进 DiaryEntry.payload（JSON 数组）。
 * type = food/reading/speech/play/outing/photo/observation
 * subtype = breakfast/lunch/dinner/snack/water（food）；parent/self/repeat/newword（reading）等
 */
data class RecordBlock(
    val type: String,
    val subtype: String,
    val title: String,      // 展示标题，如「饮食 · 午餐」
    val content: String,    // 主内容（吃了什么/原话/绘本名…）
    val note: String,       // 补充说明/场景
)

fun blocksToPayload(blocks: List<RecordBlock>): String {
    val arr = JSONArray()
    blocks.forEach { b ->
        arr.put(JSONObject().apply {
            put("type", b.type)
            put("subtype", b.subtype)
            put("title", b.title)
            put("content", b.content)
            put("note", b.note)
        })
    }
    return arr.toString()
}

fun payloadToBlocks(payload: String): List<RecordBlock> {
    if (payload.isBlank()) return emptyList()
    return try {
        val arr = JSONArray(payload)
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            RecordBlock(
                type = o.optString("type"),
                subtype = o.optString("subtype"),
                title = o.optString("title"),
                content = o.optString("content"),
                note = o.optString("note"),
            )
        }
    } catch (e: Exception) { emptyList() }
}

/** type → 中文标签（分册归档与显示用） */
fun typeLabel(type: String): String = when (type) {
    "food" -> "吃了"
    "reading" -> "读了"
    "speech" -> "她说"
    "play" -> "玩了"
    "outing" -> "出门"
    "photo" -> "照片"
    "observation" -> "观察"
    else -> "记录"
}

/** entryKind（旧贴纸独立记录）→ 对应 type（分册统一提取口径） */
fun kindToType(kind: String): String = when (kind) {
    "meal" -> "food"
    "read" -> "reading"
    "say" -> "speech"
    "play" -> "play"
    "trip" -> "outing"
    "photo" -> "photo"
    else -> "observation"
}
