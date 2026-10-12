<template>
  <div class="view-head">
    <h2>生病记</h2>
    <div class="sub">一次生病一张卡：体温、吃的药、去没去医院、每天怎么样 · 平时在日记里点「不舒服」贴纸接着记</div>
  </div>

  <div class="stat-row">
    <div class="stat-box" :class="{ alert: ongoing.length }"><div class="num">{{ ongoing.length ? '第 ' + illnessDays(ongoing[0]) + ' 天' : '没有' }}</div><div class="lbl">正在生病</div></div>
    <div class="stat-box"><div class="num">{{ yearList.length }}</div><div class="lbl">今年生病次数</div></div>
    <div class="stat-box"><div class="num">{{ avgDays || '—' }}</div><div class="lbl">平均几天好（已好的）</div></div>
    <div class="stat-box"><div class="num top-name">{{ topSymptom || '—' }}</div><div class="lbl">最常见的症状</div></div>
  </div>

  <!-- 新开一张 -->
  <div class="card">
    <div class="card-title"><span class="ct-left"><Icon name="plus" :size="16" />补记一次生病</span><span class="more">日常更推荐在日记里点「不舒服」</span></div>
    <div class="chip-row">
      <span v-for="sy in SYMPTOMS" :key="sy" class="chip" :class="{ sel: form.symptoms.includes(sy) }" @click="toggle(form.symptoms, sy)">{{ sy }}</span>
    </div>
    <div class="inline-add">
      <input v-model.trim="form.other" placeholder="其他症状（可选）" style="flex:1.4" />
      <input v-model="form.start" type="date" :max="today" style="flex:1" title="哪天开始不舒服" />
      <button class="mini-btn" :disabled="!form.symptoms.length && !form.other" @click="create">开始记录</button>
    </div>
  </div>

  <div v-if="!store.illnesses.length" class="card"><div class="empty empty-illus">
    <svg width="120" height="86" viewBox="0 0 120 86" fill="none">
      <path d="M60 66 C30 46 22 30 34 20 C44 12 56 18 60 28 C64 18 76 12 86 20 C98 30 90 46 60 66 Z" stroke="#7fcfb4" stroke-width="2.5" fill="#eafaf3" />
      <circle cx="50" cy="36" r="2.4" fill="#2aa082" /><circle cx="70" cy="36" r="2.4" fill="#2aa082" />
      <path d="M50 46 Q60 54 70 46" stroke="#2aa082" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M24 60 Q28 56 32 60" stroke="#f0a050" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M88 58 Q92 54 96 58" stroke="#f0a050" stroke-width="2" stroke-linecap="round" fill="none" />
    </svg>
    <div>还没有生病记录</div>
    <div class="empty-sub">希望一直用不上这一页</div>
  </div></div>

  <div v-for="ill in sorted" :key="ill.id" class="card ill-card" :class="{ ongoing: !ill.end }">
    <div class="ill-head">
      <div>
        <div class="ill-title">
          <span v-for="sy in ill.symptoms" :key="sy" class="sy-chip">{{ sy }}</span>
          <span v-if="!ill.symptoms.length" class="sy-chip">不舒服</span>
        </div>
        <div class="ill-range">
          {{ ill.start }}{{ ill.end ? ' ~ ' + ill.end : ' 起' }}
          · {{ ill.end ? `一共 ${illnessDays(ill)} 天` : `第 ${illnessDays(ill)} 天` }}
          <span v-if="!ill.end" class="badge badge-danger">正在生病</span>
          <span v-else class="badge badge-ok">已好</span>
        </div>
      </div>
      <div class="ill-actions">
        <button class="mini-btn ghost" @click="goDiary(ill)">在日记里接着记</button>
        <button v-if="!ill.end" class="mini-btn done-btn" @click="finish(ill)">🎉 好了</button>
        <button v-else class="mini-btn ghost" @click="reopenIllness(ill.id)">其实还没好</button>
        <button class="icon-btn" title="删除这次生病记录" @click="del(ill)"><Icon name="trash" :size="15" /></button>
      </div>
    </div>

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
      <!-- 每天 -->
      <div class="ill-days">
        <div class="ib-title">每一天</div>
        <div v-for="d in dayRows(ill)" :key="d.date" class="day-row">
          <span class="dr-date">{{ d.date.slice(5).replace('-', '/') }}<i>第 {{ d.n }} 天</i></span>
          <span class="dr-body">
            <span v-if="d.max" :class="['dr-temp', d.max >= 38.5 ? 'hot' : d.max >= 37.3 ? 'warm' : '']">{{ d.max.toFixed(1) }}℃</span>
            <span v-for="m in d.meds" :key="m.name" class="dr-med">💊 {{ m.name }}<template v-if="m.n > 1"> ×{{ m.n }}</template></span>
            <span v-if="d.visit" class="dr-visit">🏥 去医院</span>
            <span v-if="d.note" class="dr-note">{{ d.note }}</span>
            <span v-if="!d.max && !d.meds.length && !d.visit && !d.note" class="dr-none">没记</span>
            <span v-if="d.date === ill.end" class="dr-end">🎉 好了</span>
          </span>
        </div>
      </div>
    </div>
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import Icon from '../components/Icon.vue'
import {
  store, todayStr, diaryDate, SYMPTOMS, illnessDays, startIllness, endIllness, reopenIllness,
  removeIllness, illnessMeds, setIllnessMoment,
} from '../store.js'

const emit = defineEmits(['go'])
const today = todayStr()
const p2 = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}
function toggle(list, v) {
  const i = list.indexOf(v)
  if (i >= 0) list.splice(i, 1)
  else list.push(v)
}

// ---------- 统计 ----------
const sorted = computed(() => [...store.illnesses].sort((a, b) => (!a.end ? 0 : 1) - (!b.end ? 0 : 1) || b.start.localeCompare(a.start)))
const ongoing = computed(() => store.illnesses.filter(i => !i.end))
const yearList = computed(() => store.illnesses.filter(i => i.start.slice(0, 4) === today.slice(0, 4)))
const avgDays = computed(() => {
  const done = store.illnesses.filter(i => i.end)
  if (!done.length) return 0
  return Math.round(done.reduce((s, i) => s + illnessDays(i), 0) / done.length * 10) / 10
})
const topSymptom = computed(() => {
  const c = {}
  for (const i of store.illnesses) for (const s of i.symptoms) c[s] = (c[s] || 0) + 1
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
})

// ---------- 新开一张 ----------
const form = reactive({ symptoms: [], other: '', start: today })
function create() {
  const list = [...form.symptoms, ...(form.other ? [form.other] : [])]
  if (!list.length) return
  startIllness({ date: form.start, symptoms: list })
  Object.assign(form, { symptoms: [], other: '', start: today })
  showToast('开好了，之后在日记里点「不舒服」接着记体温和用药')
}

// ---------- 卡片操作 ----------
function finish(ill) {
  endIllness(ill.id, today)
  showToast(`🎉 好了！这次一共 ${illnessDays(ill)} 天`)
}
function del(ill) {
  if (!confirm('删除这次生病记录？体温、每天一句和就医记录会一起删除；药箱里的用药流水和库存不变')) return
  removeIllness(ill.id)
}
function goDiary(ill) {
  diaryDate.value = ill.end && ill.end < today ? ill.end : today
  emit('go', 'diary')
}

// ---------- 每一天 ----------
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
function dayRows(ill) {
  const meds = illnessMeds(ill.id)
  return daysOf(ill).map((date, i) => {
    const temps = ill.temps.filter(t => t.time.slice(0, 10) === date)
    const mc = {}
    for (const m of meds) if (m.time.slice(0, 10) === date) mc[m.name] = (mc[m.name] || 0) + 1
    return {
      date, n: i + 1,
      max: temps.length ? Math.max(...temps.map(t => t.value)) : 0,
      meds: Object.entries(mc).map(([name, n]) => ({ name, n })),
      visit: ill.visits.some(v => v.date === date),
      note: ill.notes.find(n => n.date === date)?.text || '',
    }
  }).reverse()
}
const maxTemp = ill => ill.temps.reduce((a, t) => Math.max(a, t.value), 0)

// ---------- 体温曲线 ----------
const W = 360, H = 150, PADL = 30, PADT = 10, PADB = 20
const REFS = [37.3, 38.5]
const LO = 35.5, HI = 40.5
const ty = v => PADT + (HI - Math.min(HI, Math.max(LO, v))) / (HI - LO) * (H - PADT - PADB)
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
.top-name { font-size: 16px !important; line-height: 29px; }
.stat-box.alert .num { color: #c0392b; }
.ill-card.ongoing { border: 1px solid rgba(224, 85, 85, .4); }
.ill-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.ill-title { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 4px; }
.sy-chip { background: rgba(229, 103, 90, .12); color: #b8452c; border-radius: 999px; padding: 2px 10px; font-size: 13px; font-weight: 700; }
.ill-range { font-size: 12.5px; color: var(--ink-2); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ill-actions { display: flex; align-items: center; gap: 6px; }
.done-btn { background: linear-gradient(135deg, #7fcfb4, #2aa082); box-shadow: 0 2px 8px rgba(42, 160, 130, .3); }
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
.ib-empty { font-size: 12px; color: var(--ink-3); padding: 20px 0; }
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
.dr-none { color: var(--ink-3); font-size: 12px; }
.dr-end { color: #1f7f6b; font-weight: 700; }
</style>
