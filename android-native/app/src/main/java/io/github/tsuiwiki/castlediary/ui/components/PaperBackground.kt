package io.github.tsuiwiki.castlediary.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.github.tsuiwiki.castlediary.ui.theme.CastleColors
import io.github.tsuiwiki.castlediary.ui.theme.PaperShape

/**
 * 纸张质感背景（视觉重构 P1-B，对应网页版 DiaryView.vue 的 .paper 样式）。
 *
 * 效果：暖米黄纸色底 + 每 34dp 一条浅褐横线（作业本横线纹）+ 左侧 2dp 虚线装订边。
 * 用 drawBehind 实现（不额外叠一层布局节点），Brush 用 remember 缓存避免重组重算。
 *
 * 适用场景：日记正文/书写编辑区这种「写日记纸」的强隐喻场景；
 * 列表型页面（回忆/分册/我的）不套用，避免滚动场景视觉噪音。
 */
@Composable
fun PaperBackground(
    modifier: Modifier = Modifier,
    lineSpacing: Dp = 34.dp,
    bindingX: Dp = 20.dp,
    lineColor: Color = CastleColors.PaperLine,
    bindingColor: Color = CastleColors.PaperBinding,
    content: @Composable BoxScope.() -> Unit,
) {
    // 用 remember 缓存绘制 lambda，避免重组/滚动时重复重建 lambda 对象
    val drawHandler: androidx.compose.ui.graphics.drawscope.DrawScope.() -> Unit = remember(lineSpacing, bindingX, lineColor, bindingColor) {
        {
            val spacingPx = lineSpacing.toPx()
            val strokeWidth = 1.dp.toPx()
            // 从顶部 lineSpacing 开始，每隔 lineSpacing 画一条 1dp 浅褐横线
            var y = spacingPx
            while (y < size.height) {
                drawLine(
                    color = lineColor,
                    start = Offset(0f, y),
                    end = Offset(size.width, y),
                    strokeWidth = strokeWidth,
                )
                y += spacingPx
            }
            // 左侧虚线装订边（对应网页版 .paper::before）
            val bindingXPx = bindingX.toPx()
            val dashOn = 4.dp.toPx()
            val dashOff = 3.dp.toPx()
            var by = 0f
            while (by < size.height) {
                val seg = minOf(dashOn, size.height - by)
                drawLine(
                    color = bindingColor,
                    start = Offset(bindingXPx, by),
                    end = Offset(bindingXPx, by + seg),
                    strokeWidth = 2.dp.toPx(),
                )
                by += dashOn + dashOff
            }
        }
    }
    Box(
        modifier = modifier
            .shadow(3.dp, PaperShape)
            .clip(PaperShape)
            .background(CastleColors.PaperColor)
            .border(1.dp, CastleColors.PaperBorder, PaperShape)
            .drawBehind(drawHandler),
    ) {
        content()
    }
}
