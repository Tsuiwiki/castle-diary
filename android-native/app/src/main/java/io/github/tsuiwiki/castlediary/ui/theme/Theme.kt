package io.github.tsuiwiki.castlediary.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

/**
 * 统一 Compose 主题（视觉重构 P0）。
 * 覆盖 Material3 默认 colorScheme 的关键槛位为品牌色系，
 * 这是消除 NavigationBar/各控件默认紫色主题的根本修复点。
 *
 * 注意：NavigationBarItem 的选中态默认走 secondaryContainer 槛位，
 * 与这里的 primary 不是同一槛位，仍需在 MainActivity 里显式传
 * NavigationBarItemDefaults.colors(...) 才能生效，不能只靠这里的 colorScheme。
 */
val CastleDiaryColorScheme = lightColorScheme(
    primary = CastleColors.Brand,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    secondary = CastleColors.BrandDeep,
    secondaryContainer = CastleColors.BrandSoft,
    onSecondaryContainer = CastleColors.Brand,
    surface = CastleColors.CardSolid,
    onSurface = CastleColors.Ink,
    onSurfaceVariant = CastleColors.Ink2,
    background = CastleColors.Bg,
    onBackground = CastleColors.Ink,
    outline = CastleColors.Line,
)

@Composable
fun CastleDiaryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CastleDiaryColorScheme,
        typography = CastleDiaryTypography,
        shapes = CastleDiaryShapes,
        content = content,
    )
}
