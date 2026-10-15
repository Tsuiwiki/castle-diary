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
        <button class="mini-btn" @click="openShare"><Icon name="image" :size="13" />生成分享图</button>
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
        <div class="card-title"><span class="ct-left"><Icon name="heart-pulse" :size="16" />这周身体</span></div>
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
      <button class="mini-btn" @click="openShare"><Icon name="copy" :size="13" />复制周报文本</button>
    </div>
    <div class="sub" style="margin:0">点按钮选好想分享的内容，生成预览后再复制文本或保存图片</div>
  </div>

  <!-- 页底出口：日历找某天、年度看全年 -->
  <div class="wk-exit">
    想找某一天 → <a @click="$emit('go', 'calendar')">日记日历</a>　·　想看全年 → <a @click="$emit('go', 'year')">年度回顾</a>
  </div>

  <!-- 周报分享预览：四项开关 → 同一份筛选数据 → 图与文本 -->
  <div v-if="share.show" class="drawer-mask" @click="closeShare">
    <div class="lightbox share-sheet" @click.stop>
      <div class="ps-head"><b>周报分享预览</b><span class="ps-week">{{ weekRange.start }} ~ {{ weekRange.end }}</span><button class="mini-btn" @click="closeShare">关闭</button></div>

      <div class="sh-opts">
        <div
          v-for="opt in SHARE_OPTION_LABELS" :key="opt.key"
          class="sh-opt" :class="{ on: share.options[opt.key], health: opt.health }"
          @click="share.options[opt.key] = !share.options[opt.key]; share.stale = true"
        >
          <span class="sh-toggle">{{ share.options[opt.key] ? '✓' : '' }}</span>
          <span class="sh-body">
            <b>{{ opt.label }}</b>
            <i>{{ opt.desc }}</i>
          </span>
        </div>
        <div v-if="share.options.health" class="sh-warn">你已选择包含健康与生病信息，请确认后再分享</div>
        <div v-else class="sh-note">默认不包含健康与生病信息</div>
      </div>

      <div class="sh-summary">最终将分享：{{ shareSummary }}</div>

      <button class="btn-primary sh-gen" :disabled="share.loading" @click="generatePreview">
        {{ share.loading ? '正在生成预览…' : (share.url || share.text ? '更新预览' : '生成预览') }}
      </button>
      <div v-if="share.error" class="sh-error">{{ share.error }}</div>

      <template v-if="!share.stale && (share.url || share.text)">
        <div class="sh-tabs">
          <span class="sh-tab" :class="{ sel: share.tab === 'img' }" @click="share.tab = 'img'">分享图预览</span>
          <span class="sh-tab" :class="{ sel: share.tab === 'text' }" @click="share.tab = 'text'">文本预览</span>
        </div>
        <img v-if="share.tab === 'img'" :src="share.url" class="ps-img" />
        <pre v-else class="wk-export sh-text">{{ share.text }}</pre>
        <div class="ps-actions">
          <button class="btn-primary" @click="savePoster"><Icon name="download" :size="15" />保存图片</button>
          <button class="mini-btn ghost" @click="copyPoster">{{ share.copiedImg ? '已复制 ✓' : (isApp() ? '分享图片' : '复制图片') }}</button>
          <button class="mini-btn ghost" @click="copyShareText">{{ share.copiedText ? '已复制 ✓' : '复制文本' }}</button>
        </div>
      </template>
      <div v-else-if="share.stale && share.url" class="sh-stale">选项改过了，点「更新预览」再复制或保存</div>
    </div>
  </div>
</template>

<script setup>
import { isApp, saveFile, copyOrShareImage } from '../utils/platform.js'
import { ref, reactive, computed } from 'vue'
import Icon from '../components/Icon.vue'
import RainbowPlate from '../components/RainbowPlate.vue'
import { store, rangeReport, babyDayOfLife, MOODS, getDiary, diaryDate, dayFoodGroups } from '../store.js'
import { dayLines } from '../utils/diaryText.js'
import { renderWeeklyPoster } from '../utils/monthCard.js'
import { DEFAULT_WEEKLY_SHARE_OPTIONS, SHARE_OPTION_LABELS, buildWeeklySharePayload, buildWeeklyShareText } from '../utils/weeklyShare.js'

const emit = defineEmits(['go'])

const weekOffset = ref(0) // 0 = 本周，-1 = 上一周

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
  // 里程碑口径与月历一致：排除餐桌/游戏自动产生的条目
  for (const m of r.milestones.filter(m => !['餐桌', '游戏'].includes(m.source))) {
    list.push({ icon: 'flag', text: `达成里程碑「${m.title}」` })
  }
  if (r.firstTastes.length) list.push({ icon: 'bowl', text: `第一次吃 ${r.firstTastes.join('、')}` })
  if (r.topBook) list.push({ icon: 'library', text: `最爱《${r.topBook.title}》，读了 ${r.topBook.count} 次` })
  if (r.readMinutes >= 60) list.push({ icon: 'clock', text: `本周阅读 ${r.readMinutes} 分钟，真棒` })
  const mastered = r.newWords.filter(w => w.mastered).length
  if (mastered >= 3) list.push({ icon: 'sparkles', text: `掌握了 ${mastered} 个新字词` })
  return list.slice(0, 4)
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

// ---------- 分享：统一预览流程（每次打开都恢复默认：健康默认不包含） ----------
const share = reactive({
  show: false, options: { ...DEFAULT_WEEKLY_SHARE_OPTIONS },
  loading: false, stale: true, url: '', text: '', tab: 'img',
  copiedImg: false, copiedText: false, error: '',
})
function openShare() {
  share.show = true
  share.options = { ...DEFAULT_WEEKLY_SHARE_OPTIONS }
  share.loading = false
  share.stale = true
  share.url = ''
  share.text = ''
  share.tab = 'img'
  share.copiedImg = false
  share.copiedText = false
  share.error = ''
}
function closeShare() { share.show = false }
const shareSummary = computed(() => {
  const parts = ['周报日期与统计']
  if (share.options.booksGames) parts.push('绘本与游戏')
  if (share.options.quotes) parts.push('童言稚语')
  if (share.options.photos) parts.push('成长照片')
  if (share.options.health) parts.push('健康与生病')
  return parts.join('、')
})
async function generatePreview() {
  share.loading = true
  share.error = ''
  share.copiedImg = false
  share.copiedText = false
  try {
    const payload = buildWeeklySharePayload(weekRange.value.start, weekRange.value.end, share.options)
    share.text = buildWeeklyShareText(payload)
    share.url = await renderWeeklyPoster(payload)
    share.stale = false
  } catch (e) {
    share.error = '生成预览失败：' + (e?.message || e) + '。开关还都在，可以再试一次'
  } finally {
    share.loading = false
  }
}
const posterName = () => `成长周报-${weekRange.value.start.replaceAll('-', '')}.png`
async function savePoster() {
  try { await saveFile(posterName(), share.url, 'image/png') } catch { alert('图片没保存成功，再试一次') }
}
async function copyPoster() {
  try {
    const blob = await (await fetch(share.url)).blob()
    if ((await copyOrShareImage(posterName(), blob)) === 'copied') share.copiedImg = true
  } catch { alert('复制图片没成功，用「保存图片」吧') }
}
async function copyShareText() {
  try {
    await navigator.clipboard.writeText(share.text)
    share.copiedText = true
    setTimeout(() => (share.copiedText = false), 1500)
  } catch {
    // 剪贴板不可用时降级为全选文本，手动复制
    const el = document.querySelector('.sh-text')
    if (el) {
      const r = document.createRange()
      r.selectNodeContents(el)
      const s = getSelection()
      s.removeAllRanges()
      s.addRange(r)
      share.tab = 'text'
      alert('自动复制没成功，已帮你全选文本，按 Ctrl+C 复制')
    }
  }
}
</script>

<style scoped>
.wk-exit { text-align: center; font-size: 12.5px; color: var(--ink-2); margin: 14px 0 4px; }
.wk-exit a { color: var(--brand-deep); text-decoration: underline; cursor: pointer; }
.share-sheet { max-width: 560px; }
.ps-week { font-size: 12px; color: var(--ink-2); margin-left: 10px; margin-right: auto; }
.sh-opts { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.sh-opt {
  display: flex; align-items: flex-start; gap: 10px; cursor: pointer;
  border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px;
  background: #fffdf9;
}
.sh-opt.on { border-color: rgba(240, 147, 75, .6); background: rgba(240, 147, 75, .08); }
.sh-opt.health.on { border-color: rgba(192, 57, 43, .5); background: rgba(192, 57, 43, .06); }
.sh-toggle {
  width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--line);
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; color: #fff; margin-top: 1px;
}
.sh-opt.on .sh-toggle { background: var(--brand); border-color: var(--brand); }
.sh-opt.health.on .sh-toggle { background: #c0392b; border-color: #c0392b; }
.sh-body b { font-size: 13px; display: block; }
.sh-body i { font-style: normal; font-size: 11.5px; color: var(--ink-2); }
.sh-warn { font-size: 12px; color: #c0392b; font-weight: 600; padding: 2px 4px; }
.sh-note { font-size: 12px; color: var(--ink-3); padding: 2px 4px; }
.sh-summary { font-size: 12.5px; color: var(--ink-2); background: #f6f1e7; border-radius: 8px; padding: 6px 10px; margin: 6px 0 10px; }
.sh-gen { width: 100%; margin-bottom: 8px; }
.sh-error { font-size: 12px; color: #c0392b; margin: 6px 0; }
.sh-stale { font-size: 12px; color: #b4743a; text-align: center; padding: 10px 0; }
.sh-tabs { display: flex; gap: 6px; margin-bottom: 8px; }
.sh-tab { font-size: 12px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--line); cursor: pointer; color: var(--ink-2); }
.sh-tab.sel { background: var(--brand); color: #fff; border-color: transparent; }
.sh-text { max-height: 260px; overflow: auto; }
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
