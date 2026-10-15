<template>
  <div v-if="!ready || !lock.ready" class="loading">城堡日记<br>加载中…</div>

  <!-- 主数据损坏恢复页：原文留在本机不动，由用户决定 -->
  <div v-else-if="dataCorrupt" class="corrupt-screen">
    <div class="corrupt-card">
      <div class="corrupt-icon"><Icon name="alert-triangle" :size="30" /></div>
      <b>本机的数据文件读不出来了</b>
      <p>原文还在这台设备上，城堡日记没有动它。可以：</p>
      <p>① 先把原始数据下载一份副本（发给会修的人，也许能救回来）；<br>
      ② 或用最近的备份文件导入恢复；<br>
      ③ 确认都不要了，再清空重来。</p>
      <div class="corrupt-actions">
        <button class="btn-primary" @click="downloadCorruptRaw">下载原始数据副本</button>
        <button class="mini-btn" @click="corruptFile.click()">导入备份恢复</button>
        <input ref="corruptFile" type="file" accept=".json,application/json" hidden @change="onCorruptImport" />
        <button class="mini-btn ghost corrupt-danger" @click="corruptReset">清空重来（不可撤销）</button>
      </div>
      <p class="corrupt-msg">{{ corruptMsg }}</p>
    </div>
  </div>

  <template v-else>
  <!-- 自然微风景底纹：远山剪影，随季节变色；冬季为雪山尖角。纯装饰（无业务数据），锁屏时也渲染，由锁屏毛玻璃雾化 -->
  <div v-if="seasonKey !== 'off'" class="nature-scenery" aria-hidden="true">
    <svg class="scenery-svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
      <template v-if="seasonKey === 'winter'">
        <path class="hill-layer-1" d="M0,240 L180,150 L330,220 L520,110 L700,200 L880,130 L1080,230 L1260,160 L1440,210 L1440,320 L0,320 Z" />
        <path class="hill-layer-2" d="M0,270 L220,200 L420,260 L640,180 L860,250 L1100,190 L1320,255 L1440,230 L1440,320 L0,320 Z" />
      </template>
      <template v-else>
        <path class="hill-layer-1" d="M0,160 C320,220 420,100 720,180 C1020,260 1200,140 1440,190 L1440,320 L0,320 Z" />
        <path class="hill-layer-2" d="M0,220 C380,160 600,240 960,190 C1260,140 1380,210 1440,240 L1440,320 L0,320 Z" />
      </template>
    </svg>
  </div>

  <!-- 应用锁：锁定时不渲染业务界面（不是遮罩） -->
  <AppLockOverlay v-if="lock.locked" />

  <div v-else class="shell">
    <!-- 左侧边栏（桌面）/ 底部 tabbar（手机，靠 CSS 断点切换形态） -->
    <nav class="sidebar" :class="{ expanded: navOpen }">
      <!-- 平板图标栏：触屏没有悬停提示，提供展开按钮看菜单名 -->
      <button class="nav-expand" :aria-label="navOpen ? '收起菜单' : '展开菜单'" :title="navOpen ? '收起菜单' : '展开菜单'" @click="navOpen = !navOpen">
        <Icon :name="navOpen ? 'chevron-left' : 'chevron-right'" :size="15" />
      </button>
      <div class="brand">
        <Icon name="castle" :size="24" />
        <span class="brand-text">城堡日记<span class="brand-sub">{{ store.settings.childName ? store.settings.childName + '的小城堡' : '一天一页的成长日记' }}</span></span>
      </div>
      <div
        v-for="n in NAV" :key="n.key"
        class="nav-item" :class="{ active: activeTop === n.key }"
        :title="n.label" :aria-label="n.label" role="button" tabindex="0"
        @click="clickTop(n)" @keydown.enter="clickTop(n)" @keydown.space.prevent="clickTop(n)"
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
        数据保存在{{ isApp() ? '这台手机' : '本机浏览器' }}<br>设置页可导出备份 · {{ platformLabel() }} v{{ APP_VERSION }}
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
        <div v-if="currentGroup && view !== 'collections'" class="subtabs">
          <span
            v-for="c in currentGroup.children" :key="c.key"
            class="subtab" :class="{ on: c.key === 'cards' ? cardOpen : view === c.key }"
            @click="c.key === 'cards' ? openCards() : switchView(c.key)"
          ><Icon :name="c.icon" :size="14" />{{ c.label }}</span>
        </div>

        <DiaryView v-if="view === 'diary'" @go="go" />
        <DiaryCalendarView v-else-if="view === 'calendar'" @go="go" />
        <CollectionsHomeView v-if="view === 'collections'" @go="switchView" />
        <ShelfView v-else-if="view === 'shelf'" @open="id => bookId = id" />
        <WordsView v-else-if="view === 'words'" />
        <DietView v-else-if="view === 'diet'" />
        <GamesView v-else-if="view === 'games'" />
        <ToysView v-else-if="view === 'toys'" />
        <MedicineView v-else-if="view === 'medicine'" />
        <IllnessView v-else-if="view === 'illness'" @go="go" />
        <HealthView v-else-if="view === 'health'" />
        <WeeklyView v-else-if="view === 'weekly'" @go="go" />
        <YearView v-else-if="view === 'year'" @go="go" />
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

    <!-- 新手引导：全新安装时出现一次（设置里可重看） -->
    <Onboarding v-if="showOnboarding" @done="onboardDone" @import="onboardImport" />

    <!-- 播放录音失败的原因（日记、词库、翻卡共用） -->
    <div v-if="audioError" class="toast toast-err">{{ audioError }}</div>
  </div>
  </template>
</template>

<script setup>
import { ref, computed, watch, nextTick , onMounted, onBeforeUnmount } from 'vue'
import Icon from './components/Icon.vue'
import DiaryView from './views/DiaryView.vue'
import Onboarding from './components/Onboarding.vue'
import { initAppShell, isApp, platformLabel } from './utils/platform.js'
import DiaryCalendarView from './views/DiaryCalendarView.vue'
import CollectionsHomeView from './views/CollectionsHomeView.vue'
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
import { her, store, ready, updateSettings, APP_VERSION, addBookSignal, diaryDate, todayStr, storageError, dataCorrupt, downloadCorruptRaw, importBackup, resetAll } from './store.js'
import { lock, initAppLock, onHidden, onVisible, onStorageSignal, lockNow } from './utils/appLock.js'
import { applySeasonTheme } from './utils/seasonTheme.js'
import AppLockOverlay from './components/AppLockOverlay.vue'


// 四季通透背景：复用节气计算，跟随设置（可固定/关闭）
const seasonKey = ref('autumn')
const navOpen = ref(false) // 平板端图标栏展开
watch(() => store.settings.seasonBg, () => {
  applySeasonTheme(store.settings.seasonBg || 'auto', todayStr())
  seasonKey.value = document.body.dataset.seasonBg
}, { immediate: true })

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
// 损坏恢复页的导入与重置
const corruptFile = ref(null)
const corruptMsg = ref('')
async function onCorruptImport(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  try {
    const data = JSON.parse(await f.text())
    await importBackup(data) // 原子化：失败会自动回滚（损坏原文仍在）
    location.reload()
  } catch (err) {
    corruptMsg.value = err?.message?.startsWith('导入没有完成') ? err.message : '这个文件读不了。原始数据没有动，可以再试。'
  }
}
async function corruptReset() {
  if (!confirm('确定清空本机全部数据？原始数据副本将不再保留。此操作不可撤销！')) return
  await resetAll()
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
  { key: 'calendar', icon: 'calendar', label: '日记日历', short: '日历' },
  {
    key: 'g-books', icon: 'library', label: '分册', short: '分册',
    children: [
      { key: 'collections', icon: 'library', label: '总览' },
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
      { key: 'profile', icon: 'baby', label: '成长名片' },
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
      { key: 'members', icon: 'users', label: '家庭成员管理' },
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
    // 分册特殊化：每次点击都回总览，不直接跳进某个具体分册
    if (n.key === 'g-books') { switchView('collections'); return }
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

// ---------- 新手引导 ----------
// 判定"全新安装"：没填过小名、也没有任何记录。老用户（有数据但没有 onboarded 字段）静默标记，永远不打扰。
const hasAnyData = () => !!(store.settings.childName || store.diaries.length || store.books.length || store.words.length ||
  store.meals.length || store.photos.length || store.trips.length || store.games.length || store.healths.length || store.illnesses.length)
// 只在加载完成时判定一次并锁定：引导第 1 步会先存小名，不能因此让引导框中途消失
const replayOnboarding = ref(false)
const showOnboarding = computed(() => ready.value && lock.ready && !dataCorrupt.value && replayOnboarding.value)
watch(ready, ok => {
  if (!ok || store.settings.onboarded) return
  if (hasAnyData()) updateSettings({ onboarded: true, pwaHintShown: true })
  else replayOnboarding.value = true
}, { immediate: true })
function onboardDone() {
  replayOnboarding.value = false
  switchView('diary')
}
function onboardImport() {
  replayOnboarding.value = false
  switchView('settings')
  nextTick(() => document.getElementById('st-backup')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
// ---------- 安卓返回键：先关最上层的弹层，再回日记页，在日记页就退到后台 ----------
function closeTopOverlay() {
  const masks = [...document.querySelectorAll('.drawer-mask, .lb-mask')]
  if (masks.length) { masks[masks.length - 1].click(); return true }
  if (document.querySelector('.ob-mask')) return true // 新手引导里返回键不做事，用「跳过」
  if (document.querySelector('.card-mask, .gb-root') || document.querySelector('.stickers .sticker.on')) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    return true
  }
  return false
}
initAppShell({
  fallback: () => {
    if (closeTopOverlay()) return true
    if (view.value !== 'diary') { switchView('diary'); return true }
    return false
  },
})

// 设置页「再看一遍新手引导」
window.addEventListener('castle-replay-onboarding', () => { replayOnboarding.value = true })

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
    alert(her('词库还是空的，先在日记里记几个她说的词，或去书房读本书、记几个词吧'))
    return
  }
  cardOpen.value = true
}
</script>
