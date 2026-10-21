package io.github.tsuiwiki.castlediary.ui.theme

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** 圆角体系，对应网页版各组件的 border-radius。 */
val PaperShape = RoundedCornerShape(18.dp)
val ChipShape = RoundedCornerShape(10.dp)
val BadgeShape = CircleShape // 对应 web 999px 全圆胶囊
val PolaroidShape = RoundedCornerShape(3.dp)

val CastleDiaryShapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = PaperShape,
)
