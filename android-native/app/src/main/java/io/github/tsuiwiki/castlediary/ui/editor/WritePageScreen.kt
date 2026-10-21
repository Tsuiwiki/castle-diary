package io.github.tsuiwiki.castlediary.ui.editor

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.tsuiwiki.castlediary.data.RecordBlock
import io.github.tsuiwiki.castlediary.data.blocksToPayload
import io.github.tsuiwiki.castlediary.data.payloadToBlocks
import io.github.tsuiwiki.castlediary.ui.theme.CastleColors
import io.github.tsuiwiki.castlediary.ui.theme.StickerPalette
import kotlinx.coroutines.delay

// 颜色统一来自 ui.theme.CastleColors（视觉重构 P0），不再本地重复定义
private val BRAND = CastleColors.Brand
private val INK = CastleColors.Ink
private val INK2 = CastleColors.Ink2
private val BG = CastleColors.Bg

/** 保存结果：正文 + 记录块（合并进一篇日记） */
data class WriteResult(val title: String, val text: String, val blocks: List<RecordBlock>)

/**
 * 书写编辑器（P0+P1）：自由正文 + 标签插入记录块 + 草稿自动保存 + 照片入口。
 * 不跳页、不弹复杂表单——标签在书写区内展开轻量选项，插入可编辑记录块。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WritePageScreen(
    modifier: Modifier = Modifier,
    initialTitle: String = "",
    initialText: String = "",
    initialBlocks: List<RecordBlock> = emptyList(),
    onBack: () -> Unit,
    onSave: (WriteResult) -> Unit,
    onDraftChanged: (title: String, text: String, blocks: List<RecordBlock>) -> Unit = { _, _, _ -> },
) {
    var title by remember { mutableStateOf(initialTitle) }
    var text by remember { mutableStateOf(initialText) }
    var blocks by remember { mutableStateOf(initialBlocks) }
    var saveState by remember { mutableStateOf("") }

    // 草稿自动保存：输入变化防抖 800ms 存一次
    LaunchedEffect(title, text, blocks) {
        saveState = "保存中…"
        delay(800)
        onDraftChanged(title, text, blocks)
        saveState = "已自动保存"
    }

    Scaffold(
        modifier = modifier,
        containerColor = BG,
        topBar = {
            TopAppBar(
                title = { Text("写一页", fontWeight = FontWeight.Bold, color = INK) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回", tint = INK) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BG),
            )
        },
    ) { inner ->
        Column(modifier = Modifier.fillMaxSize().padding(inner).verticalScroll(rememberScrollState())) {
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                // 标题（可选）
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("标题（可选）") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                Spacer(Modifier.height(12.dp))

                // 正文
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("写下今天的故事……（# 标题、**加粗**、- 列表）", fontSize = 15.sp) },
                    modifier = Modifier.fillMaxWidth().height(140.dp),
                )
                Spacer(Modifier.height(12.dp))

                // 快捷标签（插入记录块）
                Text("加一条记录", fontSize = 13.sp, color = INK2, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                TagRow { block ->
                    blocks = blocks + block
                }
                Spacer(Modifier.height(12.dp))
            }

            // 已插入的记录块
            if (blocks.isNotEmpty()) {
                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    blocks.forEachIndexed { idx, b ->
                        RecordBlockCard(
                            block = b,
                            onChange = { blocks = blocks.toMutableList().also { it[idx] = it[idx].copy(content = b.content, note = b.note) }.let { it } },
                            onDelete = { blocks = blocks.filterIndexed { i, _ -> i != idx } },
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    Text(saveState, fontSize = 12.sp, color = INK2)
                    Spacer(Modifier.weight(1f))
                }
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { onSave(WriteResult(title.trim(), text, blocks)) },
                    enabled = text.isNotBlank() || blocks.any { it.content.isNotBlank() },
                    colors = ButtonDefaults.buttonColors(containerColor = BRAND),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("保存这一页", fontSize = 16.sp) }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

/** 标签行：点了展开子选项（轻量，不跳页） */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TagRow(onInsert: (RecordBlock) -> Unit) {
    var expanded by remember { mutableStateOf<String?>(null) }
    val tags = listOf("吃了", "读了", "她说", "玩了", "出门")

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        tags.forEach { t ->
            FilterChip(
                selected = expanded == t,
                onClick = { expanded = if (expanded == t) null else t },
                label = { Text(t, fontSize = 13.sp) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = BRAND.copy(alpha = 0.18f)),
            )
        }
    }
    expanded?.let { tag ->
        Spacer(Modifier.height(6.dp))
        SubOptions(tag) { type, subtype, label ->
            onInsert(RecordBlock(type = type, subtype = subtype, title = label, content = "", note = ""))
            expanded = null
        }
    }
}

/** 子选项（subtype） */
@Composable
private fun SubOptions(tag: String, onPick: (String, String, String) -> Unit) {
    val opts: List<Pair<String, String>> = when (tag) {
        "吃了" -> listOf("breakfast" to "早餐", "lunch" to "午餐", "dinner" to "晚餐", "snack" to "加餐", "water" to "喝水")
        "读了" -> listOf("parent" to "亲子共读", "self" to "自己翻书", "repeat" to "重复阅读", "newword" to "认识新词")
        "她说" -> listOf("quote" to "有趣的原话", "newword" to "新词", "phrase" to "短句", "discovery" to "语言发现")
        "玩了" -> listOf("blocks" to "积木", "puzzle" to "拼图", "car" to "玩具车", "draw" to "绘画", "outdoor" to "户外", "free" to "自由活动")
        "出门" -> listOf("park" to "公园", "community" to "小区", "mall" to "商场", "visit" to "探亲", "other" to "其他")
        else -> emptyList()
    }
    val typeMap = mapOf("吃了" to "food", "读了" to "reading", "她说" to "speech", "玩了" to "play", "出门" to "outing")

    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        opts.forEach { (sub, label) ->
            FilterChip(
                selected = false,
                onClick = { onPick(typeMap[tag]!!, sub, "$tag · $label") },
                label = { Text(label, fontSize = 12.sp) },
            )
        }
    }
}

/** 已插入的记录块（可编辑字段 + 可删除），按 type 应用 7 色贴纸配色区分类型 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecordBlockCard(block: RecordBlock, onChange: (RecordBlock) -> Unit, onDelete: () -> Unit) {
    val palette = StickerPalette.of(block.type)
    Card(colors = CardDefaults.cardColors(containerColor = palette.bg), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Text("【${block.title}】", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = palette.fg)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onDelete) { Text("删除", fontSize = 12.sp, color = INK2) }
            }
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = block.content,
                onValueChange = { onChange(block.copy(content = it)) },
                label = { Text(contentLabel(block.type)) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = block.note,
                onValueChange = { onChange(block.copy(note = it)) },
                label = { Text(noteLabel(block.type)) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

private fun contentLabel(type: String): String = when (type) {
    "food" -> "吃了"
    "reading" -> "绘本名（可选）"
    "speech" -> "原话"
    "play" -> "玩了什么"
    "outing" -> "去了哪"
    else -> "内容"
}

private fun noteLabel(type: String): String = when (type) {
    "food" -> "补充说明"
    "reading" -> "今天的发现/新词"
    "speech" -> "当时的情景"
    "play" -> "孩子的表现/有趣瞬间"
    "outing" -> "做了什么"
    else -> "备注"
}
