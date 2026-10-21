package io.github.tsuiwiki.castlediary.ui.diary

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.tsuiwiki.castlediary.data.CastleDatabase
import io.github.tsuiwiki.castlediary.data.DailySummary
import io.github.tsuiwiki.castlediary.data.DiaryEntry
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/** 日记/回忆共用 ViewModel：当前日期、当天时间线、每日状态、全部记录（回忆分组用） */
class DiaryViewModel(db: CastleDatabase, context: android.content.Context) : ViewModel() {

    private val diaryDao = db.diaryDao()
    private val summaryDao = db.dailySummaryDao()
    private val relationDao = db.relationDao()
    private val mediaDao = db.mediaDao()
    private val mediaStore = io.github.tsuiwiki.castlediary.media.MediaStore(context.applicationContext)

    private val fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val _date = MutableStateFlow(LocalDate.now().toString())
    val date: StateFlow<String> = _date

    @OptIn(ExperimentalCoroutinesApi::class)
    val dayEntries: StateFlow<List<DiaryEntry>> = _date
        .flatMapLatest { diaryDao.observeDay(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    @OptIn(ExperimentalCoroutinesApi::class)
    val daySummary: StateFlow<DailySummary?> = _date
        .flatMapLatest { summaryDao.observe(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    /** 回忆页：全部记录（按月分组在 UI 层做） */
    val allEntries: StateFlow<List<DiaryEntry>> =
        diaryDao.observeAll()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setDate(d: String) { _date.value = d }
    fun shiftDay(n: Int) {
        _date.value = LocalDate.parse(_date.value, fmt).plusDays(n.toLong()).toString()
    }
    fun goToday() { _date.value = LocalDate.now().toString() }

    /** 保存一条日记记录（写一页 or 贴纸），返回新 id */
    fun saveEntry(
        date: String,
        text: String,
        entryKind: String,
        title: String = "",
        payload: String = "",
        by: String = "",
    ) {
        viewModelScope.launch {
            val id = java.util.UUID.randomUUID().toString()
            val now = now()
            diaryDao.upsert(
                DiaryEntry(
                    id = id,
                    date = date,
                    happenedAt = now,
                    title = title,
                    text = text,
                    by = by,
                    entryKind = entryKind,
                    payload = payload,
                    createdAt = now,
                    updatedAt = now,
                )
            )
        }
    }

    /** 保存一篇日记（正文 + 记录块合并，payload 存块数组） */
    fun savePage(date: String, title: String, text: String, blocks: List<io.github.tsuiwiki.castlediary.data.RecordBlock>) {
        viewModelScope.launch {
            val id = java.util.UUID.randomUUID().toString()
            val now = now()
            diaryDao.upsert(
                DiaryEntry(
                    id = id,
                    date = date,
                    happenedAt = now,
                    title = title,
                    text = text,
                    by = "",
                    entryKind = "free",
                    payload = io.github.tsuiwiki.castlediary.data.blocksToPayload(blocks),
                    createdAt = now,
                    updatedAt = now,
                )
            )
        }
    }

    fun deleteEntry(id: String) {
        viewModelScope.launch {
            diaryDao.byId(id)?.let { diaryDao.delete(it) }
        }
    }

    /** 某条 diary entry 关联的媒体文件（拍立得渲染用），按 sortOrder 排序 */
    suspend fun photosForEntry(entryId: String): List<java.io.File> {
        val relations = relationDao.byDiaryId(entryId)
        return relations.sortedBy { it.sortOrder }.mapNotNull { rel ->
            mediaDao.byId(rel.mediaId)?.let { mediaStore.resolve(it.relativePath) }
        }.filter { it.exists() }
    }

    /** 照片记录：建一条 photo 条目并返回 id（调用方再建媒体关系） */
    suspend fun savePhotoEntry(date: String, mediaId: String, happenedAt: String): String {
        val id = java.util.UUID.randomUUID().toString()
        diaryDao.upsert(
            DiaryEntry(
                id = id,
                date = date,
                happenedAt = happenedAt,
                title = "",
                text = "记了一张照片",
                by = "",
                entryKind = "photo",
                payload = "{\"mediaId\":\"$mediaId\"}",
                createdAt = happenedAt,
                updatedAt = happenedAt,
            )
        )
        return id
    }

    /** 保存每日心情（其余字段保留原值） */
    fun saveMood(mood: String) {
        viewModelScope.launch {
            val existing = summaryDao.byDate(_date.value)
            summaryDao.upsert(
                DailySummary(
                    date = _date.value,
                    mood = mood,
                    energyState = existing?.energyState ?: "",
                    note = existing?.note ?: "",
                    createdAt = existing?.createdAt ?: now(),
                    updatedAt = now(),
                )
            )
        }
    }

    private fun now(): String =
        LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
}
