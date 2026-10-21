package io.github.tsuiwiki.castlediary.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * 贴纸胶囊（视觉重构 P0，对应网页版 DiaryView.vue:1246-1262 的 .sticker 样式，
 * 色值来自 StickerPalette，按 7 种记录类型区分浅底深字配色）。
 *
 * 可点击版本，用于「快速记一件事」网格、餐次子选项等交互入口。
 * 最小高度 48dp 满足 Android 触控规范（网页版原始高度明显小于此，这是移动端主动放大触控区）。
 *
 * 角标说明：P0 不照搬网页版的键盘序号角标（对触屏用户无实际意义），
 * 胶囊本身的 emoji + 文字已足够区分类型；如需「当天已记录条数」角标，
 * 属于 P1 可选增强（需要 ViewModel 暴露派生计数，本次不做）。
 */
@Composable
fun StickerChip(
    emoji: String,
    label: String,
    color: StickerColor,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    Row(
        modifier = modifier
            .sizeIn(minHeight = 48.dp)
            .clip(ChipShape)
            .background(color.bg)
            .then(
                if (selected) Modifier.border(1.5.dp, color.fg, ChipShape) else Modifier
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (emoji.isNotEmpty()) {
            androidx.compose.material3.Text(emoji, fontSize = 16.sp)
            Spacer(Modifier.width(6.dp))
        }
        androidx.compose.material3.Text(label, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = color.fg)
    }
}

/**
 * 贴纸胶囊的静态展示版本（不可点击），用于日记时间线上「已记录」的类型标签
 * （DiaryScreen EntryRow / WritePageScreen RecordBlockCard 标题）。
 */
@Composable
fun StickerLabel(text: String, color: StickerColor, modifier: Modifier = Modifier) {
    androidx.compose.material3.Text(
        text,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = color.fg,
        modifier = modifier
            .clip(ChipShape)
            .background(color.bg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}
