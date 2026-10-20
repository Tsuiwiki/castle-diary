package io.github.tsuiwiki.castlediary.ui.diary

import android.content.Context
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import io.github.tsuiwiki.castlediary.data.CastleDatabase

/** DiaryViewModel 工厂：注入 CastleDatabase（需 Application 上下文） */
val DiaryViewModelFactory = viewModelFactory {
    initializer {
        val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY]
        DiaryViewModel(CastleDatabase.get(app))
    }
}
