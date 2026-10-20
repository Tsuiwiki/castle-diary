package io.github.tsuiwiki.castlediary.ui.quick

import androidx.compose.foundation.background
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

private val BRAND = Color(0xFFF0934B)
private val CARD = Color(0xFFFFFDF6)
private val INK = Color(0xFF4A3520)
private val INK2 = Color(0xFF8A6D4F)

/**
 * 快捷记录面板（M6）：五类共用一个轻量表单。
 * kind: meal/read/say/play/trip。点保存回调 (kind, 主内容文本, 备注)。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickRecordPanel(
    kind: String,
    onCancel: () -> Unit,
    onSave: (kind: String, content: String, note: String) -> Unit,
) {
    var content by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }

    val (title, contentLabel, contentPlaceholder) = when (kind) {
        "meal" -> Triple("吃了", "食物", "如：白灼虾、蒸蛋（多个用顿号隔开）")
        "read" -> Triple("读了", "绘本", "如：好饿的毛毛虫")
        "say" -> Triple("她说", "原话", "如：妈妈抱抱")
        "play" -> Triple("玩了", "游戏", "如：躲猫猫")
        "trip" -> Triple("去了", "地点", "如：小区公园")
        else -> Triple("记录", "内容", "")
    }

    Card(colors = CardDefaults.cardColors(containerColor = CARD), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = INK)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                label = { Text(contentLabel) },
                placeholder = { Text(contentPlaceholder, fontSize = 13.sp) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("备注（可选）") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Button(onClick = onCancel, colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = INK2)) { Text("取消") }
                Spacer(Modifier.padding(horizontal = 4.dp))
                Button(
                    onClick = { onSave(kind, content.trim(), note.trim()) },
                    enabled = content.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = BRAND),
                ) { Text("保存") }
            }
        }
    }
}
