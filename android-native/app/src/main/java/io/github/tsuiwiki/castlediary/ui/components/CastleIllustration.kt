package io.github.tsuiwiki.castlediary.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import java.time.LocalDate
import kotlin.math.cos
import kotlin.math.sin

/**
 * 城堡插画（P2，移植网页版 CastleSvg.vue 的简化静态版）。
 * 固定三层城墙/两座塔楼/七块城垛砖/三株小树，不做网页版的数据驱动生长
 * （层数=月龄、砖=会说的词、旗=里程碑、灯=读完的书、树=去过的地方）。
 * 保留季节换装：按当天月份取季，夏天出太阳、冬天飘雪盖顶、秋天金黄落叶、春天树开花。
 * 坐标系沿用网页版 viewBox：宽 320，地平线在 y=116。
 */
private const val VB_W = 320f
private const val GROUND = 116f
private const val VB_BOTTOM = 156f // GROUND + 40
private const val FLOOR_H = 24f
private const val FLOORS = 3 // 固定三层
private const val BRICKS = 7 // 城垛一排砌满
private const val BUSHES = 3
private const val LIT_WINDOWS = 2 // 亮灯数，静态常亮
private const val TX1 = 54f
private const val TX2 = 266f

// 城堡自身调色板（网页版 CastleSvg 的 BASE 色，独立于 CastleColors 主题色）
private val Wall = Color(0xFFF3D9AD)
private val WallB = Color(0xFFEECFA0)
private val BrickC = Color(0xFFE0B87E)
private val TowerC = Color(0xFFF0B06E)
private val Roof = Color(0xFFD97F5A)
private val Door = Color(0xFFA06B3C)
private val StrokeC = Color(0xFFC98D5F)
private val Flag = Color(0xFFD4537E)
private val Lit = Color(0xFFF7C94F)
private val Dark = Color(0xFF9C8B74)
private val Trunk = Color(0xFF8A6B45)
private val Sun = Color(0xFFF7C94F)
private val Blossom = Color(0xFFF4A9C0)
private val Snow = Color(0xFFFFFFFF)

/** 季节配色（网页版 SEASONS 表；季节按月份划分，网页版按节气，MVP 简化） */
enum class CastleSeason(
    val sky: Color,
    val ground: Color,
    val water: Color,
    private val bush: Color,
    private val bushHi: Color,
) {
    SPRING(Color(0xFFEAF6E0), Color(0xFFA5D18B), Color(0xFFA9CDEA), Color(0xFF6FB25A), Color(0xFF83C06C)),
    SUMMER(Color(0xFFE3F1FF), Color(0xFF8FC96F), Color(0xFF7FB8E8), Color(0xFF4F9C46), Color(0xFF63AD58)),
    AUTUMN(Color(0xFFFDF0D8), Color(0xFFD8C07E), Color(0xFFA9CDEA), Color(0xFFD99A4E), Color(0xFFE3AA62)),
    WINTER(Color(0xFFEEF4FB), Color(0xFFE8EEF5), Color(0xFFB8CFE6), Color(0xFF9DB3C4), Color(0xFFADC0D0)),
    ;

    fun bushColor(hi: Boolean = false): Color = if (hi) bushHi else bush

    companion object {
        fun of(date: LocalDate): CastleSeason = when (date.monthValue) {
            in 3..5 -> SPRING
            in 6..8 -> SUMMER
            in 9..11 -> AUTUMN
            else -> WINTER
        }
    }
}

// 雪花/落叶位置固定不随机，避免每次渲染跳动（坐标沿用网页版常量）
private val SNOWFLAKES = listOf(
    Triple(20f, 10f, 1.6f), Triple(60f, 26f, 1.2f), Triple(105f, 6f, 1.8f), Triple(150f, 22f, 1.3f),
    Triple(195f, 12f, 1.7f), Triple(238f, 28f, 1.2f), Triple(282f, 8f, 1.6f), Triple(305f, 20f, 1.2f),
)
private data class Leaf(val x: Float, val y: Float, val color: Color, val deg: Float)
private val LEAVES = listOf(
    Leaf(30f, 30f, Color(0xFFD99A4E), 20f), Leaf(90f, 14f, Color(0xFFC9825B), -25f),
    Leaf(170f, 34f, Color(0xFFE0A53B), 40f), Leaf(250f, 18f, Color(0xFFC9825B), -15f),
    Leaf(296f, 30f, Color(0xFFD99A4E), 30f),
)

/** 静态城堡插画。宽度由外层约束决定，高度按 viewBox 比例自适应。 */
@Composable
fun CastleIllustration(
    modifier: Modifier = Modifier,
    childName: String = "",
    season: CastleSeason = CastleSeason.of(LocalDate.now()),
) {
    val wallTop = GROUND - FLOORS * FLOOR_H
    val towerH = FLOORS * FLOOR_H + 30f
    val towerTop = GROUND - towerH
    val skyTop = minOf(wallTop, towerTop) - 20f
    val vbH = VB_BOTTOM - skyTop
    val name = childName.ifBlank { "宝宝" }

    Canvas(
        modifier = modifier
            .aspectRatio(VB_W / vbH)
            .semantics { contentDescription = "$name 的城堡：三层城墙、两座塔楼、七块城垛砖、院子里三株小树${seasonLabel(season)}" },
    ) {
        val s = size.width / VB_W
        // 绕原点缩放：draw 坐标直接用 320 宽 viewBox 单位，默认 pivot=center 会错位
        scale(s, s, pivot = Offset.Zero) {
            drawSky(season, skyTop)
            drawGroundAndRiver(season)
            repeat(BUSHES) { drawBush(it, season) }
            drawFlagPolesAndFlags(towerTop)
            drawTowers(season, towerTop, towerH)
            drawWalls(season, wallTop)
            drawWindows()
            drawDoor()
        }
    }
}

private fun seasonLabel(s: CastleSeason) = when (s) {
    CastleSeason.SPRING -> "，春天小树开花"
    CastleSeason.SUMMER -> "，夏天挂着小太阳"
    CastleSeason.AUTUMN -> "，秋天金黄落叶"
    CastleSeason.WINTER -> "，冬天飘雪盖顶"
}

// 天空 + 季节小物（太阳/雪花/落叶）
private fun DrawScope.drawSky(season: CastleSeason, skyTop: Float) {
    drawRect(season.sky, topLeft = Offset(0f, skyTop), size = Size(VB_W, GROUND - skyTop + 4f))
    when (season) {
        CastleSeason.SUMMER -> {
            val c = Offset(36f, skyTop + 26f)
            drawCircle(Sun, radius = 11f, center = c)
            for (a in 1..8) {
                val rad = Math.toRadians((a * 45 - 90).toDouble())
                drawLine(
                    Sun,
                    start = c + Offset((15f * cos(rad)).toFloat(), (15f * sin(rad)).toFloat()),
                    end = c + Offset((19f * cos(rad)).toFloat(), (19f * sin(rad)).toFloat()),
                    strokeWidth = 2f,
                    cap = StrokeCap.Round,
                )
            }
        }
        CastleSeason.WINTER -> SNOWFLAKES.forEach { (x, y, r) ->
            drawCircle(Snow.copy(alpha = 0.9f), radius = r, center = Offset(x, y + skyTop + 30f))
        }
        CastleSeason.AUTUMN -> LEAVES.forEach { l ->
            val c = Offset(l.x, l.y + skyTop + 30f)
            rotate(l.deg, pivot = c) {
                drawOval(l.color, topLeft = c - Offset(5f, 2.6f), size = Size(10f, 5.2f))
            }
        }
        else -> Unit
    }
}

// 地面 + 小河水波（T 型平滑二次贝塞尔的交替波峰）
private fun DrawScope.drawGroundAndRiver(season: CastleSeason) {
    drawRect(season.ground, topLeft = Offset(0f, GROUND), size = Size(VB_W, 22f))
    val wave = Path().apply {
        moveTo(0f, GROUND + 22f)
        quadraticTo(30f, GROUND + 30f, 60f, GROUND + 22f)
        quadraticTo(90f, GROUND + 14f, 120f, GROUND + 22f)
        quadraticTo(150f, GROUND + 30f, 180f, GROUND + 22f)
        quadraticTo(210f, GROUND + 14f, 240f, GROUND + 22f)
        quadraticTo(270f, GROUND + 30f, 300f, GROUND + 22f)
        quadraticTo(330f, GROUND + 14f, 360f, GROUND + 22f)
        lineTo(VB_W, VB_BOTTOM)
        lineTo(0f, VB_BOTTOM)
        close()
    }
    drawPath(wave, season.water)
}

// 院子里的小树：春天开花、冬天挂雪
private fun DrawScope.drawBush(i: Int, season: CastleSeason) {
    val bx = 24f + i * 46f + if (i % 2 == 1) 10f else 0f
    translate(bx, GROUND - 10f) {
        drawRect(Trunk, topLeft = Offset(-2f, 6f), size = Size(4f, 8f))
        drawCircle(season.bushColor(), radius = 8f)
        drawCircle(season.bushColor(hi = true), radius = 4f, center = Offset(5f, -5f))
        if (season == CastleSeason.SPRING) {
            drawCircle(Blossom, radius = 1.8f, center = Offset(-4f, -2f))
            drawCircle(Blossom, radius = 1.8f, center = Offset(3f, -6f))
            drawCircle(Blossom, radius = 1.8f, center = Offset(4f, 2f))
        }
        if (season == CastleSeason.WINTER) {
            drawOval(Snow, topLeft = Offset(-6f, -8.6f), size = Size(12f, 5.2f))
        }
    }
}

private fun DrawScope.drawFlagPolesAndFlags(towerTop: Float) {
    listOf(TX1, TX2).forEach { tx ->
        drawLine(StrokeC, start = Offset(tx, towerTop), end = Offset(tx, towerTop - 10f), strokeWidth = 1.5f)
    }
    // 旗面：奇数面挂左塔、偶数面挂右塔
    for (i in 0..1) {
        val fx = if (i % 2 == 1) TX1 else TX2
        val path = Path().apply {
            moveTo(fx, towerTop - 10f)
            relativeLineTo(16f, 5f)
            relativeLineTo(-16f, 5f)
            close()
        }
        drawPath(path, Flag)
    }
}

// 左右塔楼：三角屋顶（冬天积雪）、塔身描边、塔门
private fun DrawScope.drawTowers(season: CastleSeason, towerTop: Float, towerH: Float) {
    listOf(TX1, TX2).forEach { tx ->
        drawRect(TowerC, topLeft = Offset(tx - 18f, towerTop), size = Size(36f, towerH))
        drawRect(StrokeC, topLeft = Offset(tx - 18f, towerTop), size = Size(36f, towerH), style = Stroke(1f))
        val roof = Path().apply {
            moveTo(tx - 22f, towerTop)
            lineTo(tx, towerTop - 16f)
            lineTo(tx + 22f, towerTop)
            close()
        }
        drawPath(roof, Roof)
        if (season == CastleSeason.WINTER) drawPath(roof, Snow.copy(alpha = 0.85f))
        drawRoundRect(
            Wall,
            topLeft = Offset(tx - 5f, towerTop + 26f),
            size = Size(10f, 14f),
            cornerRadius = CornerRadius(2f, 2f),
        )
    }
}

// 城墙（固定三层交替色）+ 城垛砖一排 + 冬天垛上落雪
private fun DrawScope.drawWalls(season: CastleSeason, wallTop: Float) {
    for (i in 1..FLOORS) {
        val y = GROUND - i * FLOOR_H
        val fill = if (i % 2 == 1) Wall else WallB
        drawRect(fill, topLeft = Offset(80f, y), size = Size(160f, FLOOR_H))
        drawRect(StrokeC, topLeft = Offset(80f, y), size = Size(160f, FLOOR_H), style = Stroke(1f))
    }
    for (i in 1..BRICKS) {
        drawRoundRect(
            BrickC,
            topLeft = Offset(84f + (i - 1) * 21f, wallTop - 7f),
            size = Size(13f, 7f),
            cornerRadius = CornerRadius(1.5f, 1.5f),
        )
    }
    if (season == CastleSeason.WINTER) {
        drawRoundRect(
            Snow.copy(alpha = 0.9f),
            topLeft = Offset(80f, wallTop - 9f),
            size = Size(160f, 4f),
            cornerRadius = CornerRadius(2f, 2f),
        )
    }
}

// 九个窗洞，左下起前两盏常亮（读过的书点的灯，静态保留两盏）
private fun DrawScope.drawWindows() {
    for (f in 0 until FLOORS) {
        for (k in 0..2) {
            val idx = f * 3 + k
            drawRoundRect(
                if (idx < LIT_WINDOWS) Lit else Dark,
                topLeft = Offset(100f + k * 46f, GROUND - f * FLOOR_H - FLOOR_H + 7f),
                size = Size(9f, 12f),
                cornerRadius = CornerRadius(2f, 2f),
            )
        }
    }
}

// 拱形大门 + 门把手
private fun DrawScope.drawDoor() {
    val door = Path().apply {
        moveTo(146f, GROUND)
        lineTo(146f, GROUND - 22f)
        arcTo(Rect(146f, GROUND - 35f, 174f, GROUND - 9f), 180f, 180f, forceMoveTo = false)
        lineTo(174f, GROUND)
        close()
    }
    drawPath(door, Door)
    drawPath(door, StrokeC, style = Stroke(1f))
    drawCircle(Color(0xFFF5D58A), radius = 2f, center = Offset(166f, GROUND - 10f))
}
