package io.github.tsuiwiki.castlediary.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * 城堡日记统一色彩体系（视觉重构 P0）。
 * 色值对齐网页版 src/styles.css 的 CSS 变量与 DiaryView.vue 的贴纸配色，
 * 作为全项目唯一真源，替代此前 6 个 Screen 文件各自私有重复定义的颜色常量。
 */
object CastleColors {
    // 品牌色（对应 web --brand / --brand-deep / --brand-soft）
    val Brand = Color(0xFFF0934B)
    val BrandDeep = Color(0xFFE87C4C)
    val BrandSoft = Color(0x29F6B064) // rgba(246,176,100,.16)

    // 文字色层级（对应 web --ink / --ink-2 / --ink-3）
    val Ink = Color(0xFF4A3520)
    val Ink2 = Color(0xFF8A6D4F)
    val Ink3 = Color(0xFF93816C)

    // 背景与卡片（对应 web --bg-1 / --card-solid）
    val Bg = Color(0xFFFFF9F0)
    val CardSolid = Color(0xFFFFFDF6)
    val Line = Color(0x47CEAA80) // rgba(206,170,128,.28)

    // 日记纸固有色（对应 web .paper 的 #fffaf1，独立于品牌色/页面背景）
    val PaperColor = Color(0xFFFFFAF1)
    val PaperBorder = Color(0x8CE2BE8C) // rgba(226,190,140,.55)
    val PaperLine = Color(0x52D6B280) // rgba(214,178,128,.32) 横线纹理
    val PaperBinding = Color(0x59EC8C6E) // rgba(236,140,110,.35) 左侧装订虚线

    // 预留，当前未在任何入口使用
    val Accent = Color(0xFFEE8B6C)
    val Green = Color(0xFF7FB069)

    // 强调底色（引导卡/记录块底色，沿用原各文件里的硬编码 0xFFFDF3E4）
    val HighlightBg = Color(0xFFFDF3E4)
    val HighlightText = Color(0xFF8A4F1F)
}

/** 贴纸配色单元：浅底 + 深字/图标色 */
data class StickerColor(val bg: Color, val fg: Color)

/**
 * 7 类贴纸配色映射，直接复用网页版 DiaryView.vue:1255-1261 的色值。
 * key 对齐 data/RecordBlock.kt 的 type 字段（food/reading/speech/play/outing/photo/observation）。
 * observation 对应网页版「不舒服 sick」配色，本次仅预留定义，不接入任何 UI 入口
 * （现有数据模型 entryKind/RecordBlock.type 无主动可选的该类型贴纸）。
 */
object StickerPalette {
    val Food = StickerColor(bg = Color(0xFFEAF3DE), fg = Color(0xFF3B6D11))
    val Reading = StickerColor(bg = Color(0xFFFDEBD3), fg = Color(0xFF9A5512))
    val Speech = StickerColor(bg = Color(0xFFFBE4EC), fg = Color(0xFFA23A62))
    val Play = StickerColor(bg = Color(0xFFECE9FB), fg = Color(0xFF4E3FA8))
    val Outing = StickerColor(bg = Color(0xFFE3EEFA), fg = Color(0xFF245D96))
    val Photo = StickerColor(bg = Color(0xFFEFEBE3), fg = Color(0xFF5B5145))
    val Observation = StickerColor(bg = Color(0xFFE1F5EE), fg = Color(0xFF085041))

    /** 按 RecordBlock.type / entryKind→type 取色，未知类型回退品牌浅底色 */
    fun of(type: String): StickerColor = when (type) {
        "food" -> Food
        "reading" -> Reading
        "speech" -> Speech
        "play" -> Play
        "outing" -> Outing
        "photo" -> Photo
        "observation" -> Observation
        else -> StickerColor(bg = CastleColors.HighlightBg, fg = CastleColors.HighlightText)
    }
}
