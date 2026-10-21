package io.github.tsuiwiki.castlediary

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import io.github.tsuiwiki.castlediary.ui.diary.DiaryScreen
import io.github.tsuiwiki.castlediary.ui.diary.DiaryViewModel
import io.github.tsuiwiki.castlediary.ui.diary.DiaryViewModelFactory
import io.github.tsuiwiki.castlediary.ui.editor.WritePageScreen
import io.github.tsuiwiki.castlediary.ui.memory.MemoryScreen
import io.github.tsuiwiki.castlediary.ui.mine.MineScreen
import io.github.tsuiwiki.castlediary.ui.mine.MineViewModel
import io.github.tsuiwiki.castlediary.ui.mine.MineViewModelFactory
import io.github.tsuiwiki.castlediary.ui.quick.QuickRecordPanel
import io.github.tsuiwiki.castlediary.ui.theme.CastleColors
import io.github.tsuiwiki.castlediary.ui.theme.CastleDiaryTheme

/**
 * 城堡日记 Android 原生版 · MVP
 * 底部三栏：日记 / 回忆 / 我的；日记内可进入写一页、快捷记录。
 * 我的页接 v2 导出（SAF 创建文件）/ 导入（SAF 打开文件）。
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { CastleDiaryTheme { CastleApp() } }
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    DIARY("日记", Icons.Filled.Book),
    MEMORY("回忆", Icons.Filled.Photo),
    COLLECTIONS("分册", Icons.Filled.GridView),
    MINE("我的", Icons.Filled.Person),
}

// 分册子页（饮食/书房/语言/游戏）
private val collectionTabs = listOf(
    "food" to "饮食",
    "reading" to "书房",
    "speech" to "语言",
    "play" to "游戏",
)

private sealed interface Overlay {
    data object None : Overlay
    data object Write : Overlay
    data class Quick(val kind: String) : Overlay
}

@Composable
private fun CastleApp(
    vm: DiaryViewModel = viewModel(factory = DiaryViewModelFactory),
    mineVm: MineViewModel = viewModel(factory = MineViewModelFactory),
) {
    var tab by rememberSaveable { mutableStateOf(Tab.DIARY) }
    var collectionSub by rememberSaveable { mutableStateOf("food") }
    var overlay by remember { mutableStateOf<Overlay>(Overlay.None) }
    val currentDate by vm.date.collectAsState()
    val exportMsg by mineVm.exportResult.collectAsState()
    val importMsg by mineVm.importReport.collectAsState()
    val context = LocalContext.current

    // 导出：SAF 创建文件，写 v2 JSON
    var pendingExport by remember { mutableStateOf<String?>(null) }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val json = pendingExport
        if (uri != null && json != null) {
            runCatching {
                context.contentResolver.openOutputStream(uri)?.use { it.write(json.toByteArray(Charsets.UTF_8)) }
            }
        }
        pendingExport = null
    }

    // 导入：SAF 打开文件，读文本
    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            val text = runCatching {
                context.contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) }
            }.getOrNull()
            if (text != null) mineVm.import(text) { }
        }
    }

    // 照片贴纸：Photo Picker → 存媒体 → 建一条 photo 记录
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val photoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@launch
                    val id = java.util.UUID.randomUUID().toString()
                    val stored = io.github.tsuiwiki.castlediary.media.MediaStore(context).save(id, io.github.tsuiwiki.castlediary.media.MediaStore.Kind.IMAGE, bytes, "image/jpeg")
                    val now = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                    io.github.tsuiwiki.castlediary.data.CastleDatabase.get(context).mediaDao().upsert(
                        io.github.tsuiwiki.castlediary.data.MediaAsset(id, "image", stored.relativePath, "image/jpeg", stored.sizeBytes, stored.sha256, now)
                    )
                    io.github.tsuiwiki.castlediary.data.CastleDatabase.get(context).relationDao().upsert(
                        io.github.tsuiwiki.castlediary.data.DiaryMediaRelation(vm.savePhotoEntry(currentDate, id, now), id, 0)
                    )
                }
            }
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = CastleColors.CardSolid) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t; overlay = Overlay.None },
                        icon = { Icon(t.icon, contentDescription = t.label) },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CastleColors.Brand,
                            selectedTextColor = CastleColors.Brand,
                            indicatorColor = CastleColors.BrandSoft,
                            unselectedIconColor = CastleColors.Ink2,
                            unselectedTextColor = CastleColors.Ink2,
                        ),
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
                    vm = vm,
                    onWrite = { overlay = Overlay.Write },
                    onQuickRecord = { kind -> overlay = Overlay.Quick(kind) },
                )
                Tab.MEMORY -> MemoryScreen(modifier = contentModifier, vm = vm, onOpenDay = { date -> tab = Tab.DIARY })
                Tab.COLLECTIONS -> {
                    Column(modifier = contentModifier) {
                        // 子 tab
                        androidx.compose.foundation.layout.Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 0.dp),
                        ) {
                            collectionTabs.forEach { (key, label) ->
                                androidx.compose.material3.FilterChip(
                                    selected = collectionSub == key,
                                    onClick = { collectionSub = key },
                                    label = { Text(label, fontSize = 13.sp) },
                                )
                            }
                        }
                        io.github.tsuiwiki.castlediary.ui.collection.CollectionScreen(
                            type = collectionSub,
                            onOpenDay = { date -> tab = Tab.DIARY },
                        )
                    }
                }
                Tab.MINE -> MineScreen(
                    modifier = contentModifier,
                    exportMsg = exportMsg,
                    importMsg = importMsg,
                    onExport = {
                        mineVm.export { json ->
                            pendingExport = json
                            exportLauncher.launch("城堡日记备份-${java.time.LocalDate.now()}.json")
                        }
                    },
                    onImport = { importLauncher.launch(arrayOf("application/json", "text/*")) },
                )
            }
            Overlay.Write -> WritePageScreen(
                modifier = contentModifier,
                onBack = { overlay = Overlay.None },
                onSave = { result ->
                    vm.savePage(currentDate, result.title, result.text, result.blocks)
                    overlay = Overlay.None
                },
            )
            is Overlay.Quick -> {
                if (o.kind == "photo") {
                    // 照片：直接拉起 Photo Picker（不显示表单）
                    androidx.compose.runtime.LaunchedEffect(Unit) {
                        photoLauncher.launch(androidx.activity.result.PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        overlay = Overlay.None
                    }
                } else {
                    QuickRecordPanel(
                        modifier = contentModifier,
                        kind = o.kind,
                        onCancel = { overlay = Overlay.None },
                        onSave = { q ->
                            val text = if (q.note.isBlank()) q.content else "${q.content}，${q.note}"
                            vm.saveEntry(currentDate, text, q.kind, payload = q.payload)
                            overlay = Overlay.None
                        },
                    )
                }
            }
        }
    }
}
