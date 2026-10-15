<template>
  <Teleport to="body">
    <div class="gb-root">
      <!-- 工具栏（打印时隐藏） -->
      <div class="gb-toolbar">
        <div class="gb-tb-title">
          <b>{{ name }}的 {{ year }} · 成长书</b>
          <span>{{ months.length ? `共 ${months.length} 个月、${dayCount} 天的记录` : '这一年还没有记录' }}</span>
        </div>
        <div class="gb-tb-actions">
          <button class="mini-btn ghost" @click="$emit('close')">关闭</button>
          <button class="btn-primary" :disabled="!months.length" @click="doPrint">打印 / 保存为 PDF</button>
        </div>
      </div>
      <div class="gb-tip">{{ isApp() ? '在弹出的打印页面里，打印机选「另存为 PDF」就能得到 PDF 文件，可以存到手机或发给家人。' : '在弹出的打印窗口里，"目标打印机"选「另存为 PDF」就能得到 PDF 文件；勾选"背景图形"颜色会更好看。' }}全程在本机生成，不上传任何内容。</div>

      <div class="gb-preface-edit">
        <label>写在前面（可选，会印在第二页）</label>
        <textarea v-model="preface" rows="3" :placeholder="`比如：${name}，这是你来到这个世界的第 ${yearIndex} 年……`" @change="savePreface"></textarea>
      </div>

      <div class="gb-book">
        <!-- 封面 -->
        <section class="gb-page gb-cover">
          <div class="gb-cover-inner">
            <div class="gb-cover-year">{{ year }}</div>
            <h1>{{ name }}的这一年</h1>
            <div v-if="ageRange" class="gb-cover-age">{{ ageRange }}</div>
            <div class="gb-cover-castle"><CastleSvg :width="360" :date="castleDate" /></div>
            <div class="gb-cover-foot">城堡日记 · 家庭成长书</div>
          </div>
        </section>

        <!-- 序言 -->
        <section v-if="preface.trim()" class="gb-page gb-preface">
          <h2>写在前面</h2>
          <p v-for="(p, i) in preface.trim().split(/\n+/)" :key="i">{{ p }}</p>
        </section>

        <!-- 年度概览 -->
        <section class="gb-page gb-overview">
          <h2>这一年</h2>
          <p class="gb-summary">记了 <b>{{ dayCount }}</b> 天 · 读了 <b>{{ report.bookTitles.length }}</b> 本书 · 会说 <b>{{ report.newWords.length }}</b> 个新词 · 尝了 <b>{{ report.firstTastes.length }}</b> 种新食物 · <b>{{ milestones.length }}</b> 个成长节点</p>
          <template v-if="milestones.length">
            <h3>重要的第一次</h3>
            <div v-for="m in milestones" :key="m.id" class="gb-ms">
              <span class="gb-ms-date">{{ cnDate(m.date) }}</span>
              <span class="gb-ms-dot"></span>
              <span class="gb-ms-title">{{ m.title }}</span>
            </div>
          </template>
        </section>

        <!-- 每月一章 -->
        <section v-for="mo in months" :key="mo.month" class="gb-page gb-month">
          <div class="gb-month-head">
            <span class="gb-month-no">{{ mo.month }}</span>
            <span class="gb-month-unit">月</span>
            <span class="gb-month-sub">记了 {{ mo.days.length }} 天</span>
          </div>
          <div v-if="mo.photos.length" class="gb-photos" :class="'n' + Math.min(mo.photos.length, 4)">
            <figure v-for="p in mo.photos" :key="p.id">
              <img :src="p.imageUrl" />
              <figcaption>{{ shortDate(p.date) }}<template v-if="p.note"> · {{ p.note }}</template></figcaption>
            </figure>
          </div>
          <article v-for="d in mo.days" :key="d.date" class="gb-day">
            <div class="gb-day-head">
              <b>{{ shortDate(d.date) }}</b>
              <span class="gb-wk">{{ weekday(d.date) }}</span>
              <span v-if="d.mood" class="gb-mood" :style="{ background: d.mood.color }">{{ d.mood.key }}</span>
            </div>
            <p v-for="(l, i) in d.lines" :key="i" class="gb-line">{{ l }}</p>
            <blockquote v-if="d.text" class="gb-words">{{ d.text }}<span v-if="d.by" class="gb-by">—— {{ d.by }}</span></blockquote>
          </article>
        </section>

        <!-- 书与词 -->
        <section v-if="books.length || words.length" class="gb-page gb-reading">
          <template v-if="books.length">
            <h2>这一年读过的书</h2>
            <div class="gb-books">
              <div v-for="b in books" :key="b.title" class="gb-book-item">《{{ b.title }}》<span>{{ b.count }} 次</span></div>
            </div>
          </template>
          <template v-if="quotes.length">
            <h2>童言稚语</h2>
            <blockquote v-for="w in quotes" :key="w.id" class="gb-quote">“{{ w.word }}”<span>{{ shortDate(w.date) }}</span></blockquote>
          </template>
          <template v-if="words.length">
            <h2>会说的词</h2>
            <p class="gb-words-cloud">{{ words.map(w => w.word).join('　') }}</p>
          </template>
        </section>

        <!-- 封底 -->
        <section class="gb-page gb-back">
          <div class="gb-back-inner">
            <p>这一年，慢慢长大。</p>
            <span>{{ todayStr() }} 印于城堡日记</span>
          </div>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { isApp, printPage } from '../utils/platform.js'
// 年度成长书：纯本地拼版，借浏览器「打印 → 另存为 PDF」输出。不引入 PDF 库、不上传任何内容。
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CastleSvg from './CastleSvg.vue'
import { store, rangeReport, MOODS, getDiary, todayStr, babyAgeText, updateSettings } from '../store.js'
import { dayLines, monthIndex } from '../utils/diaryText.js'

const props = defineProps({ year: { type: Number, required: true } })
const emit = defineEmits(['close'])

const p2 = n => String(n).padStart(2, '0')
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const name = computed(() => store.settings.childName || '宝宝')
const yStart = computed(() => `${props.year}-01-01`)
const yEnd = computed(() => `${props.year}-12-31`)
const report = computed(() => rangeReport(yStart.value, yEnd.value))
const castleDate = computed(() => (todayStr().slice(0, 4) === String(props.year) ? todayStr() : yEnd.value))

const shortDate = d => `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`
const cnDate = d => shortDate(d)
const weekday = d => WEEK[new Date(d + 'T00:00:00').getDay()]

// 封面年龄段：这一年从几岁几个月到几岁几个月（只算已出生的部分）
const ageRange = computed(() => {
  const bd = store.settings.birthday
  if (!bd) return ''
  const from = bd > yStart.value ? bd : yStart.value
  const to = castleDate.value
  if (to < bd) return ''
  const a = babyAgeText(from)
  const b = babyAgeText(to)
  return a && b && a !== b ? `${a} → ${b}` : b
})
const yearIndex = computed(() => {
  const bd = store.settings.birthday
  return bd ? Math.max(1, props.year - Number(bd.slice(0, 4)) + 1) : 1
})

// 里程碑：与月历同口径，排除餐桌/游戏自动条目
const milestones = computed(() => report.value.milestones
  .filter(m => !['餐桌', '游戏'].includes(m.source))
  .slice().sort((a, b) => a.date.localeCompare(b.date)))

// 每月一章：只收有内容的天
const months = computed(() => {
  const out = []
  const msPhotoIds = new Set(store.milestones.map(m => m.photoId).filter(Boolean))
  for (let m = 1; m <= 12; m++) {
    const ym = `${props.year}-${p2(m)}`
    const dates = Object.keys(monthIndex(ym)).sort()
    const days = []
    for (const date of dates) {
      const { lines, diary } = dayLines(date)
      const text = (diary?.text || '').trim()
      const ls = lines.filter(l => l.key !== 'mood').map(l => l.tokens.map(t => t.v).join('')).filter(Boolean)
      if (!ls.length && !text && !diary?.mood) continue
      days.push({
        date, lines: ls, text, by: diary?.by || '',
        mood: diary?.mood ? MOODS.find(x => x.key === diary.mood) : null,
      })
    }
    if (!days.length) continue
    // 每月最多 4 张照片：里程碑照片优先，其余按日期均匀挑
    const all = store.photos.filter(p => p.imageUrl && (p.date || '').slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date))
    const ms = all.filter(p => msPhotoIds.has(p.id))
    const rest = all.filter(p => !msPhotoIds.has(p.id))
    const pick = [...ms]
    const need = 4 - pick.length
    if (need > 0) {
      if (rest.length <= need) pick.push(...rest)
      else for (let i = 0; i < need; i++) pick.push(rest[Math.floor(i * rest.length / need)]) // 均匀取，不会重复
    }
    out.push({ month: m, days, photos: pick.slice(0, 4).sort((a, b) => a.date.localeCompare(b.date)) })
  }
  return out
})
const dayCount = computed(() => months.value.reduce((s, m) => s + m.days.length, 0))

// 书：这一年读过的，按次数
const books = computed(() => {
  const list = []
  for (const b of store.books) {
    const n = (b.reads || []).filter(r => (r.time || '').slice(0, 4) === String(props.year)).length
    if (n) list.push({ title: b.title, count: n })
  }
  return list.sort((a, b) => b.count - a.count)
})
const yearWords = computed(() => store.words.filter(w => (w.date || '').slice(0, 4) === String(props.year)).sort((a, b) => a.date.localeCompare(b.date)))
const quotes = computed(() => yearWords.value.filter(w => w.funny))
const words = computed(() => yearWords.value.filter(w => !w.funny))

// 序言：每年一段，存在设置里（随备份走）
const preface = ref((store.settings.bookPrefaces || {})[props.year] || '')
function savePreface() {
  updateSettings({ bookPrefaces: { ...(store.settings.bookPrefaces || {}), [props.year]: preface.value } })
}

function doPrint() {
  savePreface()
  document.body.classList.add('gb-printing')
  const prevTitle = document.title
  document.title = `${name.value}的${props.year}-成长书`
  const done = () => {
    if (!isApp()) document.body.classList.remove('gb-printing')
    document.title = prevTitle
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  // 等图片解码完再打印，避免照片空白
  const imgs = [...document.querySelectorAll('.gb-book img')]
  Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r }))))
    .then(() => printPage(document.title))
    .catch(e => { done(); alert('打印没有打开：' + (e?.message || e)) })
}

function onKey(e) { if (e.key === 'Escape') emit('close') }
onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
  if (isApp()) document.body.classList.add('gb-printing')
})
onBeforeUnmount(() => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); document.body.classList.remove('gb-printing') })
</script>

<style>
/* ---------- 屏幕预览 ---------- */
.gb-root { position: fixed; inset: 0; z-index: 120; overflow-y: auto; background: #e9e3d8; padding-bottom: 60px; }
.gb-toolbar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 24px; background: rgba(255, 252, 245, .96); border-bottom: 1px solid var(--line); }
.gb-tb-title b { font-size: 15px; display: block; }
.gb-tb-title span { font-size: 12px; color: var(--ink-2); }
.gb-tb-actions { display: flex; gap: 8px; align-items: center; }
.gb-tip { max-width: 210mm; margin: 14px auto 0; font-size: 12px; color: var(--ink-2); line-height: 1.7; padding: 0 8px; }
.gb-preface-edit { max-width: 210mm; margin: 10px auto 0; padding: 0 8px; }
.gb-preface-edit label { font-size: 12px; color: var(--ink-2); display: block; margin-bottom: 4px; }
.gb-preface-edit textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; font-size: 14px; font-family: "KaiTi", "STKaiti", serif; background: #fffdf8; resize: vertical; }

.gb-book { font-family: "Songti SC", "SimSun", "Noto Serif SC", serif; color: #3e2f22; }
.gb-page { box-sizing: border-box; width: 210mm; min-height: 297mm; margin: 18px auto; padding: 18mm 18mm 20mm; background: #fffdf8; box-shadow: 0 4px 18px rgba(90, 60, 30, .15); }
.gb-book h2 { font-size: 20px; margin: 0 0 12px; color: #8a4f1f; letter-spacing: 2px; }
.gb-book h3 { font-size: 15px; margin: 22px 0 10px; color: #8a4f1f; }

.gb-cover { display: flex; }
.gb-cover-inner { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px solid #e2c9a3; border-radius: 6px; padding: 20mm 10mm; }
.gb-cover-year { font-size: 64px; font-weight: 700; color: #e0a15c; letter-spacing: 6px; line-height: 1; }
.gb-cover h1 { font-size: 34px; margin: 14px 0 8px; letter-spacing: 4px; }
.gb-cover-age { font-size: 14px; color: #8a6d4f; }
.gb-cover-castle { margin: 28px 0; }
.gb-cover-foot { margin-top: auto; font-size: 12px; color: #a08668; letter-spacing: 3px; }

.gb-preface p { font-family: "KaiTi", "STKaiti", serif; font-size: 16px; line-height: 2.1; text-indent: 2em; margin: 0 0 10px; }
.gb-summary { font-size: 15px; line-height: 2; }
.gb-summary b { color: #c06a2a; font-size: 18px; padding: 0 2px; }
.gb-ms { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 14px; break-inside: avoid; }
.gb-ms-date { width: 72px; color: #8a6d4f; font-size: 13px; }
.gb-ms-dot { width: 8px; height: 8px; border-radius: 50%; background: #e0a15c; flex: none; }

.gb-month-head { display: flex; align-items: baseline; gap: 6px; border-bottom: 1px solid #ecd9bd; padding-bottom: 8px; margin-bottom: 14px; }
.gb-month-no { font-size: 46px; font-weight: 700; color: #e0a15c; line-height: 1; }
.gb-month-unit { font-size: 18px; color: #8a4f1f; }
.gb-month-sub { margin-left: auto; font-size: 12px; color: #a08668; }
.gb-photos { display: grid; gap: 8px; margin-bottom: 14px; }
.gb-photos.n1 { grid-template-columns: 1fr; }
.gb-photos.n2 { grid-template-columns: 1fr 1fr; }
.gb-photos.n3, .gb-photos.n4 { grid-template-columns: 1fr 1fr; }
.gb-photos figure { margin: 0; break-inside: avoid; }
.gb-photos img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 4px; display: block; }
.gb-photos.n1 img { aspect-ratio: 16 / 9; }
.gb-photos figcaption { font-size: 11px; color: #8a6d4f; margin-top: 3px; }

.gb-day { padding: 9px 0; border-bottom: 1px dashed #efe2cf; break-inside: avoid; }
.gb-day:last-child { border-bottom: none; }
.gb-day-head { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; font-size: 14px; }
.gb-wk { font-size: 12px; color: #a08668; }
.gb-mood { color: #fff; font-size: 11px; border-radius: 999px; padding: 0 8px; line-height: 18px; }
.gb-line { margin: 0; font-size: 13.5px; line-height: 1.85; }
.gb-words { margin: 6px 0 0; padding: 6px 12px; border-left: 3px solid #e8c79a; background: #fdf6ea; font-family: "KaiTi", "STKaiti", serif; font-size: 14.5px; line-height: 1.9; }
.gb-by { display: block; text-align: right; font-size: 12px; color: #8a6d4f; }

.gb-books { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; margin-bottom: 22px; }
.gb-book-item { font-size: 14px; display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ecd9bd; }
.gb-book-item span { font-size: 12px; color: #a08668; }
.gb-quote { margin: 0 0 8px; font-family: "KaiTi", "STKaiti", serif; font-size: 16px; display: flex; justify-content: space-between; }
.gb-quote span { font-size: 12px; color: #a08668; font-family: inherit; }
.gb-words-cloud { font-size: 15px; line-height: 2.2; letter-spacing: 1px; }

.gb-back { display: flex; }
.gb-back-inner { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.gb-back-inner p { font-family: "KaiTi", "STKaiti", serif; font-size: 22px; color: #8a4f1f; letter-spacing: 3px; }
.gb-back-inner span { font-size: 11px; color: #a08668; margin-top: 6px; }

@media (max-width: 860px) {
  .gb-page { width: auto; min-height: auto; margin: 12px; padding: 22px 18px; }
  .gb-tip, .gb-preface-edit { margin-left: 12px; margin-right: 12px; }
  .gb-toolbar { padding: 10px 12px; }
}

/* ---------- 打印：只留成长书 ---------- */
@page { size: A4; margin: 14mm 16mm; }
@media print {
  body.gb-printing > *:not(.gb-root) { display: none !important; }
  body.gb-printing { background: #fff !important; overflow: visible !important; }
  body.gb-printing .gb-root { position: static; overflow: visible; background: #fff; padding: 0; }
  body.gb-printing .gb-toolbar, body.gb-printing .gb-tip, body.gb-printing .gb-preface-edit { display: none !important; }
  /* 页边距交给 @page，跨页的长月份每一页都有边距 */
  body.gb-printing .gb-page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; background: transparent; break-after: page; }
  body.gb-printing .gb-cover, body.gb-printing .gb-back { min-height: calc(297mm - 28mm - 2px); }
  body.gb-printing .gb-book * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
