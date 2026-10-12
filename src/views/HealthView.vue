<template>
  <div class="view-head">
    <h2>健康档案</h2>
    <div class="sub">体检（含身高体重）/ 疫苗 / 就医 · 生长曲线只看自己的轨迹 · 疫苗计划按月龄提醒</div>
  </div>

  <div class="two-col">
    <!-- 录入表单 -->
    <div class="card">
      <div class="card-title"><span class="ct-left"><Icon name="heart-pulse" :size="16" />记一笔</span></div>
      <div class="chip-row">
        <span
          v-for="k in FORM_KINDS" :key="k"
          class="chip" :class="{ sel: form.kind === k }"
          @click="form.kind = k"
        >{{ k }}</span>
      </div>
      <div class="form-pair">
        <div class="form-row">
          <label>日期</label>
          <input v-model="form.date" type="date" />
        </div>
        <div class="form-row">
          <label>标题</label>
          <input v-model.trim="form.title" :placeholder="titlePlaceholder" />
        </div>
      </div>
      <!-- 体检：身高体重结构化录入（生长曲线的数据源，合并了原"生长"类） -->
      <div v-if="form.kind === '体检'" class="form-pair">
        <div class="form-row">
          <label>身高（cm，可选）</label>
          <input v-model="form.height" type="number" step="0.1" placeholder="如 85.5" />
        </div>
        <div class="form-row">
          <label>体重（kg，可选）</label>
          <input v-model="form.weight" type="number" step="0.1" placeholder="如 12.3" />
        </div>
      </div>
      <div class="form-row">
        <label>备注（可选）</label>
        <textarea v-model.trim="form.note" rows="2" :placeholder="notePlaceholder"></textarea>
      </div>
      <div v-if="form.kind === '疫苗' || form.kind === '体检'" class="form-row">
        <label>下次日期（可选，用于提醒）</label>
        <input v-model="form.nextDate" type="date" />
      </div>
      <button class="btn-primary" style="width:100%;justify-content:center" @click="submit">保存记录</button>
    </div>

    <!-- 生长曲线（只画自己的轨迹，不叠标准曲线） -->
    <div class="card">
      <div class="card-title">
        <span class="ct-left"><Icon name="trending-up" :size="16" />生长曲线</span>
        <span class="more">来自体检/生长记录 · {{ growth.length }} 个点</span>
      </div>
      <template v-if="growth.length >= 2">
        <div class="growth-grid">
          <GrowthChart :points="growth.map(p => ({ date: p.date, value: p.height }))" label="身高" unit="cm" color="#e87c4c" />
          <GrowthChart :points="growth.map(p => ({ date: p.date, value: p.weight }))" label="体重" unit="kg" color="#7fb069" />
        </div>
      </template>
      <div v-else class="empty">
        在左边记「体检」时填上身高/体重，攒够 2 次就出曲线啦
      </div>
    </div>
  </div>

  <!-- 疫苗接种记录（默认折叠成一行摘要；展开后参考官方接种记录样式：已接种/未接种 Tab + 按疫苗类别分组） -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="syringe" :size="16" />疫苗接种记录</span>
      <span class="more">
        已打 {{ doneCount }}/{{ totalCount }} 针
        <button class="mini-btn" style="margin-left:8px" @click="vacOpen = !vacOpen">
          {{ vacOpen ? '收起' : '展开接种记录' }}
        </button>
      </span>
    </div>
    <!-- 折叠态摘要：下一针是什么 -->
    <div v-if="!vacOpen" class="vac-summary" @click="vacOpen = true">
      <template v-if="nextDose">
        <Icon name="syringe" :size="15" />
        <span v-if="nextDose.urgent" class="badge badge-warn">该打了</span>
        <span v-else class="badge badge-info">下一针</span>
        <b>{{ nextDose.name }}</b>
        <span class="vac-summary-sub">（{{ nextDose.monthLabel }}）</span>
        <span class="vac-summary-cta">点我展开接种记录 →</span>
      </template>
      <template v-else>
        <Icon name="check" :size="15" />
        一类苗程序全部打完啦
      </template>
    </div>
    <template v-if="vacOpen">
      <div class="vac-meta">
        依据：《{{ SCHEDULE_META.doc }}》（{{ SCHEDULE_META.docNo }}，{{ SCHEDULE_META.issuer }}，{{ SCHEDULE_META.published }} 印发）
        <a class="vac-src" :href="SCHEDULE_META.source" target="_blank" rel="noopener">官方来源 ↗</a>
      </div>
      <div class="vac-hint">国家免疫规划程序（免费一类苗）参考日程 · 「记为已打」会同步写进下方健康档案 · 接种安排以当地预防接种门诊为准，此处仅作记录与参考，不替代医嘱</div>
      <!-- 已接种 / 未接种 Tab -->
      <div class="vac-tabs">
        <span class="vac-tab" :class="{ sel: vacTab === 'done' }" @click="vacTab = 'done'">已接种 {{ doneCount }}</span>
        <span class="vac-tab" :class="{ sel: vacTab === 'todo' }" @click="vacTab = 'todo'">未接种 {{ totalCount - doneCount }}</span>
      </div>

      <!-- 已接种：按疫苗类别分组，剂次 + 接种日期 -->
      <template v-if="vacTab === 'done'">
        <div v-if="!doneFamilies.length" class="empty">还没有接种记录，去「未接种」里记一针吧</div>
        <div v-for="f in doneFamilies" :key="f.family" class="vf-group">
          <div class="vf-head">
            <span class="vf-name">{{ f.family }}</span>
            <span class="vf-col-dose">剂次</span>
            <span class="vf-col-date">接种日期</span>
          </div>
          <div v-for="d in f.doses" :key="d.key" class="vf-row">
            <span class="vf-vac">{{ d.shortName }}<span class="badge badge-ok">一类</span></span>
            <span class="vf-cell-dose"><span class="dose-no">{{ d.ordinal }}</span></span>
            <span class="vf-cell-date">{{ vacMap[d.key].date }}</span>
            <button class="vac-undo" @click="undoVaccine(d)">撤销</button>
          </div>
        </div>
      </template>

      <!-- 未接种：剂次 + 建议月龄 + 记为已打 -->
      <template v-else>
        <div v-if="!todoFamilies.length" class="empty">一类苗程序全部打完啦</div>
        <div v-for="f in todoFamilies" :key="f.family" class="vf-group">
          <div class="vf-head">
            <span class="vf-name">{{ f.family }}</span>
            <span class="vf-col-dose">剂次</span>
            <span class="vf-col-date">建议月龄</span>
          </div>
          <div v-for="d in f.doses" :key="d.key" class="vf-row" :class="{ due: d.month <= curMonths }">
            <span class="vf-vac">
              {{ d.shortName }}<span class="badge badge-ok">一类</span>
              <span v-if="d.month <= curMonths" class="badge badge-warn">该打了</span>
            </span>
            <span class="vf-cell-dose"><span class="dose-no todo">{{ d.ordinal }}</span></span>
            <span class="vf-cell-date">{{ d.monthText }}</span>
            <input type="date" class="vac-date-input" v-model="vacDates[d.key]" />
            <button class="mini-btn" @click="doneVaccine(d)">记为已打</button>
          </div>
        </div>
      </template>
    </template>
  </div>

  <!-- 健康记录列表 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="heart" :size="16" />健康记录</span>
      <span class="more">{{ filteredHealths.length }} / {{ store.healths.length }} 条</span>
    </div>
    <!-- 筛选：疫苗自动记录多，可按类过滤 -->
    <div class="chip-row" style="margin-bottom:8px">
      <span class="chip" :class="{ sel: listFilter === '' }" @click="listFilter = ''">全部</span>
      <span class="chip" :class="{ sel: listFilter === '体检生长' }" @click="listFilter = '体检生长'">体检·生长 {{ kindCount.growth }}</span>
      <span class="chip" :class="{ sel: listFilter === '疫苗' }" @click="listFilter = '疫苗'">疫苗 {{ kindCount.vac }}</span>
      <span class="chip" :class="{ sel: listFilter === '就医' }" @click="listFilter = '就医'">就医 {{ kindCount.doc }}</span>
    </div>
    <div v-for="h in pagedHealths" :key="h.id" class="tl-item">
      <span class="tl-icon"><Icon :name="kindIcon(h.kind)" :size="16" /></span>
      <div class="tl-body">
        <div class="tl-title">
          <span class="badge" :class="'badge-' + kindLevel(h.kind)">{{ h.kind }}</span>
          {{ h.title }}
          <span v-if="h.height" class="hw">身高 {{ h.height }}cm</span>
          <span v-if="h.weight" class="hw">体重 {{ h.weight }}kg</span>
        </div>
        <div class="tl-note">
          {{ h.date }}
          <template v-if="h.note"> · {{ h.note }}</template>
          <template v-if="h.nextDate"> · 下次：{{ h.nextDate }}</template>
        </div>
      </div>
      <button class="icon-btn" @click="removeRecord(h)"><Icon name="trash" :size="15" /></button>
    </div>
    <div v-if="!store.healths.length" class="empty">还没有健康记录，记一笔体检或疫苗吧</div>
    <!-- 分页：每页 10 条 -->
    <div v-if="pageCount > 1" class="pager">
      <button class="mini-btn ghost" :disabled="page <= 1" @click="page--"><Icon name="chevron-left" :size="13" /></button>
      <span>第 {{ page }} / {{ pageCount }} 页 · 每页 10 条</span>
      <button class="mini-btn ghost" :disabled="page >= pageCount" @click="page++"><Icon name="chevron-right" :size="13" /></button>
    </div>
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ref, computed, reactive, watch, h as hv } from 'vue'
import Icon from '../components/Icon.vue'
import {
  store, addHealth, removeHealth, growthPoints,
  babyMonths, setVaccineDone, cancelVaccine, todayStr,
} from '../store.js'
import { scheduleByFamily, VACCINE_SCHEDULE, SCHEDULE_META, monthLabel } from '../utils/vaccineSchedule.js'

// ---------- 录入表单 ----------
// 体检和生长合并录入：体检即带身高体重（历史"生长"类数据不受影响，照常显示/参与曲线）
const FORM_KINDS = ['体检', '疫苗', '就医']
const form = reactive({ kind: '体检', date: todayStr(), title: '', note: '', height: '', weight: '', nextDate: '' })

const titlePlaceholder = computed(() => ({
  '体检': '如：1 岁儿保体检 / 在家量身高体重',
  '疫苗': '如：麻腮风疫苗第 1 针',
  '就医': '如：发烧看门诊',
}[form.kind]))

const notePlaceholder = computed(() => ({
  '体检': '医生怎么说？牙齿/视力/血常规…',
  '疫苗': '接种部位、有无不良反应…',
  '就医': '症状、诊断、开的药…',
}[form.kind]))

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

function submit() {
  if (form.kind === '疫苗' && !form.title) { showToast('疫苗记录至少填个标题'); return }
  addHealth({ ...form })
  form.title = ''
  form.note = ''
  form.height = ''
  form.weight = ''
  form.nextDate = ''
  showToast('已保存')
}

function removeRecord(h) {
  if (confirm(`删掉这条「${h.title}」记录？`)) removeHealth(h.id)
}

// ---------- 生长曲线 ----------
const growth = computed(() => growthPoints())

// 内联小组件：单指标折线图（身高/体重各一张），固定宽度防大屏拉伸
const GrowthChart = (props) => {
  const pts = props.points.filter(p => p.value)
  if (pts.length < 2) {
    return hv('div', { class: 'gc-empty' }, `${props.label}数据还不足 2 个点`)
  }
  const W = 460, H = 190, padL = 40, padR = 14, padT = 16, padB = 26
  const iw = W - padL - padR, ih = H - padT - padB
  const vals = pts.map(p => p.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const lo = min - span * 0.15, hi = max + span * 0.15
  const x = i => padL + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw)
  const y = v => padT + (1 - (v - lo) / (hi - lo)) * ih
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const children = [
    hv('text', { x: padL, y: 12, class: 'gc-title', fill: props.color }, `${props.label}（${props.unit}）`),
    // 横轴
    hv('line', { x1: padL, y1: padT + ih, x2: padL + iw, y2: padT + ih, stroke: 'rgba(180,140,95,.4)', 'stroke-width': 1 }),
  ]
  // 纵轴参考值（最低/最高）
  children.push(hv('text', { x: padL - 6, y: y(max) + 3, class: 'gc-axis', 'text-anchor': 'end' }, String(max)))
  children.push(hv('text', { x: padL - 6, y: y(min) + 3, class: 'gc-axis', 'text-anchor': 'end' }, String(min)))
  // 折线 + 数据点
  children.push(hv('path', { d: line, fill: 'none', stroke: props.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }))
  pts.forEach((p, i) => {
    children.push(hv('circle', { cx: x(i), cy: y(p.value), r: 3.5, fill: props.color }, [
      hv('title', `${p.date}：${p.value}${props.unit}`),
    ]))
    children.push(hv('text', { x: x(i), y: y(p.value) - 8, class: 'gc-val', 'text-anchor': 'middle', fill: props.color }, String(p.value)))
    // 日期标签隔点显示，避免拥挤
    if (pts.length <= 8 || i % Math.ceil(pts.length / 8) === 0 || i === pts.length - 1) {
      children.push(hv('text', { x: x(i), y: H - 8, class: 'gc-axis', 'text-anchor': 'middle' }, p.date.slice(5)))
    }
  })
  return hv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'growth-chart' }, children)
}
GrowthChart.props = ['points', 'label', 'unit', 'color']

// ---------- 疫苗接种记录（默认折叠；展开后按疫苗类别分组 + 已接种/未接种 Tab） ----------
const famGroups = scheduleByFamily()
const vacMap = computed(() => Object.fromEntries(store.vaccines.map(v => [v.id, v])))
// 默认勾选日期：今天（可改）
const vacDates = reactive({})
const vacOpen = ref(false)
const curMonths = computed(() => babyMonths())
const doneCount = computed(() => store.vaccines.length)
const totalCount = VACCINE_SCHEDULE.length
// 有已打记录默认看「已接种」，否则直接落在「未接种」方便录入
const vacTab = ref(store.vaccines.length ? 'done' : 'todo')

// 按 Tab 过滤类别分组（只保留含有对应剂次的类别）
const doneFamilies = computed(() => famGroups
  .map(f => ({ ...f, doses: f.doses.filter(d => vacMap.value[d.key]) }))
  .filter(f => f.doses.length))
const todoFamilies = computed(() => famGroups
  .map(f => ({ ...f, doses: f.doses.filter(d => !vacMap.value[d.key]) }))
  .filter(f => f.doses.length))

// 折叠态摘要：优先给出"到龄未打"的第一针，其次"未到龄"的下一针
const nextDose = computed(() => {
  const months = curMonths.value
  let upcoming = null
  for (const d of VACCINE_SCHEDULE) {
    if (vacMap.value[d.key]) continue
    if (d.month <= months) return { ...d, monthLabel: monthLabel(d.month), urgent: true }
    if (!upcoming) upcoming = { ...d, monthLabel: monthLabel(d.month), urgent: false }
  }
  return upcoming
})

function doneVaccine(d) {
  setVaccineDone(d.key, d.fullName, vacDates[d.key] || todayStr())
  showToast(`已记录「${d.fullName}」，同步写进健康档案`)
}

function undoVaccine(d) {
  if (confirm(`撤销「${d.fullName}」的接种记录？健康档案里的对应记录会一起删掉`)) {
    cancelVaccine(d.key)
    showToast('已撤销')
  }
}

// ---------- 记录列表（带分类筛选，疫苗自动记录不再淹没其他） ----------
const listFilter = ref('') // '' | '体检生长' | '疫苗' | '就医'
// 分页
const PAGE_SIZE = 10
const page = ref(1)
watch(listFilter, () => { page.value = 1 })
const pageCount = computed(() => Math.max(1, Math.ceil(filteredHealths.value.length / PAGE_SIZE)))
const pagedHealths = computed(() => filteredHealths.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const sortedHealths = computed(() => [...store.healths].sort((a, b) => b.date.localeCompare(a.date)))
const kindCount = computed(() => ({
  growth: store.healths.filter(h => h.kind === '体检' || h.kind === '生长').length,
  vac: store.healths.filter(h => h.kind === '疫苗').length,
  doc: store.healths.filter(h => h.kind === '就医').length,
}))
const filteredHealths = computed(() => {
  if (listFilter.value === '体检生长') return sortedHealths.value.filter(h => h.kind === '体检' || h.kind === '生长')
  if (listFilter.value) return sortedHealths.value.filter(h => h.kind === listFilter.value)
  return sortedHealths.value
})

// 删掉当前页最后一条后，页码不能超过总页数
watch(pageCount, n => { if (page.value > n) page.value = n })
const kindIcon = k => ({ '体检': 'heart-pulse', '疫苗': 'syringe', '就医': 'heart', '生长': 'trending-up' }[k] || 'heart')
const kindLevel = k => ({ '体检': 'ok', '疫苗': 'ok', '就医': 'warn', '生长': 'ok' }[k] || 'ok')
</script>

<style scoped>
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 10px; font-size: 12px; color: var(--ink-2); }
.pager .mini-btn { padding: 5px 8px; display: inline-flex; align-items: center; }
.vac-meta { font-size: 11.5px; color: var(--ink-2); background: #f6f1e7; border-radius: 8px; padding: 5px 10px; margin-bottom: 8px; line-height: 1.6; }
.vac-src { color: var(--brand-deep); margin-left: 6px; }
</style>
