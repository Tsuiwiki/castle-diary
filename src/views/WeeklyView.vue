<template>
  <div class="view-head">
    <h2>成长周报</h2>
    <div class="sub">每周回头看看，宝宝又长大了一点</div>
  </div>

  <!-- 周切换 -->
  <div class="card">
    <div class="week-nav">
      <button class="mini-btn ghost" @click="shiftWeek(-1)"><Icon name="chevron-left" :size="14" />上一周</button>
      <div class="week-label">
        <b>{{ weekLabel }}</b>
        <span v-if="weekOffset === 0" class="badge badge-ok">本周</span>
        <button v-else class="mini-btn ghost" @click="weekOffset = 0">回到本周</button>
        <button class="mini-btn" @click="makePoster"><Icon name="image" :size="13" />生成分享图</button>
      </div>
      <button class="mini-btn ghost" :disabled="weekOffset >= 0" @click="shiftWeek(1)">下一周<Icon name="chevron-right" :size="14" /></button>
    </div>
  </div>

  <!-- 童言稚语 -->
  <div v-if="weekQuotes.length" class="card quote-card">
    <div class="card-title"><span class="ct-left"><Icon name="message-circle" :size="16" />童言稚语</span><span class="more">{{ weekQuotes.length }} 句</span></div>
    <div v-for="q in weekQuotes" :key="q.id" class="wq-item">
      <span class="wq-text">“{{ q.word }}”</span>
      <span class="wq-date">{{ q.date.slice(5).replace('-', '/') }}</span>
    </div>
  </div>

  <!-- 亮点卡 -->
  <div v-if="highlights.length" class="card hl-card">
    <div class="card-title"><span class="ct-left"><Icon name="sparkles" :size="16" />本周亮点</span></div>
    <div class="hl-list">
      <div v-for="(h, i) in highlights" :key="i" class="hl-item">
        <Icon :name="h.icon" :size="16" />
        <span>{{ h.text }}</span>
      </div>
    </div>
  </div>

  <!-- 这一周的日记合订本 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="book" :size="16" />这一周的日记</span>
      <span class="more">写了 {{ diaryDays.filter(d => d.text || d.photos.length).length }} 天 · 点日期翻开那天</span>
    </div>
    <div class="wk-plates">
      <div v-for="d in diaryDays" :key="d.date" class="wk-plate" :class="{ none: !d.mealCount }">
        <RainbowPlate :groups="d.groups" :size="34" />
        <span>{{ d.week }}</span>
      </div>
    </div>
    <div v-for="d in diaryDays" :key="d.date" class="wk-day" :class="{ empty: !d.text && !d.photos.length }">
      <div class="wkd-date" @click="openDay(d.date)">
        <b>{{ d.week }}</b><span>{{ d.date.slice(5).replace('-', '/') }}</span>
        <i v-if="d.mood" class="wkd-mood" :style="{ background: d.mood.color }">{{ d.mood.key }}</i>
      </div>
      <div class="wkd-body">
        <div v-if="d.text" class="wkd-text">{{ d.text }}</div>
        <div v-else-if="!d.photos.length" class="wkd-none">这天没写</div>
        <div v-if="d.photos.length" class="wkd-photos">
          <img v-for="p in d.photos.slice(0, 4)" :key="p.id" :src="p.imageUrl" @click="openDay(d.date)" />
        </div>
      </div>
    </div>
  </div>

  <!-- 统计总览 -->
  <div class="stat-grid">
    <div class="stat-cell"><b>{{ report.readMinutes }}</b><span>阅读分钟</span></div>
    <div class="stat-cell"><b>{{ report.readCount }}</b><span>阅读次数</span></div>
    <div class="stat-cell"><b>{{ report.newWords.length }}</b><span>新学字词</span></div>
    <div class="stat-cell"><b>{{ report.firstTastes.length }}</b><span>首尝新食物</span></div>
    <div class="stat-cell"><b>{{ report.milestones.length }}</b><span>里程碑</span></div>
    <div class="stat-cell"><b>{{ report.playCount }}</b><span>家庭游戏</span></div>
  </div>

  <div class="two-col">
    <!-- 左：阅读 + 识字 -->
    <div class="col">
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="library" :size="16" />阅读</span><span class="more">{{ report.readDays }} 天有阅读</span></div>
        <template v-if="report.bookTitles.length">
          <div v-if="report.topBook" class="wk-line">🏆 读得最多：《{{ report.topBook.title }}》（{{ report.topBook.count }} 次）</div>
          <div class="wk-line dim">读了 {{ report.bookTitles.length }} 本：{{ report.bookTitles.slice(0, 8).join('、') }}<template v-if="report.bookTitles.length > 8"> 等</template></div>
        </template>
        <div v-else class="empty">这周没有阅读记录</div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="message-circle" :size="16" />识字</span></div>
        <template v-if="report.newWords.length">
          <div class="chip-row">
            <span v-for="w in report.newWords" :key="w.id" class="chip" :class="{ sel: w.mastered }">{{ w.word }}</span>
          </div>
          <div class="wk-line dim">深色 = 已掌握（{{ report.newWords.filter(w => w.mastered).length }} 个）</div>
        </template>
        <div v-else class="empty">这周没有新学字词</div>
      </div>
    </div>

    <!-- 右：餐桌 + 里程碑 + 健康 -->
    <div class="col">
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="bowl" :size="16" />餐桌</span><span class="more">{{ report.mealCount }} 餐</span></div>
        <template v-if="report.firstTastes.length">
          <div class="wk-line">⭐ 第一次吃：{{ report.firstTastes.join('、') }}</div>
        </template>
        <div v-else-if="report.mealCount" class="wk-line dim">平平淡淡的一周，没有尝新</div>
        <div v-else class="empty">这周没有餐桌记录</div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="flag" :size="16" />里程碑</span></div>
        <template v-if="report.milestones.length">
          <div v-for="m in report.milestones" :key="m.id" class="wk-line">
            <span class="wk-date">{{ m.date.slice(5) }}</span>{{ m.title }}
          </div>
        </template>
        <div v-else class="empty">这周没有里程碑</div>
      </div>

      <div class="card" v-if="report.healths.length || report.medUses || report.illnesses.length">
        <div class="card-title"><span class="ct-left"><Icon name="heart-pulse" :size="16" />健康</span></div>
        <div v-for="(i, k) in report.illnesses" :key="'ill' + k" class="wk-line">
          🤒 {{ i.symptoms.join('、') || '不舒服' }} · {{ i.ended ? `${i.days} 天好了` : `已经第 ${i.days} 天` }}<template v-if="i.maxTemp"> · 最高 {{ i.maxTemp.toFixed(1) }}℃</template>
        </div>
        <div v-for="h in report.healths" :key="h.id" class="wk-line">
          <span class="wk-date">{{ h.date.slice(5) }}</span>
          <span class="badge badge-info">{{ h.kind }}</span> {{ h.title }}
        </div>
        <div v-if="report.medUses" class="wk-line dim">用药 {{ report.medUses }} 次</div>
      </div>
    </div>
  </div>

  <!-- 导出 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="share" :size="16" />发给家人</span>
      <button class="mini-btn" @click="copyText"><Icon name="copy" :size="13" />{{ copied ? '已复制 ✓' : '复制周报文本' }}</button>
    </div>
    <pre class="wk-export">{{ exportText }}</pre>
  </div>

  <!-- 分享图 -->
  <div v-if="poster.show" class="drawer-mask" @click="poster.show = false">
    <div class="lightbox poster-sheet" @click.stop>
      <div class="ps-head"><b>本周分享图</b><button class="mini-btn" @click="poster.show = false">关闭</button></div>
      <div v-if="poster.loading" class="ps-loading">正在画分享图…</div>
      <template v-else>
        <img :src="poster.url" class="ps-img" />
        <div class="ps-actions">
          <button class="btn-primary" @click="savePoster"><Icon name="download" :size="15" />保存图片</button>
          <button class="mini-btn ghost" @click="copyPoster">{{ poster.copied ? '已复制 ✓' : '复制图片' }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import Icon from '../components/Icon.vue'
import RainbowPlate from '../components/RainbowPlate.vue'
import { store, rangeReport, babyDayOfLife, MOODS, getDiary, diaryDate, dayFoodGroups } from '../store.js'
import { dayLines } from '../utils/diaryText.js'
import { renderWeeklyPoster } from '../utils/monthCard.js'

const emit = defineEmits(['go'])

const weekOffset = ref(0) // 0 = 本周，-1 = 上一周
const copied = ref(false)

function p2(n) { return String(n).padStart(2, '0') }
function fmt(d) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }

// 指定偏移周的起止（周一 ~ 周日）
const weekRange = computed(() => {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7 // 周一 = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + weekOffset.value * 7)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return { start: fmt(monday), end: fmt(sunday) }
})
const weekLabel = computed(() => `${weekRange.value.start.slice(5).replace('-', '/')} ~ ${weekRange.value.end.slice(5).replace('-', '/')}`)

const report = computed(() => rangeReport(weekRange.value.start, weekRange.value.end))

const highlights = computed(() => {
  const r = report.value
  const list = []
  for (const m of r.milestones.filter(m => m.source !== '餐桌')) {
    list.push({ icon: 'flag', text: `达成里程碑「${m.title}」` })
  }
  if (r.firstTastes.length) list.push({ icon: 'bowl', text: `第一次吃 ${r.firstTastes.join('、')}` })
  if (r.topBook) list.push({ icon: 'library', text: `最爱《${r.topBook.title}》，读了 ${r.topBook.count} 次` })
  if (r.readMinutes >= 60) list.push({ icon: 'clock', text: `本周阅读 ${r.readMinutes} 分钟，真棒` })
  const mastered = r.newWords.filter(w => w.mastered).length
  if (mastered >= 3) list.push({ icon: 'sparkles', text: `掌握了 ${mastered} 个新字词` })
  return list.slice(0, 4)
})

const exportText = computed(() => {
  const r = report.value
  const name = store.settings.childName || '宝宝'
  const day = babyDayOfLife(weekRange.value.end)
  const lines = [`📜 ${name}的成长周报（${weekRange.value.start} ~ ${weekRange.value.end}${day ? `，出生第 ${day - 6}~${day} 天` : ''}）`, '']
  if (r.readCount) lines.push(`📚 阅读：${r.readCount} 次共 ${r.readMinutes} 分钟，${r.readDays} 天有阅读${r.topBook ? `，最爱《${r.topBook.title}》` : ''}`)
  const quotes = r.newWords.filter(w => w.funny)
  if (quotes.length) lines.push(`✨ 童言稚语：${quotes.map(w => `“${w.word}”`).join('、')}`)
  if (r.newWords.length) lines.push(`🗣 新词：${r.newWords.length} 个（${r.newWords.slice(0, 10).map(w => w.word).join(' ')}${r.newWords.length > 10 ? '…' : ''}）`)
  if (r.mealCount) lines.push(`🍚 餐桌：记了 ${r.mealCount} 餐${r.firstTastes.length ? `，第一次吃 ${r.firstTastes.join('、')}` : ''}`)
  if (r.playCount) lines.push(`🧩 游戏：玩了 ${r.playCount} 次（${r.games.slice(0, 5).map(g => g.name + (g.count > 1 ? '×' + g.count : '')).join('、')}）`)
  for (const m of r.milestones) lines.push(`🏁 ${m.date.slice(5)} ${m.title}`)
  for (const i of r.illnesses) lines.push(`🤒 生病：${i.symptoms.join('、') || '不舒服'}，${i.ended ? `${i.days} 天好了` : `已经第 ${i.days} 天`}${i.maxTemp ? `，最高 ${i.maxTemp.toFixed(1)}℃` : ''}`)
  if (r.healths.length) lines.push(`❤️ 健康：${r.healths.map(h => h.kind + '·' + h.title).join('；')}`)
  if (r.medUses) lines.push(`💊 用药 ${r.medUses} 次`)
  if (lines.length <= 2) lines.push('这周还没有记录，下周加油～')
  lines.push('', '—— 来自城堡日记')
  return lines.join('\n')
})

function shiftWeek(d) { weekOffset.value += d }

// 7 天的日记摘要（周一到周日）
const WEEK_CN = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const diaryDays = computed(() => {
  const start = new Date(weekRange.value.start + 'T00:00:00')
  return WEEK_CN.map((week, i) => {
    const date = fmt(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
    const e = dayLines(date)
    const diary = getDiary(date)
    const text = e.lines.filter(l => l.key !== 'mood').map(l => l.tokens.map(t => t.v).join('')).join(' ') + (diary?.text ? ` ${diary.text}` : '')
    return {
      date, week, text: text.trim(),
      mood: MOODS.find(m => m.key === diary?.mood) || null,
      photos: e.photos.filter(p => p.imageUrl),
      groups: dayFoodGroups(date),
      mealCount: store.meals.filter(m => m.date === date).length,
    }
  })
})
function openDay(date) {
  diaryDate.value = date
  emit('go', 'diary')
}

// 童言稚语：这周标了金句的话
const weekQuotes = computed(() =>
  store.words.filter(w => w.funny && w.date >= weekRange.value.start && w.date <= weekRange.value.end)
)

// 分享图
const poster = reactive({ show: false, loading: false, url: '', copied: false })
async function makePoster() {
  poster.show = true
  poster.loading = true
  poster.copied = false
  try {
    poster.url = await renderWeeklyPoster(weekRange.value.start, weekRange.value.end, report.value, diaryDays.value)
  } finally {
    poster.loading = false
  }
}
function savePoster() {
  const a = document.createElement('a')
  a.href = poster.url
  a.download = `成长周报-${weekRange.value.start.replaceAll('-', '')}.png`
  a.click()
}
async function copyPoster() {
  try {
    const blob = await (await fetch(poster.url)).blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    poster.copied = true
  } catch { alert('复制图片没成功，用「保存图片」吧') }
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(exportText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // 剪贴板 API 不可用时降级选中
    const el = document.querySelector('.wk-export')
    if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r) }
  }
}
</script>

<style scoped>
.quote-card { border: 1px solid rgba(224, 166, 59, .4); background: rgba(255, 247, 224, .55); }
.wq-item { display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px dashed rgba(224, 166, 59, .35); }
.wq-item:last-child { border-bottom: none; }
.wq-text { font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 18px; color: #6b4a00; flex: 1; }
.wq-date { font-size: 12px; color: var(--ink-3); flex: none; }
.poster-sheet { max-width: 520px; }
.ps-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 15px; }
.ps-loading { padding: 60px 0; text-align: center; color: var(--ink-2); }
.ps-img { width: 100%; border-radius: 8px; box-shadow: 0 4px 18px rgba(150, 100, 40, .2); display: block; }
.ps-actions { display: flex; gap: 10px; justify-content: center; margin-top: 10px; }
.wk-plates { display: flex; justify-content: space-between; gap: 4px; margin-bottom: 10px; padding: 0 4px; }
.wk-plate { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; color: var(--ink-3); }
.wk-plate.none { opacity: .45; }
.wk-day { display: flex; gap: 12px; padding: 9px 0; border-top: 1px dashed var(--line); }
.wk-day.empty { opacity: .6; }
.wkd-date { width: 64px; flex: none; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
.wkd-date b { font-size: 13px; }
.wkd-date span { font-size: 11px; color: var(--ink-3); }
.wkd-date:hover b { color: var(--brand-deep); }
.wkd-mood { font-style: normal; font-size: 10px; color: #fff; border-radius: 999px; padding: 0 6px; align-self: flex-start; }
.wkd-body { flex: 1; min-width: 0; }
.wkd-text { font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 15px; line-height: 1.75; color: #4a3520; }
.wkd-none { font-size: 12px; color: var(--ink-3); }
.wkd-photos { display: flex; gap: 6px; margin-top: 6px; }
.wkd-photos img { width: 64px; height: 64px; object-fit: cover; border-radius: 6px; cursor: pointer; }
</style>
