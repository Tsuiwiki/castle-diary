package io.github.tsuiwiki.castlediary.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import io.github.tsuiwiki.castlediary.R

/**
 * 衬线字体（霞鹜文楷 轻便版 LXGW WenKai Lite，SIL OFL-1.1，可商用，
 * 许可全文见 android-native/OFL-LXGWWenKaiLite.txt）。
 *
 * 当前仅裁剪了「日期大字」场景需要的字符集（数字 0-9 + 月日周一二三四五六七八九十今天·，
 * 共 27 字，裁剪后 ~10KB），刻意不覆盖任意用户输入文本。
 * 后续若要应用到拍立得配文/日记正文等自由文本场景（P1），需要重新裁剪覆盖更大字符集，
 * 不能直接复用这份极简子集。
 */
val KaitiDateFontFamily = FontFamily(Font(R.font.kaiti_lxgw_datehead, FontWeight.Normal))

/**
 * Typography 层级对齐网页版 DiaryView.vue 的排版（:1217-1234）：
 * 日期大字 24sp/Bold/衬线 > 标题 17-18sp/Bold > 正文 14-15sp > 辅助文字 13sp > 徽章 11sp/Bold。
 * 衬线字体只用于 displaySmall（日期大字）这一档，其余层级沿用系统无衬线字体，
 * 不把 KaitiDateFontFamily 写进这些层级，避免误用到长文本场景。
 */
val CastleDiaryTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = KaitiDateFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
    ),
    labelSmall = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
    ),
    labelMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 11.sp,
    ),
)
