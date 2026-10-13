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

  <!-- 进行中卡（常显，每天都要记） -->
  <div v-for="ill in ongoing" :key="ill.id" class="card ill-card ongoing">
    <div class="ill-head">
      <div>
        <div class="ill-title">
          <span v-for="sy in ill.symptoms" :key="sy" class="sy-chip">{{ sy }}</span>
          <span v-if="!ill.symptoms.length" class="sy-chip">不舒服</span>
        </div>
        <div class="ill-range">
          {{ ill.start }} 起 · 第 {{ illnessDays(ill) }} 天
          <span class="badge badge-danger">正在生病</span>
        </div>
        <div v-if="ill.moment" class="ill-moment-peek">💛 {{ ill.moment }}</div>
      </div>
      <div class="ill-actions">
        <button class="mini-btn ghost" @click="goDiary(ill)">在日记里接着记</button>
        <button class="mini-btn done-btn" @click="finish(ill)">🎉 好了</button>
        <button class="icon-btn" title="删除这次生病记录" @click="del(ill)"><Icon name="trash" :size="15" /></button>
      </div>
    </div>

    <!-- 超期收敛：病拖太久没点「好了」就主动问（可收起） -->
    <div v-if="illnessDays(ill) > OVERDUE_DAYS && !dismissedOverdue.has(ill.id)" class="overdue-box">
      <div class="ob-text">已经第 {{ illnessDays(ill) }} 天了——这次是不是早好了？是哪一天好的？</div>
      <div class="ob-row">
        <input type="date" v-model="overdueEnd[ill.id]" :min="ill.start" :max="today" />
        <button class="mini-btn done-btn" :disabled="!overdueEnd[ill.id]" @click="finishAt(ill)">补录这天好的</button>
        <button class="mini-btn ghost" @click="dismissedOverdue.add(ill.id)">还没好，别问了</button>
      </div>
    </div>

    <IllnessDetail :ill="ill" />
  </div>

  <!-- 进行中唯一性提示 -->
  <div v-if="ongoing.length > 1" class="card">
    <div class="overdue-box" style="margin:0">有不只一场「正在生病」。一场一场来：先给早的那场补个「好了」的日期。</div>
  </div>

  <!-- 新开一张（补记） -->
  <div class="card">
    <div class="card-title"><span class="ct-left"><Icon name="plus" :size="16" />补记一次生病</span><span class="more">日常更推荐在日记里点「不舒服」</span></div>
    <div class="chip-row">
      <span v-for="sy in SYMPTOMS" :key="sy" class="chip" :class="{ sel: form.symptoms.includes(sy) }" @click="toggle(form.symptoms, sy)">{{ sy }}</span>
    </div>
    <div class="chip-row" style="margin-top:2px">
      <span class="chip" :class="{ sel: !form.done }" @click="form.done = false">还在生病</span>
      <span class="chip" :class="{ sel: form.done }" @click="form.done = true">已经好了（补记）</span>
    </div>
    <div class="inline-add">
      <input v-model.trim="form.other" placeholder="其他症状（可选）" style="flex:1.4" />
      <input v-model="form.start" type="date" :max="today" style="flex:1" title="哪天开始不舒服" />
      <input v-if="form.done" v-model="form.end" type="date" :min="form.start" :max="today" style="flex:1" title="哪天好的" />
      <button class="mini-btn" :disabled="(!form.symptoms.length && !form.other) || (form.done && !form.end)" @click="create">开始记录</button>
    </div>
    <div v-if="form.done && !form.end" class="lk-msg" style="margin-top:6px">选「已经好了」要补一个结束日期</div>
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

  <!-- 已好的：默认折叠，摘要一行，点开看详情 -->
  <div v-for="ill in ended" :key="ill.id" class="card ill-card collapsed" :class="{ open: openIds.has(ill.id) }">
    <div class="ill-head ill-head-click" @click="toggleOpen(ill.id)">
      <div>
        <div class="ill-title">
          <span v-for="sy in ill.symptoms" :key="sy" class="sy-chip">{{ sy }}</span>
          <span v-if="!ill.symptoms.length" class="sy-chip">不舒服</span>
        </div>
        <div class="ill-range">
          {{ ill.start }} ~ {{ ill.end }} · 一共 {{ illnessDays(ill) }} 天
          <span class="badge badge-ok">已好</span>
          <span class="ill-fold-hint">{{ openIds.has(ill.id) ? '收起 ▲' : '详情 ▼' }}</span>
        </div>
        <div v-if="ill.moment && !openIds.has(ill.id)" class="ill-moment-peek">💛 {{ ill.moment.length > 24 ? ill.moment.slice(0, 24) + '…' : ill.moment }}</div>
      </div>
      <div class="ill-actions" @click.stop>
        <button class="mini-btn ghost" @click="reopenIllness(ill.id)">其实还没好</button>
        <button class="icon-btn" title="删除这次生病记录" @click="del(ill)"><Icon name="trash" :size="15" /></button>
      </div>
    </div>
    <IllnessDetail v-if="openIds.has(ill.id)" :ill="ill" />
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import Icon from '../components/Icon.vue'
import IllnessDetail from '../components/IllnessDetail.vue'
import {
  store, todayStr, diaryDate, SYMPTOMS, illnessDays, startIllness, endIllness, reopenIllness,
  removeIllness,
} from '../store.js'

const emit = defineEmits(['go'])
const today = todayStr()

const OVERDUE_DAYS = 10 // 超过这么多天还没点「好了」就主动问

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}
onBeforeUnmount(() => clearTimeout(toastTimer))
function toggle(list, v) {
  const i = list.indexOf(v)
  if (i >= 0) list.splice(i, 1)
  else list.push(v)
}

// ---------- 统计 ----------
const ongoing = computed(() => store.illnesses.filter(i => !i.end).sort((a, b) => a.start.localeCompare(b.start)))
const ended = computed(() => store.illnesses.filter(i => i.end).sort((a, b) => b.start.localeCompare(a.start)))
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

// ---------- 折叠 ----------
const openIds = reactive(new Set())
function toggleOpen(id) {
  if (openIds.has(id)) openIds.delete(id)
  else openIds.add(id)
}

// ---------- 超期补录 ----------
const overdueEnd = reactive({})
const dismissedOverdue = reactive(new Set())
function finishAt(ill) {
  const d = overdueEnd[ill.id]
  if (!d) return
  endIllness(ill.id, d)
  showToast(`🎉 记上了：${ill.start} ~ ${d}，一共 ${illnessDays(ill)} 天`)
}

// ---------- 新开一张 ----------
const form = reactive({ symptoms: [], other: '', start: today, done: false, end: '' })
function create() {
  const list = [...form.symptoms, ...(form.other ? [form.other] : [])]
  if (!list.length) return
  if (form.done && !form.end) return
  const ill = startIllness({ date: form.start, symptoms: list })
  if (!ill) { showToast('还有一场病没点「好了」，先结束那场再开新的'); return }
  if (form.done) endIllness(ill.id, form.end)
  Object.assign(form, { symptoms: [], other: '', start: today, done: false, end: '' })
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
</script>

<style scoped>
.top-name { font-size: 16px !important; line-height: 29px; }
.stat-box.alert .num { color: #c0392b; }
.ill-card.ongoing { border: 1px solid rgba(224, 85, 85, .4); }
.ill-card.collapsed { padding-bottom: 14px; }
.ill-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.ill-head-click { cursor: pointer; }
.ill-title { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 4px; }
.sy-chip { background: rgba(229, 103, 90, .12); color: #b8452c; border-radius: 999px; padding: 2px 10px; font-size: 13px; font-weight: 700; }
.ill-range { font-size: 12.5px; color: var(--ink-2); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ill-fold-hint { color: var(--ink-3); font-size: 11.5px; }
.ill-actions { display: flex; align-items: center; gap: 6px; }
.ill-moment-peek { font-size: 12.5px; color: #8a6d3b; margin-top: 5px; font-family: "KaiTi", "STKaiti", serif; }
.done-btn { background: linear-gradient(135deg, #7fcfb4, #2aa082); box-shadow: 0 2px 8px rgba(42, 160, 130, .3); }
.overdue-box { background: #fff6e8; border: 1px solid rgba(240, 168, 90, .4); border-radius: 10px; padding: 10px 12px; margin: 10px 0; }
.ob-text { font-size: 13px; color: #8a5a20; margin-bottom: 8px; }
.ob-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ob-row input { border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; font-size: 13px; }
</style>
