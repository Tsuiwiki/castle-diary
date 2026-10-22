package io.github.tsuiwiki.castlediary.ui.mine

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.tsuiwiki.castlediary.data.CastleDatabase
import io.github.tsuiwiki.castlediary.media.MediaStore
import io.github.tsuiwiki.castlediary.migration.V2Migrator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/** 我的页 ViewModel：孩子档案（暂存内存）+ v2 导出/导入 */
class MineViewModel(context: Context) : ViewModel() {

    private val migrator = V2Migrator(context, CastleDatabase.get(context), MediaStore(context), io.github.tsuiwiki.castlediary.data.ProfileStore(context))

    private val _exportResult = MutableStateFlow<String?>(null)
    val exportResult: StateFlow<String?> = _exportResult

    private val _importReport = MutableStateFlow<String?>(null)
    val importReport: StateFlow<String?> = _importReport

    /** 导出：返回 v2 JSON 文本（调用方用 SAF 写文件） */
    fun export(onReady: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val json = migrator.export()
                _exportResult.value = "导出成功"
                onReady(json)
            } catch (e: Exception) {
                _exportResult.value = "导出失败：${e.message}"
            }
        }
    }

    /** 导入：传入 v2 JSON 文本，返回报告 */
    fun import(json: String, onDone: (V2Migrator.ImportReport) -> Unit) {
        viewModelScope.launch {
            try {
                val report = migrator.import(json)
                val warn = if (report.warnings.isNotEmpty()) "；提醒 ${report.warnings.size} 条" else ""
                _importReport.value = "导入成功：日记 ${report.diariesImported} 条，照片关联 ${report.photosLinked} 个，媒体 ${report.mediaImported} 个，旧数据 ${report.legacyItems} 条$warn"
                onDone(report)
            } catch (e: Exception) {
                _importReport.value = "导入失败：${e.message}"
            }
        }
    }
}
