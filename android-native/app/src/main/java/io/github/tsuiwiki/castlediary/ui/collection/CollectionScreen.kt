package io.github.tsuiwiki.castlediary.ui.collection

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.github.tsuiwiki.castlediary.data.DiaryEntry
import io.github.tsuiwiki.castlediary.data.RecordBlock
import io.github.tsuiwiki.castlediary.data.kindToType
import io.github.tsuiwiki.castlediary.data.payloadToBlocks
import io.github.tsuiwiki.castlediary.data.typeLabel
import io.github.tsuiwiki.castlediary.ui.diary.DiaryViewModel
import io.github.tsuiwiki.castlediary.ui.diary.DiaryViewModelFactory
import io.github.tsuiwiki.castlediary.ui.theme.CastleColors
import io.github.tsuiwiki.castlediary.ui.theme.StickerPalette

// 颜色统一来自 ui.theme.CastleColors（视觉重构 P0），不再本地重复定义
private val INK = CastleColors.Ink
private val INK2 = CastleColors.Ink2
private val BRAND = CastleColors.Brand
private val BG = CastleColors.Bg
private val CARD = CastleColors.CardSolid

/**
 * 分册视图（P1）：按 type 从日记的 payload 记录块 + entryKind 提取归档。
 * type: food/reading/speech/play。
 * 一条原始记录可同时出现在多个分册（同一数据，不复制）。
 */
@Composable
fun CollectionScreen(
    type: String,
    modifier: Modifier = Modifier,
    onOpenDay: (String) -> Unit,
    vm: DiaryViewModel = viewModel(factory = DiaryViewModelFactory),
) {
    val all by vm.allEntries.collectAsState()
    val label = typeLabel(type)

    // 提取该类型的所有记录块（含旧版 entryKind 独立记录）
    val items = all.flatMap { e ->
        val blocks = payloadToBlocks(e.payload).filter { it.type == type }
        if (blocks.isNotEmpty()) {
            blocks.map { b -> Triple(e, b, e.date) }
        } else if (kindToType(e.entryKind) == type) {
            listOf(Triple(e, RecordBlock(type, "", label, e.text, ""), e.date))
        } else emptyList()
    }.sortedByDescending { it.third }

    Column(modifier = modifier.fillMaxSize().background(BG).padding(16.dp)) {
        Text(label + "册", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = INK)
        Text("这里自动收集日记里「$label」的记录，点一条回到那天。", fontSize = 13.sp, color = INK2, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(12.dp))

        if (items.isEmpty()) {
            Text("还没有「$label」记录。写日记时点「$label」加一条，就会自动收进这里。", fontSize = 13.sp, color = INK2, modifier = Modifier.padding(vertical = 20.dp))
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(items, key = { it.third + it.second.title + it.second.content.take(8) }) { (entry, block, date) ->
                    ItemRow(entry, block, date, onOpenDay)
                }
            }
        }
    }
}

@Composable
private fun ItemRow(entry: DiaryEntry, block: RecordBlock, date: String, onOpenDay: (String) -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = CARD),
        onClick = { onOpenDay(date) },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("【${block.title.ifBlank { typeLabel(block.type) }}】", fontSize = 12.sp, color = StickerPalette.of(block.type).fg, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Text(date, fontSize = 11.sp, color = INK2)
            }
            if (block.content.isNotBlank()) {
                Text(block.content, fontSize = 14.sp, color = INK, modifier = Modifier.padding(top = 4.dp))
            }
            if (block.note.isNotBlank()) {
                Text(block.note, fontSize = 13.sp, color = INK2, modifier = Modifier.padding(top = 2.dp))
            }
            if (entry.text.isNotBlank() && entry.entryKind == "free") {
                Text("—— 来自日记：${entry.text.take(30)}", fontSize = 11.sp, color = INK2, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}
