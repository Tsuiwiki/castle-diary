package io.github.tsuiwiki.castlediary

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import io.github.tsuiwiki.castlediary.ui.diary.DiaryScreen
import io.github.tsuiwiki.castlediary.ui.editor.WritePageScreen
import io.github.tsuiwiki.castlediary.ui.quick.QuickRecordPanel

/**
 * 城堡日记 Android 原生版 · MVP
 * 简单状态导航：日记首页 ↔ 写一页 ↔ 快捷记录面板。
 * （回忆/我的两页 + 底部三栏导航在 M7/M8 接入）
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { CastleApp() }
    }
}

private sealed interface Screen {
    data object Diary : Screen
    data object Write : Screen
    data class Quick(val kind: String) : Screen
}

@Composable
private fun CastleApp() {
    var screen by remember { mutableStateOf<Screen>(Screen.Diary) }

    Surface(modifier = Modifier.fillMaxSize().background(Color(0xFFFFF9F0))) {
        when (val s = screen) {
            Screen.Diary -> DiaryScreen(
                onWrite = { screen = Screen.Write },
                onQuickRecord = { kind -> screen = Screen.Quick(kind) },
            )
            Screen.Write -> WritePageScreen(
                onBack = { screen = Screen.Diary },
                onSave = { _, _ -> screen = Screen.Diary }, // 正式保存逻辑 M5 接 Repository 后补
            )
            is Screen.Quick -> QuickRecordPanel(
                kind = s.kind,
                onCancel = { screen = Screen.Diary },
                onSave = { _, _, _ -> screen = Screen.Diary }, // 正式保存逻辑 M6 接 Repository 后补
            )
        }
    }
}
