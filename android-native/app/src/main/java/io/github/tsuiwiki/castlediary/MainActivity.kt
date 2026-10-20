package io.github.tsuiwiki.castlediary

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import io.github.tsuiwiki.castlediary.ui.diary.DiaryScreen
import io.github.tsuiwiki.castlediary.ui.editor.WritePageScreen
import io.github.tsuiwiki.castlediary.ui.memory.MemoryScreen
import io.github.tsuiwiki.castlediary.ui.mine.MineScreen
import io.github.tsuiwiki.castlediary.ui.quick.QuickRecordPanel

/**
 * 城堡日记 Android 原生版 · MVP
 * 底部三栏：日记 / 回忆 / 我的；日记内可进入写一页、快捷记录。
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { CastleApp() }
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    DIARY("日记", Icons.Filled.Edit),
    MEMORY("回忆", Icons.Filled.DateRange),
    MINE("我的", Icons.Filled.Person),
}

private sealed interface Overlay {
    data object None : Overlay
    data object Write : Overlay
    data class Quick(val kind: String) : Overlay
}

@Composable
private fun CastleApp() {
    var tab by rememberSaveable { mutableStateOf(Tab.DIARY) }
    var overlay by remember { mutableStateOf<Overlay>(Overlay.None) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t; overlay = Overlay.None },
                        icon = { Icon(t.icon, contentDescription = t.label) },
                        label = { Text(t.label) },
                    )
                }
            }
        },
    ) { inner ->
        val contentModifier = Modifier.padding(inner)
        when (val o = overlay) {
            Overlay.None -> when (tab) {
                Tab.DIARY -> DiaryScreen(
                    modifier = contentModifier,
                    onWrite = { overlay = Overlay.Write },
                    onQuickRecord = { kind -> overlay = Overlay.Quick(kind) },
                )
                Tab.MEMORY -> MemoryScreen(modifier = contentModifier, onOpenDay = { date -> tab = Tab.DIARY })
                Tab.MINE -> MineScreen(
                    modifier = contentModifier,
                    childName = "",
                    birthday = "",
                    onSaveProfile = { _, _ -> },
                    onExport = {},
                    onImport = {},
                )
            }
            Overlay.Write -> WritePageScreen(
                modifier = contentModifier,
                onBack = { overlay = Overlay.None },
                onSave = { _, _ -> overlay = Overlay.None },
            )
            is Overlay.Quick -> QuickRecordPanel(
                modifier = contentModifier,
                kind = o.kind,
                onCancel = { overlay = Overlay.None },
                onSave = { _, _, _ -> overlay = Overlay.None },
            )
        }
    }
}
