package io.github.tsuiwiki.castlediary.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface DiaryDao {
    // 某天全部记录，按发生时间/创建时间升序（当天时间线）
    @Query("SELECT * FROM diary_entry WHERE date = :date ORDER BY happenedAt ASC, createdAt ASC")
    fun observeDay(date: String): Flow<List<DiaryEntry>>

    // 回忆页：按月分组用（返回某月全部）
    @Query("SELECT * FROM diary_entry WHERE date LIKE :ymPrefix ORDER BY date DESC, happenedAt ASC")
    fun observeMonth(ymPrefix: String): Flow<List<DiaryEntry>>

    // 简单搜索（标题/正文/食物/词）
    @Query("SELECT * FROM diary_entry WHERE text LIKE '%' || :q || '%' OR title LIKE '%' || :q || '%' OR payload LIKE '%' || :q || '%' ORDER BY date DESC")
    fun search(q: String): Flow<List<DiaryEntry>>

    @Upsert
    suspend fun upsert(entry: DiaryEntry)

    @Query("SELECT * FROM diary_entry WHERE id = :id")
    suspend fun byId(id: String): DiaryEntry?

    @Delete
    suspend fun delete(entry: DiaryEntry)
}

@Dao
interface DailySummaryDao {
    @Query("SELECT * FROM daily_summary WHERE date = :date")
    fun observe(date: String): Flow<DailySummary?>

    @Query("SELECT * FROM daily_summary WHERE date = :date")
    suspend fun byDate(date: String): DailySummary?

    @Upsert
    suspend fun upsert(summary: DailySummary)
}

@Dao
interface MediaDao {
    @Query("SELECT * FROM media_asset WHERE id = :id")
    suspend fun byId(id: String): MediaAsset?

    @Upsert
    suspend fun upsert(asset: MediaAsset)

    // 删除媒体前检查是否还有其他引用
    @Query("SELECT COUNT(*) FROM diary_media_relation WHERE mediaId = :mediaId")
    suspend fun refCount(mediaId: String): Int
}

@Dao
interface RelationDao {
    @Query("SELECT r.* FROM diary_media_relation r WHERE r.diaryId = :diaryId ORDER BY r.sortOrder")
    fun observeForDiary(diaryId: String): Flow<List<DiaryMediaRelation>>

    @Upsert
    suspend fun upsert(rel: DiaryMediaRelation)

    @Query("DELETE FROM diary_media_relation WHERE diaryId = :diaryId AND mediaId = :mediaId")
    suspend fun remove(diaryId: String, mediaId: String)
}

@Dao
interface LegacyRawDao {
    @Query("SELECT * FROM legacy_raw WHERE collection = :collection")
    suspend fun byCollection(collection: String): List<LegacyRaw>

    @Upsert
    suspend fun upsertAll(items: List<LegacyRaw>)

    @Query("SELECT COUNT(*) FROM legacy_raw")
    suspend fun count(): Int
}
