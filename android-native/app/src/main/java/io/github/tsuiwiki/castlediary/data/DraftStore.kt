package io.github.tsuiwiki.castlediary.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.draftDataStore by preferencesDataStore(name = "castle-draft")

/** 写一页草稿（P0）：自动保存正文，防丢失；显式保存后清空 */
class DraftStore(private val context: Context) {
    private object Keys {
        val TEXT = stringPreferencesKey("draftText")
        val TITLE = stringPreferencesKey("draftTitle")
        val BLOCKS = stringPreferencesKey("draftBlocks")
        val UPDATED_AT = stringPreferencesKey("draftUpdatedAt")
    }

    data class Draft(val title: String, val text: String, val blocks: String)

    suspend fun save(title: String, text: String, blocks: String) {
        context.draftDataStore.edit { p ->
            p[Keys.TITLE] = title
            p[Keys.TEXT] = text
            p[Keys.BLOCKS] = blocks
            p[Keys.UPDATED_AT] = System.currentTimeMillis().toString()
        }
    }

    suspend fun load(): Draft {
        val p = context.draftDataStore.data.first()
        return Draft(p[Keys.TITLE] ?: "", p[Keys.TEXT] ?: "", p[Keys.BLOCKS] ?: "[]")
    }

    suspend fun clear() {
        context.draftDataStore.edit { p ->
            p.remove(Keys.TITLE)
            p.remove(Keys.TEXT)
            p.remove(Keys.BLOCKS)
            p.remove(Keys.UPDATED_AT)
        }
    }
}
