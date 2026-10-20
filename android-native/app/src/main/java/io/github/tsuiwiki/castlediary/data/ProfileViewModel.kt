package io.github.tsuiwiki.castlediary.data

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** 档案 ViewModel：读写 DataStore，接「我的」页与日记首页（孩子名/年龄显示） */
class ProfileViewModel(context: Context) : ViewModel() {

    private val store = ProfileStore(context)

    val profile: StateFlow<ProfileStore.Profile> = store.profile
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ProfileStore.Profile("", "", "she", false))

    fun save(childName: String, birthday: String, pronoun: String) {
        viewModelScope.launch { store.save(childName, birthday, pronoun) }
    }

    fun markOnboarded() {
        viewModelScope.launch { store.setOnboarded() }
    }
}

val ProfileViewModelFactory = viewModelFactory {
    initializer {
        val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY]!!
        ProfileViewModel(app)
    }
}

/** 年龄文本：X岁Y个月 / Y个月整；未设生日返回空 */
fun ageText(birthday: String, onDate: String): String {
    if (birthday.isBlank()) return ""
    return try {
        val bd = java.time.LocalDate.parse(birthday)
        val d = java.time.LocalDate.parse(onDate)
        if (d.isBefore(bd)) return ""
        val years = java.time.Period.between(bd, d).years
        val months = java.time.Period.between(bd, d).months
        when {
            years > 0 && months > 0 -> "$years 岁 $months 个月"
            years > 0 -> "$years 岁"
            else -> "$months 个月"
        }
    } catch (e: Exception) { "" }
}
