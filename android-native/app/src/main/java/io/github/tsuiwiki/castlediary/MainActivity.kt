package io.github.tsuiwiki.castlediary

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import io.github.tsuiwiki.castlediary.ui.diary.DiaryScreen

/**
 * 城堡日记 Android 原生版 · MVP
 * 当前挂载日记首页；后续在此加底部三页导航：日记 / 回忆 / 我的
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DiaryScreen(
                onWrite = { /* M5 接入写一页编辑器 */ },
                onQuickRecord = { /* M6 接入贴纸面板 */ },
            )
        }
    }
}
