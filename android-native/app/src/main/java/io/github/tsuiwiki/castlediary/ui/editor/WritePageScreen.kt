package io.github.tsuiwiki.castlediary.ui.editor

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val BRAND = Color(0xFFF0934B)
private val INK = Color(0xFF4A3520)
private val INK2 = Color(0xFF8A6D4F)
private val BG = Color(0xFFFFF9F0)

/**
 * 写一页编辑器（M5）：标题可选 + 多段正文。
 * 草稿/正式保存状态由调用方处理；这里只负责输入与"保存这一页"回调。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WritePageScreen(
    initialTitle: String = "",
    initialText: String = "",
    onBack: () -> Unit,
    onSave: (title: String, text: String) -> Unit,
) {
    var title by remember { mutableStateOf(initialTitle) }
    var text by remember { mutableStateOf(initialText) }

    Scaffold(
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
        Column(modifier = Modifier.fillMaxSize().padding(inner).padding(16.dp)) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("标题（可选）") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = { Text("写下今天的故事……", fontSize = 15.sp) },
                modifier = Modifier.fillMaxWidth().weight(1f),
            )
            Spacer(Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = { onSave(title.trim(), text) },
                    enabled = text.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = BRAND),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("保存这一页", fontSize = 16.sp) }
            }
            Spacer(Modifier.height(8.dp))
            Text("保存前都会先收好草稿，写到一半也不怕丢。", fontSize = 12.sp, color = INK2, modifier = Modifier.padding(bottom = 4.dp))
        }
    }
}
