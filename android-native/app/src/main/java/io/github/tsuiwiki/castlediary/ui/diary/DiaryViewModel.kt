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
class DiaryViewModel(db: CastleDatabase) : ViewModel() {

    private val diaryDao = db.diaryDao()
    private val summaryDao = db.dailySummaryDao()

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
