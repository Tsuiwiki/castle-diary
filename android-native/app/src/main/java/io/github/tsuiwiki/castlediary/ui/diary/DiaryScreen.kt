package io.github.tsuiwiki.castlediary.ui.diary

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

private val INK = Color(0xFF4A3520)
private val INK2 = Color(0xFF8A6D4F)
private val BRAND = Color(0xFFF0934B)
private val BG = Color(0xFFFFF9F0)
private val CARD = Color(0xFFFFFDF6)

/** 日记首页：日期头 + 写一页 + 快捷记录 + 当天时间线（MVP M4） */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiaryScreen(
    onWrite: () -> Unit,
    onQuickRecord: (String) -> Unit,
    vm: DiaryViewModel = viewModel(factory = DiaryViewModelFactory),
) {
    val date by vm.date.collectAsState()
    val entries by vm.dayEntries.collectAsState()
    val summary by vm.daySummary.collectAsState()

    Column(modifier = Modifier.fillMaxSize().background(BG)) {
        DateHeader(date = date, summaryMood = summary?.mood ?: "", onPrev = { vm.shiftDay(-1) }, onNext = { vm.shiftDay(1) }, onToday = { vm.goToday() }, onMood = { vm.saveMood(it) })

        LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            item {
                Spacer(Modifier.height(8.dp))
                Text("今天发生了什么？", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = INK)
                Text("写下今天的故事，或者先记下一件小事。", fontSize = 13.sp, color = INK2, modifier = Modifier.padding(top = 4.dp))
                Spacer(Modifier.height(12.dp))

                Card(onClick = onWrite, colors = CardDefaults.cardColors(containerColor = BRAND), modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        Text("＋", fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(8.dp))
                        Text("写一页", fontSize = 17.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(16.dp))

                Text("快速记一件事", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = INK)
                Spacer(Modifier.height(8.dp))
                QuickRecordGrid(onQuickRecord = onQuickRecord)
                Spacer(Modifier.height(20.dp))

                Text("今天记下的事情", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = INK)
                Spacer(Modifier.height(8.dp))
            }

            if (entries.isEmpty()) {
                item { Text("还没有记录，写一页或点上面的贴纸开始。", fontSize = 13.sp, color = INK2, modifier = Modifier.padding(vertical = 20.dp)) }
            } else {
                items(entries, key = { it.id }) { e ->
                    EntryRow(e)
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun DateHeader(date: String, summaryMood: String, onPrev: () -> Unit, onNext: () -> Unit, onToday: () -> Unit, onMood: (String) -> Unit) {
    val d = LocalDate.parse(date)
    val today = LocalDate.now()
    val isToday = d == today
    val weekday = arrayOf("周一", "周二", "周三", "周四", "周五", "周六", "周日")[d.dayOfWeek.value - 1]

    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onPrev) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "前一天", tint = INK) }
        Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("${d.monthValue} 月 ${d.dayOfMonth} 日 · $weekday${if (isToday) " · 今天" else ""}", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = INK)
            if (!isToday) Text("回到今天", fontSize = 11.sp, color = BRAND, modifier = Modifier.padding(top = 2.dp).let { it }, fontWeight = FontWeight.Bold)
        }
        IconButton(onClick = onNext) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "后一天", tint = INK) }
    }

    // 她今天（可选状态）
    val moods = listOf("开心", "好奇", "黏人", "闹脾气", "犯困")
    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("她今天", fontSize = 13.sp, color = INK2, modifier = Modifier.align(Alignment.CenterVertically))
        moods.forEach { m ->
            val on = m == summaryMood
            Text(
                m,
                fontSize = 13.sp,
                fontWeight = if (on) FontWeight.Bold else FontWeight.Normal,
                color = if (on) Color.White else INK2,
                modifier = Modifier.background(if (on) BRAND else Color.Transparent, MaterialTheme.shapes.small).padding(horizontal = 10.dp, vertical = 5.dp),
            )
        }
    }
}

@Composable
private fun QuickRecordGrid(onQuickRecord: (String) -> Unit) {
    val items = listOf(
        "吃了" to "🍚", "读了" to "📖", "她说" to "💬", "玩了" to "🧸", "去了" to "🌳", "照片" to "📷",
    )
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { (label, emoji) ->
                    Card(onClick = { onQuickRecord(label) }, colors = CardDefaults.cardColors(containerColor = CARD), modifier = Modifier.weight(1f)) {
                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(emoji, fontSize = 24.sp)
                            Spacer(Modifier.height(4.dp))
                            Text(label, fontSize = 14.sp, color = INK)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EntryRow(e: io.github.tsuiwiki.castlediary.data.DiaryEntry) {
    Card(colors = CardDefaults.cardColors(containerColor = CARD), modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(e.happenedAt?.takeLast(5) ?: "", fontSize = 12.sp, color = INK2, modifier = Modifier.width(44.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(e.title?.takeIf { it.isNotBlank() } ?: e.text.take(40), fontSize = 15.sp, color = INK)
                if (e.title?.isNotBlank() == true && e.text.isNotBlank()) Text(e.text.take(60), fontSize = 13.sp, color = INK2, maxLines = 2)
            }
            Text(kindLabel(e.entryKind), fontSize = 12.sp, color = BRAND, fontWeight = FontWeight.Bold)
        }
    }
}

private fun kindLabel(kind: String): String = when (kind) {
    "meal" -> "吃了"
    "read" -> "读了"
    "say" -> "她说"
    "play" -> "玩了"
    "trip" -> "去了"
    "photo" -> "照片"
    else -> "日记"
}
