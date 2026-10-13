<template>
  <div class="ill-body">
    <!-- 体温曲线 -->
    <div class="ill-chart">
      <div class="ib-title">体温</div>
      <svg v-if="ill.temps.length" :viewBox="`0 0 ${W} ${H}`" class="temp-svg">
        <line v-for="rv in REFS" :key="rv" :x1="PADL" :x2="W - 8" :y1="ty(rv)" :y2="ty(rv)" class="ref-line" />
        <text v-for="rv in REFS" :key="'t' + rv" :x="PADL - 4" :y="ty(rv) + 3" class="ref-txt">{{ rv }}</text>
        <template v-for="(d, i) in chartDays(ill)" :key="d">
          <text :x="dx(ill, i)" :y="H - 4" class="day-txt">{{ d.slice(5).replace('-', '/') }}</text>
        </template>
        <polyline :points="tempPoints(ill)" class="temp-line" />
        <circle
          v-for="t in ill.temps" :key="t.time" r="3"
          :cx="tx(ill, t.time)" :cy="ty(t.value)"
          :class="t.value >= 38.5 ? 'pt-hot' : t.value >= 37.3 ? 'pt-warm' : 'pt-ok'"
        ><title>{{ t.time.replace('T', ' ') }}  {{ t.value.toFixed(1) }}℃</title></circle>
      </svg>
      <div v-else class="ib-empty">没记体温</div>
      <div v-if="ill.temps.length" class="ib-sub">最高 {{ maxTemp(ill).toFixed(1) }}℃ · 共量了 {{ ill.temps.length }} 次</div>
    </div>

    <div>
      <!-- 最让人心疼 / 坚强的一个瞬间 -->
      <div class="ill-moment">
        <div class="ib-title">最让人心疼（或坚强）的一个瞬间</div>
        <input
          class="moment-input"
          :value="ill.moment || ''"
          placeholder="比如：烧得小脸通红，还是冲妈妈笑了笑"
          @change="e => setIllnessMoment(ill.id, e.target.value)"
        />
        <div class="moment-sub">写在病好的那天日记里，几年后回看，这是比体温数字更动人的东西</div>
      </div>
      <!-- 每一天（只列真正有记录的日期） -->
      <div class="ill-days">
        <div class="ib-title">每一天</div>
        <div v-if="!dayRows(ill).length" class="ib-empty">这次生病还没记任何东西，去日记里点「不舒服」接着记</div>
        <div v-for="d in dayRows(ill)" :key="d.date" class="day-row">
          <span class="dr-date">{{ d.date.slice(5).replace('-', '/') }}<i>第 {{ d.n }} 天</i></span>
          <span class="dr-body">
            <span v-if="d.max" :class="['dr-temp', d.max >= 38.5 ? 'hot' : d.max >= 37.3 ? 'warm' : '']">{{ d.max.toFixed(1) }}℃</span>
            <span v-for="m in d.meds" :key="m.name" class="dr-med">💊 {{ m.name }}<template v-if="m.n > 1"> ×{{ m.n }}</template></span>
            <span v-if="d.visit" class="dr-visit">🏥 去医院</span>
            <span v-if="d.note" class="dr-note">{{ d.note }}</span>
            <span v-if="d.end" class="dr-end">🎉 好了</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 生病卡详情：体温曲线 + 瞬间 + 按日事件流。
// 「每一天」只聚合真正有记录的日期（渲染层 view model，不落库）；体温曲线仍需要连续日期轴。
import { todayStr, illnessMeds, setIllnessMoment } from '../store.js'

const props = defineProps({ ill: { type: Object, required: true } })
const today = todayStr()
const p2 = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

// 「第几天」由日期偏移算，不能用数组下标（跳过空白天会错位）
function dayIndex(ill, date) {
  return Math.round((new Date(date + 'T00:00:00') - new Date(ill.start + 'T00:00:00')) / 86400000) + 1
}

// 只产出有记录的日期节点；结束日即使没记录也保留「🎉 好了」
function dayRows(ill) {
  const meds = illnessMeds(ill.id)
  const dates = new Set([
    ...ill.temps.map(t => t.time.slice(0, 10)),
    ...ill.notes.map(n => n.date),
    ...ill.visits.map(v => v.date),
    ...meds.map(m => m.time.slice(0, 10)),
    ...(ill.end ? [ill.end] : []),
  ])
  return [...dates].sort().map(date => {
    const temps = ill.temps.filter(t => t.time.slice(0, 10) === date)
    const mc = {}
    for (const m of meds) if (m.time.slice(0, 10) === date) mc[m.name] = (mc[m.name] || 0) + 1
    return {
      date,
      n: dayIndex(ill, date),
      max: temps.length ? Math.max(...temps.map(t => t.value)) : 0,
      meds: Object.entries(mc).map(([name, n]) => ({ name, n })),
      visit: ill.visits.some(v => v.date === date),
      note: ill.notes.find(n => n.date === date)?.text || '',
      end: ill.end === date,
    }
  }).reverse() // 最近的一天在最上
}

const maxTemp = ill => ill.temps.reduce((a, t) => Math.max(a, t.value), 0)

// ---------- 体温曲线（X 轴用连续日期序列） ----------
const W = 360, H = 150, PADL = 30, PADT = 10, PADB = 20
const REFS = [37.3, 38.5]
const LO = 35.5, HI = 40.5
const ty = v => PADT + (HI - Math.min(HI, Math.max(LO, v))) / (HI - LO) * (H - PADT - PADB)
function daysOf(ill) {
  const out = []
  const end = ill.end || today
  const d = new Date(ill.start + 'T00:00:00')
  while (fmt(d) <= end && out.length < 60) {
    out.push(fmt(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}
const chartDays = ill => daysOf(ill)
function tx(ill, time) {
  const days = daysOf(ill)
  const t0 = new Date(days[0] + 'T00:00:00').getTime()
  const t1 = new Date(days[days.length - 1] + 'T23:59:00').getTime()
  const t = new Date(time).getTime()
  return PADL + (t - t0) / Math.max(1, t1 - t0) * (W - PADL - 12)
}
function dx(ill, i) {
  const n = daysOf(ill).length
  return PADL + (i + 0.5) / n * (W - PADL - 12) - 12
}
const tempPoints = ill => ill.temps.map(t => `${tx(ill, t.time).toFixed(1)},${ty(t.value).toFixed(1)}`).join(' ')
</script>

<style scoped>
.ill-body { display: grid; grid-template-columns: minmax(0, 380px) minmax(0, 1fr); gap: 18px; margin-top: 12px; }
.ill-moment { margin-bottom: 14px; }
.moment-input {
  width: 100%; box-sizing: border-box; border: 1px dashed rgba(240, 147, 75, .5); border-radius: 10px;
  padding: 8px 11px; font-size: 14px; font-family: "KaiTi", "STKaiti", "Kaiti SC", serif;
  background: #fffdf6; color: #4a3520; outline: none;
}
.moment-input:focus { border-color: var(--brand); border-style: solid; }
.moment-sub { font-size: 11px; color: var(--ink-3); margin-top: 4px; }
@media (max-width: 900px) { .ill-body { grid-template-columns: 1fr; } }
.ib-title { font-size: 12px; font-weight: 700; color: var(--ink-2); margin-bottom: 6px; }
.ib-empty { font-size: 12px; color: var(--ink-3); padding: 12px 0; }
.ib-sub { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
.temp-svg { width: 100%; height: auto; background: #fffdf9; border: 1px solid var(--line); border-radius: 10px; }
.ref-line { stroke: rgba(224, 85, 85, .35); stroke-dasharray: 4 3; stroke-width: 1; }
.ref-txt { font-size: 9px; fill: #c0392b; text-anchor: end; }
.day-txt { font-size: 9px; fill: var(--ink-3); }
.temp-line { fill: none; stroke: #e5675a; stroke-width: 1.8; stroke-linejoin: round; }
.pt-hot { fill: #d0463c; }
.pt-warm { fill: #f0934b; }
.pt-ok { fill: #2aa082; }
.day-row { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px dashed var(--line); font-size: 13px; }
.day-row:last-child { border-bottom: none; }
.dr-date { width: 64px; flex: none; font-weight: 700; display: flex; flex-direction: column; line-height: 1.3; }
.dr-date i { font-style: normal; font-size: 11px; font-weight: 400; color: var(--ink-3); }
.dr-body { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.dr-temp { border-radius: 999px; padding: 0 8px; background: #eef6f2; color: #1f7f6b; font-variant-numeric: tabular-nums; }
.dr-temp.warm { background: #fff1e0; color: #b0601c; }
.dr-temp.hot { background: #fde6e2; color: #c0392b; }
.dr-med, .dr-visit { font-size: 12px; color: var(--ink); }
.dr-note { color: var(--ink-2); }
.dr-end { color: #1f7f6b; font-weight: 700; }
</style>
