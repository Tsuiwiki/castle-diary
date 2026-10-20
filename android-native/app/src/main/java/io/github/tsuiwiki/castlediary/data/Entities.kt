package io.github.tsuiwiki.castlediary.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * 日记记录（PRD 8.1）：一天可多条；自由日记与快捷记录统一载体。
 * entryKind 决定 payload 里放什么；id 直接用旧版 PWA 的 id（字符串，迁移零转换）。
 */
@Entity(
    tableName = "diary_entry",
    indices = [Index("date"), Index("entryKind")]
)
data class DiaryEntry(
    @PrimaryKey val id: String,
    val date: String,              // YYYY-MM-DD（记录所属日期）
    val happenedAt: String?,       // 发生时间 YYYY-MM-DD HH:mm（区别于 createdAt，可选）
    val title: String?,            // 标题（可选，PRD 4.2）
    val text: String,              // 正文/摘要（贴纸记录也存一句可读文本）
    val by: String,                // 落款（谁记的）
    val entryKind: String,         // free / meal / read / say / play / trip / photo / migrated
    val payload: String,           // 该类型专用字段 JSON（如 meal 的餐次/食物、read 的书名）
    val createdAt: String,
    val updatedAt: String,
)

/** 每日状态（PRD 8.2 / 每日状态）：一天最多一份，可选 */
@Entity(tableName = "daily_summary")
data class DailySummary(
    @PrimaryKey val date: String,  // 日期即主键，天然唯一
    val mood: String,              // 心情（空=未填）
    val energyState: String,       // 精神状态（可选）
    val note: String,              // 家长观察（可选）
    val createdAt: String,
    val updatedAt: String,
)

/** 媒体资产（PRD 8.3）：照片/录音统一管理，存私有目录相对路径 */
@Entity(tableName = "media_asset")
data class MediaAsset(
    @PrimaryKey val id: String,
    val kind: String,              // image / audio
    val relativePath: String,      // 私有目录相对路径
    val mimeType: String,
    val sizeBytes: Long,
    val sha256: String,            // 校验（导入完整性）
    val createdAt: String,
)

/** 记录↔媒体关系（PRD 8.4）：多对多，支持一条日记多张照片、同一媒体被多条引用 */
@Entity(
    tableName = "diary_media_relation",
    primaryKeys = ["diaryId", "mediaId"],
    indices = [Index("mediaId")]
)
data class DiaryMediaRelation(
    val diaryId: String,
    val mediaId: String,
    val sortOrder: Int,
)

/**
 * 暂缓功能的历史数据兜底表（MVP 关键设计）：按旧集合名原样存 JSON，保证零丢失。
 * 解冻某功能（如健康、词库）时再拆专用表；v2 导出时按此重组回完整格式。
 */
@Entity(tableName = "legacy_raw", indices = [Index("collection")])
data class LegacyRaw(
    @PrimaryKey val id: String,    // collection + ':' + 旧条目 id
    val collection: String,        // books / words / healths / illnesses / ... 17 集合
    val json: String,              // 该条目的原始 JSON
)
