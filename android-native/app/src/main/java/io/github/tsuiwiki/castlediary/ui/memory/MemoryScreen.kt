package io.github.tsuiwiki.castlediary.ui.memory

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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.github.tsuiwiki.castlediary.data.DiaryEntry
import io.github.tsuiwiki.castlediary.ui.diary.DiaryViewModelFactory

private val INK = Color(0xFF4A3520)
private val INK2 = Color(0xFF8A6D4F)
private val BRAND = Color(0xFFF0934B)
private val BG = Color(0xFFFFF9F0)
private val CARD = Color(0xFFFFFDF6)

/**
 * 回忆页（M7）：按月分组浏览历史 + 简单搜索 + 主题筛选。
 * 数据来自 DiaryViewModel（复用 observeMonth/search）。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MemoryScreen(
    modifier: Modifier = Modifier,
    onOpenDay: (String) -> Unit,
    vm: io.github.tsuiwiki.castlediary.ui.diary.DiaryViewModel = viewModel(factory = DiaryViewModelFactory),
) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("全部") }

    val all by vm.allEntries.collectAsState()

    // 搜索 + 主题筛选 + 按月分组（UI 层，MVP 简化）
    val filtered = all.filter { e ->
        (filter == "全部" || kindLabel(e.entryKind) == filter) &&
        (query.isBlank() || e.text.contains(query, true) || (e.title?.contains(query, true) == true) || e.payload.contains(query, true))
    }
    val grouped = filtered.groupBy { it.date.take(7) }.toList().sortedByDescending { it.first }

    Column(modifier = modifier.fillMaxSize().background(BG).padding(16.dp)) {
        Text("回忆", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = INK)
        Text("按日期找回过去的日子。", fontSize = 13.sp, color = INK2, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("搜索标题、正文、食物、词语…", fontSize = 13.sp) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        Spacer(Modifier.height(8.dp))

        val filters = listOf("全部", "日记", "吃了", "读了", "她说", "玩了", "去了", "照片")
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            filters.forEach { f ->
                FilterChip(
                    selected = filter == f,
                    onClick = { filter = f },
                    label = { Text(f, fontSize = 12.sp) },
                )
            }
        }
        Spacer(Modifier.height(12.dp))

        LazyColumn(modifier = Modifier.fillMaxSize()) {
            grouped.forEach { (ym, list) ->
                item {
                    Text(ymLabel(ym), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BRAND, modifier = Modifier.padding(vertical = 8.dp))
                }
                items(list, key = { it.id }) { e ->
                    EntryRow(e, onOpenDay)
                }
            }
            if (grouped.isEmpty()) {
                item { Text("还没有记录。", fontSize = 13.sp, color = INK2, modifier = Modifier.padding(vertical = 20.dp)) }
            }
        }
    }
}

@Composable
private fun EntryRow(e: DiaryEntry, onOpenDay: (String) -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = CARD),
        onClick = { onOpenDay(e.date) },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(e.title?.takeIf { it.isNotBlank() } ?: e.text.take(40), fontSize = 15.sp, color = INK)
                if (e.title?.isNotBlank() == true && e.text.isNotBlank()) Text(e.text.take(60), fontSize = 13.sp, color = INK2, maxLines = 2)
                Text(e.date, fontSize = 11.sp, color = INK2, modifier = Modifier.padding(top = 2.dp))
            }
            Text(kindLabel(e.entryKind), fontSize = 12.sp, color = BRAND, fontWeight = FontWeight.Bold)
        }
    }
}

private fun kindLabel(kind: String): String = when (kind) {
    "meal" -> "吃了", "read" -> "读了", "say" -> "她说", "play" -> "玩了", "trip" -> "去了", "photo" -> "照片", else -> "日记"
}

private fun ymLabel(ym: String): String = "${ym.take(4)} 年 ${ym.takeLast(2).toInt()} 月"
