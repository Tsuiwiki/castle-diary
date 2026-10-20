package io.github.tsuiwiki.castlediary.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * 城堡日记数据库。MVP 首版 version=1；
 * 后续任何结构变更必须写 Migration，禁止 destructive migration（用户数据不可丢）。
 */
@Database(
    entities = [
        DiaryEntry::class,
        DailySummary::class,
        MediaAsset::class,
        DiaryMediaRelation::class,
        LegacyRaw::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class CastleDatabase : RoomDatabase() {
    abstract fun diaryDao(): DiaryDao
    abstract fun dailySummaryDao(): DailySummaryDao
    abstract fun mediaDao(): MediaDao
    abstract fun relationDao(): RelationDao
    abstract fun legacyRawDao(): LegacyRawDao

    companion object {
        @Volatile private var INSTANCE: CastleDatabase? = null

        fun get(context: Context): CastleDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    CastleDatabase::class.java,
                    "castle-diary.db",
                ).build().also { INSTANCE = it }
            }
    }
}
