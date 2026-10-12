<template>
  <div v-if="!ready || !lock.ready" class="loading">城堡日记<br>加载中…</div>

  <!-- 应用锁：锁定时不渲染业务界面（不是遮罩） -->
  <AppLockOverlay v-else-if="lock.locked" />

  <div v-else class="shell">
    <!-- 左侧边栏（桌面）/ 底部 tabbar（手机，靠 CSS 断点切换形态） -->
    <nav class="sidebar">
      <div class="brand">
        <Icon name="castle" :size="24" />
        <span class="brand-text">城堡日记<span class="brand-sub">{{ store.settings.childName ? store.settings.childName + '的小城堡' : '一天一页的成长日记' }}</span></span>
      </div>
      <div
        v-for="n in NAV" :key="n.key"
        class="nav-item" :class="{ active: activeTop === n.key }"
        @click="clickTop(n)"
      >
        <Icon :name="n.icon" :size="19" />
        <span class="nav-label">{{ n.label }}</span>
        <span class="nav-short">{{ n.short }}</span>
      </div>
      <!-- 本月概况 -->
      <div class="side-stats">
        <div class="ss-item"><span>本月写了</span><b>{{ monthDays }}</b><span>天日记</span></div>
        <div class="ss-item"><span>存了</span><b>{{ store.photos.length }}</b><span>张照片</span></div>
        <div class="ss-item"><span>城堡藏书</span><b>{{ store.books.length }}</b><span>本</span></div>
      </div>
      <div class="side-foot">
        数据保存在本机浏览器<br>设置页可导出备份 · v{{ APP_VERSION }}
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="main">
      <div class="main-inner" :class="{ wide: view === 'diary' }">
        <div v-if="storageError" class="storage-error">
          <Icon name="alert-triangle" :size="16" /><span>{{ storageError }}</span>
          <a @click="switchView('settings')">去导出备份 →</a>
        </div>
        <!-- 分组入口的子标签 -->
        <div v-if="currentGroup" class="subtabs">
          <span
            v-for="c in currentGroup.children" :key="c.key"
            class="subtab" :class="{ on: c.key === 'cards' ? cardOpen : view === c.key }"
            @click="c.key === 'cards' ? openCards() : switchView(c.key)"
          ><Icon :name="c.icon" :size="14" />{{ c.label }}</span>
        </div>

        <DiaryView v-if="view === 'diary'" @go="go" />
        <DiaryCalendarView v-else-if="view === 'calendar'" @go="go" />
        <ShelfView v-else-if="view === 'shelf'" @open="id => bookId = id" />
        <WordsView v-else-if="view === 'words'" />
        <DietView v-else-if="view === 'diet'" />
        <GamesView v-else-if="view === 'games'" />
        <ToysView v-else-if="view === 'toys'" />
        <MedicineView v-else-if="view === 'medicine'" />
        <IllnessView v-else-if="view === 'illness'" @go="go" />
        <HealthView v-else-if="view === 'health'" />
        <WeeklyView v-else-if="view === 'weekly'" @go="go" />
        <YearView v-else-if="view === 'year'" />
        <AlbumView v-else-if="view === 'album'" />
        <TripsView v-else-if="view === 'trips'" />
        <ProfileView v-else-if="view === 'profile'" @go="go" />
        <MembersView v-else-if="view === 'members'" />
        <RemindersView v-else-if="view === 'reminders'" @go="go" />
        <SettingsView v-else-if="view === 'settings'" />
      </div>
    </main>

    <!-- 书籍详情：右侧滑出弹框，即用即关不跳页 -->
    <div v-if="bookId" class="drawer-mask" @click="bookId = ''">
      <div class="drawer-panel" @click.stop>
        <BookView :book-id="bookId" @back="bookId = ''" />
      </div>
    </div>

    <!-- 翻卡巩固（未掌握优先，词库为空时提示） -->
    <WordCardSheet v-if="cardOpen" :words="store.words" @close="cardOpen = false" />

    <!-- 播放录音失败的原因（日记、词库、翻卡共用） -->
    <div v-if="audioError" class="toast toast-err">{{ audioError }}</div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick , onMounted, onBeforeUnmount } from 'vue'
import Icon from './components/Icon.vue'
import DiaryView from './views/DiaryView.vue'
import DiaryCalendarView from './views/DiaryCalendarView.vue'
import ShelfView from './views/ShelfView.vue'
import BookView from './views/BookView.vue'
import WordsView from './views/WordsView.vue'
import DietView from './views/DietView.vue'
import ToysView from './views/ToysView.vue'
import GamesView from './views/GamesView.vue'
import MedicineView from './views/MedicineView.vue'
import IllnessView from './views/IllnessView.vue'
import HealthView from './views/HealthView.vue'
import WeeklyView from './views/WeeklyView.vue'
import YearView from './views/YearView.vue'
import AlbumView from './views/AlbumView.vue'
import TripsView from './views/TripsView.vue'
import ProfileView from './views/ProfileView.vue'
import MembersView from './views/MembersView.vue'
import RemindersView from './views/RemindersView.vue'
import SettingsView from './views/SettingsView.vue'
import WordCardSheet from './components/WordCardSheet.vue'
import { store, ready, APP_VERSION, addBookSignal, diaryDate, todayStr, storageError } from './store.js'
import { lock, initAppLock, onHidden, onVisible, onStorageSignal, lockNow } from './utils/appLock.js'
import AppLockOverlay from './components/AppLockOverlay.vue'

onMounted(() => {
  document.addEventListener('visibilitychange', onVisChange)
  window.addEventListener('storage', onStorageSignal)
  window.addEventListener('keydown', onLockKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisChange)
  window.removeEventListener('storage', onStorageSignal)
  window.removeEventListener('keydown', onLockKey)
})
// Ctrl+Shift+L 立即锁定（仿 Win+L）；输入框里也生效，锁屏后不起作用
function onLockKey(e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l') && lock.enabled && !lock.locked) {
    e.preventDefault()
    lockNow()
  }
}
function onVisChange() {
  if (document.hidden) onHidden()
  else onVisible()
}
import { monthIndex } from './utils/diaryText.js'
import { audioError } from './utils/recorder.js'

// 一级入口 6 个；带 children 的是"分组"，进入后顶部出子标签切换原有页面
const NAV = [
  { key: 'diary', icon: 'book', label: '今天的日记', short: '日记' },
  { key: 'calendar', icon: 'calendar', label: '往日日记', short: '往日' },
  {
    key: 'g-books', icon: 'library', label: '分册', short: '分册',
    children: [
      { key: 'shelf', icon: 'library', label: '书房' },
      { key: 'words', icon: 'message-circle', label: '识字词库' },
      { key: 'cards', icon: 'sparkles', label: '翻卡巩固' },
      { key: 'diet', icon: 'utensils', label: '饮食册' },
      { key: 'games', icon: 'sparkles', label: '游戏册' },
      { key: 'toys', icon: 'blocks', label: '玩具屋' },
      { key: 'trips', icon: 'map-pin', label: '足迹册' },
    ],
  },
  {
    key: 'g-memory', icon: 'camera', label: '回忆', short: '回忆',
    children: [
      { key: 'album', icon: 'camera', label: '相册' },
      { key: 'weekly', icon: 'calendar', label: '成长周报' },
      { key: 'year', icon: 'award', label: '年度回顾' },
      { key: 'profile', icon: 'baby', label: '小主人档案' },
    ],
  },
  {
    key: 'g-health', icon: 'heart-pulse', label: '健康', short: '健康',
    children: [
      { key: 'health', icon: 'heart-pulse', label: '健康档案' },
      { key: 'illness', icon: 'alert-triangle', label: '生病记' },
      { key: 'medicine', icon: 'pill', label: '药箱' },
      { key: 'reminders', icon: 'bell', label: '提醒中心' },
    ],
  },
  {
    key: 'g-settings', icon: 'settings', label: '设置', short: '设置',
    children: [
      { key: 'settings', icon: 'settings', label: '设置' },
      { key: 'members', icon: 'users', label: '家庭成员' },
    ],
  },
]

const view = ref('diary')
const bookId = ref('')
const cardOpen = ref(false)
const lastChild = {} // 每个分组上次停留的子页面

const groupOf = key => NAV.find(n => n.children?.some(c => c.key === key))
const currentGroup = computed(() => groupOf(view.value) || null)
const activeTop = computed(() => currentGroup.value?.key || view.value)

const monthDays = computed(() => Object.keys(monthIndex(todayStr().slice(0, 7))).length)

function clickTop(n) {
  if (n.children) {
    switchView(lastChild[n.key] || n.children[0].key)
    return
  }
  if (n.key === 'diary') diaryDate.value = todayStr()
  switchView(n.key)
}

function switchView(key) {
  view.value = key
  bookId.value = ''
  cardOpen.value = false
  const g = groupOf(key)
  if (g) lastChild[g.key] = key
}

// 子页面之间的跳转（提醒、档案、日记页都会用到）
function go(key) {
  if (key === 'shelf-add') {
    switchView('shelf')
    nextTick(() => addBookSignal.value++)
    return
  }
  switchView(key)
}

function openCards() {
  if (!store.words.length) {
    alert('词库还是空的，先在日记里记几个她说的词，或去书房读本书、记几个词吧')
    return
  }
  cardOpen.value = true
}
</script>
