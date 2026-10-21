package io.github.tsuiwiki.castlediary.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import io.github.tsuiwiki.castlediary.ui.theme.PolaroidShape
import java.io.File

/**
 * 拍立得照片卡片（视觉重构 P1-C，对应网页版 DiaryView.vue 的 .polaroid 样式）。
 *
 * 白色相框（顶部/左右 7dp，底部留给配文）+ 几乎直角（3dp 圆角）+ 暖褐投影 +
 * 楷体配文 + 按索引奇偶确定性交替倾斜 ±2deg（不用随机数，与网页版行为一致）。
 */
@Composable
fun PolaroidPhoto(
    file: File,
    caption: String,
    index: Int,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer { rotationZ = if (index % 2 == 0) -2f else 2f }
            .shadow(3.dp, PolaroidShape)
            .clip(PolaroidShape)
            .background(Color.White)
            .padding(start = 7.dp, top = 7.dp, end = 7.dp, bottom = 0.dp),
    ) {
        AsyncImage(
            model = file,
            contentDescription = caption.ifBlank { "照片" },
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f),
            contentScale = ContentScale.Crop,
        )
        androidx.compose.material3.Text(
            caption,
            fontSize = 13.sp,
            fontFamily = io.github.tsuiwiki.castlediary.ui.theme.KaitiDateFontFamily,
            color = Color(0xFF5A4632),
            maxLines = 1,
            modifier = Modifier.padding(start = 2.dp, top = 5.dp, end = 2.dp, bottom = 7.dp),
        )
    }
}
