package io.github.tsuiwiki.castlediary.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.profileDataStore by preferencesDataStore(name = "castle-profile")

/** 孩子档案与设置（DataStore 持久化）：childName/birthday/pronoun/onboarded */
class ProfileStore(private val context: Context) {

    private object Keys {
        val CHILD_NAME = stringPreferencesKey("childName")
        val BIRTHDAY = stringPreferencesKey("birthday")
        val PRONOUN = stringPreferencesKey("pronoun")
        val ONBOARDED = booleanPreferencesKey("onboarded")
    }

    data class Profile(val childName: String, val birthday: String, val pronoun: String, val onboarded: Boolean)

    val profile: Flow<Profile> = context.profileDataStore.data.map { p ->
        Profile(
            childName = p[Keys.CHILD_NAME] ?: "",
            birthday = p[Keys.BIRTHDAY] ?: "",
            pronoun = p[Keys.PRONOUN] ?: "she",
            onboarded = p[Keys.ONBOARDED] ?: false,
        )
    }

    /** 一次性读取当前值（v2 导出写 settings 用） */
    suspend fun current(): Profile =
        profile.first()

    suspend fun save(childName: String, birthday: String, pronoun: String) {
        context.profileDataStore.edit { p ->
            p[Keys.CHILD_NAME] = childName
            p[Keys.BIRTHDAY] = birthday
            p[Keys.PRONOUN] = pronoun
            p[Keys.ONBOARDED] = true
        }
    }

    suspend fun setOnboarded() {
        context.profileDataStore.edit { it[Keys.ONBOARDED] = true }
    }

    /** 当前值一次性读取（导入 settings 时覆盖用） */
    suspend fun importFrom(childName: String, birthday: String, pronoun: String) {
        context.profileDataStore.edit { p ->
            if (childName.isNotBlank()) p[Keys.CHILD_NAME] = childName
            if (birthday.isNotBlank()) p[Keys.BIRTHDAY] = birthday
            if (pronoun.isNotBlank() || p[Keys.PRONOUN] == null) p[Keys.PRONOUN] = pronoun.ifBlank { "she" }
        }
    }
}
