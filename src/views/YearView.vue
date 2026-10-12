<template>
  <div class="view-head">
    <h2>年度回顾</h2>
    <div class="sub">一年一年的，把成长串起来</div>
  </div>

  <!-- 第一千个日子 -->
  <div v-if="day1000" class="card day1000" :class="{ past: day1000.passed }">
    <div class="d1000-body">
      <Icon name="gift" :size="36" />
      <div>
        <template v-if="day1000.passed">
          <div class="d1000-title">{{ day1000.isToday ? '今天就是第一千个日子！' : '第一千个日子，已经一起走过啦' }}</div>
          <div class="d1000-sub">{{ day1000.date }} · {{ store.settings.childName || '宝宝' }}出生后的第 1000 天{{ day1000.isToday ? '' : `（已过去 ${day1000.daysSince} 天）` }}</div>
        </template>
        <template v-else>
          <div class="d1000-title">第一千个日子倒计时</div>
          <div class="d1000-sub">{{ day1000.date }} · 还有 <b>{{ day1000.daysLeft }}</b> 天，到时候记得好好庆祝</div>
        </template>
      </div>
    </div>
  </div>

  <!-- 年切换 -->
  <div class="card">
    <div class="week-nav">
      <button class="mini-btn ghost" @click="year--"><Icon name="chevron-left" :size="14" />{{ year - 1 }}</button>
      <div class="week-label"><b>{{ year }} 年</b><button v-if="year !== nowYear" class="mini-btn ghost" @click="year = nowYear">回到今年</button></div>
      <button class="mini-btn ghost" :disabled="year >= nowYear" @click="year++">{{ year + 1 }}<Icon name="chevron-right" :size="14" /></button>
    </div>
  </div>

  <!-- 年度总览 -->
  <div class="stat-grid">
    <div class="stat-cell"><b>{{ report.readMinutes }}</b><span>阅读分钟</span></div>
    <div class="stat-cell"><b>{{ report.readCount }}</b><span>阅读次数</span></div>
    <div class="stat-cell"><b>{{ report.bookTitles.length }}</b><span>读过的书</span></div>
    <div class="stat-cell"><b>{{ report.newWords.length }}</b><span>新学字词</span></div>
    <div class="stat-cell"><b>{{ report.firstTastes.length }}</b><span>首尝食物</span></div>
    <div class="stat-cell"><b>{{ report.milestones.length }}</b><span>里程碑</span></div>
  </div>

  <!-- 月度大事记 12 格 -->
  <div class="card">
    <div class="card-title"><span class="ct-left"><Icon name="calendar" :size="16" />月度大事记</span></div>
    <div class="month-grid">
      <div v-for="m in monthly" :key="m.month" class="month-cell" :class="{ empty: m.empty, future: m.future }">
        <div class="month-head">{{ m.month }} 月</div>
        <template v-if="!m.empty && !m.future">
          <div v-if="m.readMinutes" class="month-line">📚 {{ m.readMinutes }} 分钟</div>
          <div v-for="t in m.items.slice(0, 3)" :key="t" class="month-line">{{ t }}</div>
          <div v-if="m.more" class="month-line dim">… 还有 {{ m.more }} 件</div>
        </template>
        <div v-else-if="m.future" class="month-line dim">还没到</div>
        <div v-else class="month-line dim">没有记录</div>
      </div>
    </div>
  </div>

  <!-- 里程碑时间轴 -->
  <div class="card" v-if="report.milestones.length">
    <div class="card-title"><span class="ct-left"><Icon name="flag" :size="16" />这一年的里程碑</span><span class="more">{{ report.milestones.length }} 个</span></div>
    <div class="tl">
      <div v-for="m in report.milestones" :key="m.id" class="tl-item">
        <span class="tl-date">{{ m.date }}</span>
        <span class="tl-dot"></span>
        <span class="tl-body">{{ m.title }}<span v-if="m.source" class="badge badge-info" style="margin-left:6px">{{ m.source }}</span></span>
      </div>
    </div>
  </div>

  <!-- 读过的书词云（简化：按次数字号） -->
  <div class="card" v-if="bookCloud.length">
    <div class="card-title"><span class="ct-left"><Icon name="library" :size="16" />这一年读过的书</span></div>
    <div class="book-cloud">
      <span v-for="b in bookCloud" :key="b.title" class="cloud-word" :style="{ fontSize: b.size + 'px' }" :title="`读了 ${b.count} 次`">{{ b.title }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Icon from '../components/Icon.vue'
import { store, rangeReport, babyDayOfLife } from '../store.js'

const nowYear = new Date().getFullYear()
const year = ref(nowYear)

function p2(n) { return String(n).padStart(2, '0') }

const report = computed(() => rangeReport(`${year.value}-01-01`, `${year.value}-12-31`))

// 月度大事记：每月聚合里程碑 + 首尝 + 阅读分钟
const monthly = computed(() => {
  const now = new Date()
  const cells = []
  for (let m = 1; m <= 12; m++) {
    const start = `${year.value}-${p2(m)}-01`
    const endDay = new Date(year.value, m, 0).getDate()
    const r = rangeReport(start, `${year.value}-${p2(m)}-${p2(endDay)}`)
    const items = []
    for (const ms of r.milestones) items.push(`🏁 ${ms.title}`)
    for (const f of r.firstTastes) items.push(`⭐ 首尝 ${f}`)
    if (r.newWords.length) items.push(`🔤 新学 ${r.newWords.length} 字词`)
    const future = year.value === nowYear && m > now.getMonth() + 1
    cells.push({
      month: m,
      readMinutes: r.readMinutes,
      items: items.slice(0, 3),
      more: items.length > 3 ? items.length - 3 : 0,
      empty: !r.readMinutes && !items.length,
      future,
    })
  }
  return cells
})

// 读过的书词云：按阅读次数定字号
const bookCloud = computed(() => {
  const map = new Map()
  for (const b of store.books) {
    for (const r of b.reads || []) {
      if ((r.time || '').slice(0, 4) === String(year.value)) {
        map.set(b.title, (map.get(b.title) || 0) + 1)
      }
    }
  }
  const arr = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
  const max = arr[0]?.[1] || 1
  return arr.map(([title, count]) => ({ title, count, size: 13 + Math.round((count / max) * 14) }))
})

// 第一千个日子 = 出生第 1000 天 = 生日 + 999 天
const day1000 = computed(() => {
  if (!store.settings.birthday) return null
  const b = new Date(store.settings.birthday + 'T00:00:00')
  if (isNaN(b)) return null
  const d = new Date(b.getTime() + 999 * 86400000)
  const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  const today = babyDayOfLife()
  if (today == null) return null
  if (today === 1000) return { passed: true, isToday: true, date }
  if (today > 1000) return { passed: true, isToday: false, date, daysSince: today - 1000 }
  return { passed: false, date, daysLeft: 1000 - today }
})
</script>
