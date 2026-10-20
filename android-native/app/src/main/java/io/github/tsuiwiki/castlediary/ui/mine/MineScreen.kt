package io.github.tsuiwiki.castlediary.ui.mine

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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

private val INK = Color(0xFF4A3520)
private val INK2 = Color(0xFF8A6D4F)
private val BRAND = Color(0xFFF0934B)
private val BG = Color(0xFFFFF9F0)
private val CARD = Color(0xFFFFFDF6)

/**
 * 我的页（M8）：孩子档案（名字/生日/称呼）、备份恢复入口、隐私说明。
 * 字段暂用本地状态承载（M9 接 DataStore 持久化 + v2 导入导出后落地）。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MineScreen(
    modifier: Modifier = Modifier,
    childName: String,
    birthday: String,
    onSaveProfile: (name: String, birthday: String) -> Unit,
    onExport: () -> Unit,
    onImport: () -> Unit,
) {
    var name by remember { mutableStateOf(childName) }
    var birth by remember { mutableStateOf(birthday) }

    Column(modifier = modifier.fillMaxSize().background(BG).padding(16.dp)) {
        Text("我的", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = INK)
        Spacer(Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CARD), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("孩子档案", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = INK)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("小名") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = birth, onValueChange = { birth = it }, label = { Text("生日（如 2025-02-04）") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = androidx.compose.foundation.layout.Arrangement.End) {
                    androidx.compose.material3.Button(onClick = { onSaveProfile(name.trim(), birth.trim()) }, colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BRAND)) { Text("保存") }
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CARD), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("备份与恢复", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = INK)
                Text("导出备份文件（含照片录音），换手机或重装后可完整恢复。", fontSize = 12.sp, color = INK2, modifier = Modifier.padding(top = 4.dp))
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)) {
                    androidx.compose.material3.Button(onClick = onExport, colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BRAND)) { Text("导出备份") }
                    androidx.compose.material3.OutlinedButton(onClick = onImport) { Text("导入备份") }
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CARD), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("隐私说明", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = INK)
                Text(
                    "所有记录只保存在这台设备里，不联网、不上传。卸载应用会同时删除本地数据，卸载或换手机前请先导出备份。",
                    fontSize = 13.sp, color = INK2, modifier = Modifier.padding(top = 4.dp), lineHeight = 20.sp,
                )
            }
        }
    }
}
