package io.github.tsuiwiki.castlediary.ui.quick

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import io.github.tsuiwiki.castlediary.ui.theme.CastleColors
import io.github.tsuiwiki.castlediary.ui.theme.StickerPalette
import org.json.JSONObject

// 颜色统一来自 ui.theme.CastleColors（视觉重构 P0），不再本地重复定义
private val BRAND = CastleColors.Brand
private val CARD = CastleColors.CardSolid
private val INK = CastleColors.Ink
private val INK2 = CastleColors.Ink2

data class QuickSave(val kind: String, val content: String, val note: String, val payload: String)

/**
 * 快捷记录面板（M6 v2）：每类专用表单，对齐网页版交互。
 * - 吃了：餐次 chips（早餐/午餐/晚餐/加餐）+ 食物 + 备注
 * - 读了：绘本名 + 备注
 * - 她说：原话 + 场景备注
 * - 玩了：游戏 + 备注
 * - 去了：地点 + 活动备注
 * 保存回调 QuickSave(kind, 主文本, 备注, payload JSON)。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickRecordPanel(
    modifier: Modifier = Modifier,
    kind: String,
    onCancel: () -> Unit,
    onSave: (QuickSave) -> Unit,
) {
    var content by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var meal by remember { mutableStateOf("午餐") }

    val t = when (kind) {
        "meal" -> Titles("吃了什么", "食物", "如：白灼虾、蒸蛋（多个用顿号隔开）", "先选餐次，再写吃了什么")
        "read" -> Titles("读了什么", "绘本名", "如：好饿的毛毛虫", "写完自动收进阅读记录")
        "say" -> Titles("她说了什么", "原话", "如：妈妈抱抱", "越原汁原味越珍贵")
        "play" -> Titles("玩了什么", "游戏", "如：躲猫猫、搭积木", "")
        "trip" -> Titles("去了哪里", "地点", "如：小区公园、外婆家", "")
        else -> Titles("记录", "内容", "", "")
    }

    Card(colors = CardDefaults.cardColors(containerColor = CARD), modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(t.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = INK)
            if (t.hint.isNotBlank()) Text(t.hint, fontSize = 12.sp, color = INK2, modifier = Modifier.padding(top = 2.dp))
            Spacer(Modifier.height(12.dp))

            // 吃了：餐次选择 chips
            if (kind == "meal") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("早餐", "午餐", "晚餐", "加餐").forEach { m ->
                        FilterChip(
                            selected = meal == m,
                            onClick = { meal = m },
                            label = { Text(m, fontSize = 13.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = StickerPalette.Food.bg,
                                selectedLabelColor = StickerPalette.Food.fg,
                            ),
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
            }

            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                label = { Text(t.contentLabel) },
                placeholder = { Text(t.contentPlaceholder, fontSize = 13.sp) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text(when (kind) {
                    "say" -> "当时的场景（可选）"
                    "trip" -> "做了什么（可选）"
                    else -> "备注（可选）"
                }) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Button(onClick = onCancel, colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = INK2)) { Text("取消") }
                Spacer(Modifier.padding(horizontal = 4.dp))
                Button(
                    onClick = {
                        val payload = if (kind == "meal") JSONObject().put("meal", meal).toString() else "{}"
                        val text = if (kind == "meal") "${meal}吃了$content" else content
                        onSave(QuickSave(kind, text, note.trim(), payload))
                    },
                    enabled = content.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = BRAND),
                ) { Text("保存") }
            }
        }
    }
}

private data class Titles(val title: String, val contentLabel: String, val contentPlaceholder: String, val hint: String)
