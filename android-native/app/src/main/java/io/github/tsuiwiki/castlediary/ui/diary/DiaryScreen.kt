package io.github.tsuiwiki.castlediary.ui.diary

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.github.tsuiwiki.castlediary.data.ageText
import io.github.tsuiwiki.castlediary.ui.theme.CastleColors
import io.github.tsuiwiki.castlediary.ui.theme.StickerPalette
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

// 颜色统一来自 ui.theme.CastleColors（视觉重构 P0），不再本地重复定义
private val INK = CastleColors.Ink
private val INK2 = CastleColors.Ink2
private val BRAND = CastleColors.Brand
private val BG = CastleColors.Bg
private val CARD = CastleColors.CardSolid

/** 日记首页：日期头 + 写一页 + 快捷记录 + 当天时间线（MVP M4） */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiaryScreen(
    modifier: Modifier = Modifier,
    onWrite: () -> Unit,
    onQuickRecord: (String) -> Unit,
    vm: DiaryViewModel = viewModel(factory = DiaryViewModelFactory),
    profileVm: io.github.tsuiwiki.castlediary.data.ProfileViewModel = viewModel(factory = io.github.tsuiwiki.castlediary.data.ProfileViewModelFactory),
) {
    val date by vm.date.collectAsState()
    val entries by vm.dayEntries.collectAsState()
    val summary by vm.daySummary.collectAsState()
    val profile by profileVm.profile.collectAsState()

    Column(modifier = modifier.fillMaxSize().background(BG)) {
        DateHeader(date = date, childName = profile.childName, birthday = profile.birthday, summaryMood = summary?.mood ?: "", onPrev = { vm.shiftDay(-1) }, onNext = { vm.shiftDay(1) }, onToday = { vm.goToday() }, onMood = { vm.saveMood(it) })

        // 首次引导：没填过档案时提示
        if (!profile.onboarded) {
            Card(
                onClick = { /* MVP：引导去「我的」页填档案（底部导航切换由外层处理，暂提示） */ profileVm.markOnboarded() },
                colors = CardDefaults.cardColors(containerColor = CastleColors.HighlightBg),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("👋 欢迎来到城堡日记", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = INK)
                    Text("到「我的」页填上小名和生日，日记里就会显示孩子的名字和月龄。", fontSize = 12.sp, color = INK2, modifier = Modifier.padding(top = 2.dp))
                }
            }
        }

        LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            item {
                Spacer(Modifier.height(8.dp))
                Text("今天发生了什么？", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = INK)
                Text("写下今天的故事，或者先记下一件小事。", fontSize = 13.sp, color = INK2, modifier = Modifier.padding(top = 4.dp))
                Spacer(Modifier.height(12.dp))

                Card(onClick = onWrite, colors = CardDefaults.cardColors(containerColor = BRAND), modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 13.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        Text("＋", fontSize = 18.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(6.dp))
                        Text("写一页", fontSize = 15.sp, color = Color.White, fontWeight = FontWeight.Bold)
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
                    EntryRow(e, vm)
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DateHeader(date: String, childName: String, birthday: String, summaryMood: String, onPrev: () -> Unit, onNext: () -> Unit, onToday: () -> Unit, onMood: (String) -> Unit) {
    val d = LocalDate.parse(date)
    val today = LocalDate.now()
    val isToday = d == today
    val weekday = arrayOf("周一", "周二", "周三", "周四", "周五", "周六", "周日")[d.dayOfWeek.value - 1]
    val name = childName.ifBlank { "宝宝" }
    val age = ageText(birthday, date)

    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onPrev) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "前一天", tint = INK) }
        Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "${d.monthValue} 月 ${d.dayOfMonth} 日 · $weekday${if (isToday) " · 今天" else ""}",
                fontSize = 17.sp,
                fontFamily = io.github.tsuiwiki.castlediary.ui.theme.KaitiDateFontFamily,
                fontWeight = FontWeight.Bold,
                color = INK,
                maxLines = 1,
                softWrap = false,
            )
            if (age.isNotBlank()) Text("$name · $age", fontSize = 12.sp, color = INK2, modifier = Modifier.padding(top = 2.dp))
        }
        IconButton(onClick = onNext) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "后一天", tint = INK) }
    }

    // 她今天（可选状态）：FlowRow 防止小屏换行挤出
    val moods = listOf("开心", "好奇", "黏人", "闹脾气", "犯困")
    FlowRow(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text("她今天", fontSize = 13.sp, color = INK2, modifier = Modifier.align(Alignment.CenterVertically))
        moods.forEach { m ->
            val on = m == summaryMood
            Text(
                m,
                fontSize = 12.sp,
                fontWeight = if (on) FontWeight.Bold else FontWeight.Normal,
                color = if (on) Color.White else INK2,
                modifier = Modifier
                    .clip(MaterialTheme.shapes.small)
                    .clickable { onMood(if (on) "" else m) }
                    .background(if (on) BRAND else Color.Transparent, MaterialTheme.shapes.small)
                    .padding(horizontal = 9.dp, vertical = 6.dp),
            )
        }
    }
}

private data class QuickItem(val kind: String, val label: String, val emoji: String, val type: String)

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuickRecordGrid(onQuickRecord: (String) -> Unit) {
    // kind 与 entryKind 一致，type 用于取 7 色贴纸配色（StickerPalette）
    val items = listOf(
        QuickItem("meal", "吃了", "🍚", "food"),
        QuickItem("read", "读了", "📖", "reading"),
        QuickItem("say", "她说", "💬", "speech"),
        QuickItem("play", "玩了", "🧸", "play"),
        QuickItem("trip", "去了", "🌳", "outing"),
        QuickItem("photo", "照片", "📷", "photo"),
    )
    // 胶囊流式布局（对齐网页版贴纸栏的横向气质），自动换行，不再是 3x2 网格方块
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { item ->
            io.github.tsuiwiki.castlediary.ui.theme.StickerChip(
                emoji = item.emoji,
                label = item.label,
                color = StickerPalette.of(item.type),
                onClick = { onQuickRecord(item.kind) },
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EntryRow(e: io.github.tsuiwiki.castlediary.data.DiaryEntry, vm: DiaryViewModel) {
    val blocks = io.github.tsuiwiki.castlediary.data.payloadToBlocks(e.payload)

    // photo 记录：加载关联媒体文件，用拍立得卡片渲染（P1-C）
    val photos by produceState<List<java.io.File>>(emptyList(), e.id) {
        value = if (e.entryKind == "photo") {
            kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { vm.photosForEntry(e.id) }
        } else emptyList()
    }

    // 「她说」录音：加载关联音频文件，可就地播放
    val audioFiles by produceState<List<java.io.File>>(emptyList(), e.id) {
        value = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { vm.audioForEntry(e.id) }
    }
    var player by remember { mutableStateOf<android.media.MediaPlayer?>(null) }
    var playingId by remember { mutableStateOf<String?>(null) }
    DisposableEffect(e.id) {
        onDispose {
            player?.release()
            player = null
        }
    }

    // 每条记录呈现为一张日记小纸片（纸张质感 P1-B）：暖纸色底+横线纹理+左侧虚线装订边
    io.github.tsuiwiki.castlediary.ui.components.PaperBackground(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        lineSpacing = 22.dp,
        bindingX = 12.dp,
    ) {
        Column(modifier = Modifier.padding(start = 22.dp, end = 12.dp, top = 12.dp, bottom = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(e.happenedAt?.takeLast(5) ?: "", fontSize = 12.sp, color = INK2, modifier = Modifier.width(44.dp))
                Text(kindLabel(e.entryKind), fontSize = 12.sp, color = BRAND, fontWeight = FontWeight.Bold)
            }
            if (e.title?.isNotBlank() == true) {
                Text(e.title!!, fontSize = 14.sp, color = INK, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
            }
            if (e.text.isNotBlank()) {
                Text(e.text, fontSize = 13.sp, color = INK, maxLines = 3, modifier = Modifier.padding(top = 2.dp))
            }
            // 拍立得照片（白相框+交替倾斜，一张时也可显示配文）
            if (photos.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(top = 10.dp),
                ) {
                    photos.forEachIndexed { idx, file ->
                        io.github.tsuiwiki.castlediary.ui.components.PolaroidPhoto(
                            file = file,
                            caption = e.text,
                            index = idx,
                            modifier = Modifier.width(150.dp),
                        )
                    }
                }
            }
            // 「她说」录音播放
            if (audioFiles.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    audioFiles.forEach { file ->
                        val playing = playingId == file.absolutePath
                        Text(
                            if (playing) "■ 停止" else "▶ 听录音",
                            fontSize = 13.sp,
                            color = StickerPalette.Speech.fg,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(MaterialTheme.shapes.small)
                                .clickable {
                                    if (playing) {
                                        player?.release()
                                        player = null
                                        playingId = null
                                    } else {
                                        player?.release()
                                        runCatching {
                                            val p = android.media.MediaPlayer()
                                            p.setDataSource(file.absolutePath)
                                            p.setOnCompletionListener { it.release(); player = null; playingId = null }
                                            p.prepare()
                                            p.start()
                                            player = p
                                            playingId = file.absolutePath
                                        }
                                    }
                                }
                                .background(StickerPalette.Speech.bg, MaterialTheme.shapes.small)
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                        )
                    }
                }
            }
            // 记录块标签：按类型应用 7 色贴纸配色（StickerPalette），不再统一橙色
            if (blocks.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                    blocks.forEach { b ->
                        io.github.tsuiwiki.castlediary.ui.theme.StickerLabel(
                            text = "【${b.title}】",
                            color = StickerPalette.of(b.type),
                        )
                    }
                }
            }
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
