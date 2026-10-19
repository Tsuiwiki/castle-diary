<template>
  <div class="view-head">
    <h2>饮食册</h2>
    <div class="sub">{{ ta() }}吃得杂不杂、爱吃什么、有没有要避开的 · 日常在日记里用「吃了」贴纸记就行</div>
  </div>

  <!-- 统计格 -->
  <div class="stat-row">
    <div class="stat-box"><div class="num">{{ monthFoodCount }}</div><div class="lbl">本月吃过几种</div></div>
    <div class="stat-box"><div class="num">{{ weekFullDays }}<small>/7</small></div><div class="lbl">本周 5 类吃全的天数</div></div>
    <div class="stat-box"><div class="num">{{ firstTastes.length }}</div><div class="lbl">首尝新食物</div></div>
    <div class="stat-box" :class="{ warn: allergies.length }"><div class="num">{{ allergies.length }}</div><div class="lbl">过敏 / 不适</div></div>
  </div>

  <!-- 彩虹餐盘 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="bowl" :size="16" />彩虹餐盘</span>
      <span class="plate-nav">
        <button class="mini-btn ghost" @click="weekOffset--"><Icon name="chevron-left" :size="13" /></button>
        <span class="plate-range">{{ weekLabel }}</span>
        <button class="mini-btn ghost" :disabled="weekOffset >= 0" @click="weekOffset++"><Icon name="chevron-right" :size="13" /></button>
        <button v-if="weekOffset" class="mini-btn ghost" @click="weekOffset = 0">本周</button>
      </span>
    </div>
    <div class="plates">
      <div v-for="d in weekDays" :key="d.date" class="plate-day" :class="{ today: d.date === today, future: d.date > today }">
        <RainbowPlate :groups="d.groups" :size="64" />
        <div class="pd-label">{{ d.week }}<span>{{ d.date.slice(5).replace('-', '/') }}</span></div>
        <div class="pd-foods" :title="d.foods.join('、')">{{ d.foods.length ? d.foods.slice(0, 3).join('、') + (d.foods.length > 3 ? '…' : '') : '—' }}</div>
      </div>
    </div>
    <div class="plate-note">餐盘只统计记下来的餐；没记不等于没吃，更不等于吃得不够</div>
    <div class="plate-legend">
      <span v-for="g in FOOD_GROUPS" :key="g.key"><i :style="{ background: g.color }"></i>{{ g.key }}</span>
    </div>
    <div class="plate-sum">{{ weekSummary }}</div>
    <div class="plate-tip">分类是按食物名字自动判断的，不准的到下面「食物分类」里点一下改</div>
  </div>

  <div class="two-col">
    <!-- 左 -->
    <div class="col">
      <!-- 过敏与不适 -->
      <div class="card allergy-card">
        <div class="card-title"><span class="ct-left"><Icon name="alert-triangle" :size="16" />过敏与不适</span><span class="more">在日记里记到这些食物会提醒</span></div>
        <div v-if="!allergies.length" class="empty" style="padding:6px 0">还没有记录。吃了以后起疹子、拉肚子的食物记在这里</div>
        <div v-for="f in allergies" :key="f.name" class="al-row">
          <b>{{ f.name }}</b>
          <span class="al-note">{{ f.allergyNote || '没写反应' }}</span>
          <span class="al-date">{{ f.allergyDate }}</span>
          <button class="icon-btn" title="已经不过敏了，移出清单" @click="unAllergy(f)"><Icon name="x" :size="14" /></button>
        </div>
        <div class="inline-add" style="margin-top:8px">
          <input v-model.trim="al.name" placeholder="食物" style="flex:1;min-width:70px" @keyup.enter="addAllergy" />
          <input v-model.trim="al.note" placeholder="什么反应（可选）" style="flex:1.6" @keyup.enter="addAllergy" />
          <button class="mini-btn" :disabled="!al.name" @click="addAllergy">记下</button>
        </div>
      </div>

      <!-- 记一餐（补记用） -->
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="utensils" :size="16" />补记一餐</span></div>
        <div class="chip-row">
          <span v-for="m in MEALS" :key="m" class="chip" :class="{ sel: form.meal === m }" @click="form.meal = m">{{ m }}</span>
        </div>
        <div class="form-row">
          <label>吃了什么</label>
          <input v-model.trim="form.food" placeholder="如：西兰花牛肉粥" @keyup.enter="submit" />
        </div>
        <div v-if="formAllergy" class="al-warn">⚠ {{ formAllergy.name }} 之前记过不适：{{ formAllergy.allergyNote || '没写反应' }}</div>
        <div v-if="frequent.length" class="chip-row" style="margin-top:-4px">
          <span v-for="f in frequent" :key="f" class="chip chip-soft" @click="form.food = f">{{ f }}</span>
        </div>
        <div class="form-row">
          <label>日期</label>
          <input v-model="form.date" type="date" :max="today" />
        </div>
        <div class="chip-row">
          <span class="chip" :class="{ sel: form.firstTaste }" @click="form.firstTaste = !form.firstTaste">⭐ 第一次吃</span>
          <span v-for="t in MEAL_TAGS" :key="t" class="chip" :class="{ sel: form.tag === t }" @click="form.tag = form.tag === t ? '' : t">{{ t }}</span>
        </div>
        <div class="form-row">
          <label>备注（可选）</label>
          <input v-model.trim="form.note" placeholder="爱吃程度 / 谁喂的 / 有什么反应…" />
        </div>
        <button class="btn-primary" style="width:100%;justify-content:center" @click="submit">记下这餐</button>
      </div>

      <!-- 食物分类 -->
      <div class="card">
        <div class="card-title">
          <span class="ct-left"><Icon name="sparkles" :size="16" />食物分类</span>
          <span class="view-toggle more">
            <span :class="{ on: classTab === 'todo' }" @click="classTab = 'todo'">待确认 {{ todoFoods.length }}</span>｜<span :class="{ on: classTab === 'all' }" @click="classTab = 'all'">全部 {{ allFoods.length }}</span>
          </span>
        </div>
        <div v-if="!classList.length" class="empty" style="padding:6px 0">{{ allFoods.length ? '都确认过了 ✓' : '还没有吃过的食物记录' }}</div>
        <div v-for="f in classList.slice(0, classLimit)" :key="f.name" class="fc-row">
          <span class="fc-name" :title="`吃过 ${f.count} 次`">{{ f.name }}</span>
          <span class="fc-groups">
            <span
              v-for="g in FOOD_GROUPS" :key="g.key"
              class="fc-g" :class="{ on: f.groups.includes(g.key), guess: !f.confirmed }"
              :style="f.groups.includes(g.key) ? { background: g.color, borderColor: g.color } : { color: g.color, borderColor: g.color }"
              @click="toggleGroup(f, g.key)"
            >{{ g.key }}</span>
          </span>
          <button v-if="!f.confirmed" class="mini-btn ghost fc-ok" :disabled="!f.groups.length" title="猜得对，确认" @click="confirmFood(f)">✓</button>
          <span v-else class="fc-done">✓</span>
        </div>
        <div v-if="classList.length > classLimit" class="fc-more" @click="classLimit += 20">再看 20 个</div>
      </div>
    </div>

    <!-- 右 -->
    <div class="col">
      <!-- 爱吃 / 不爱吃 -->
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="heart" :size="16" />口味</span><span class="more">由「爱吃 / 不爱吃」标签统计</span></div>
        <div class="taste-cols">
          <div>
            <div class="tc-title like">爱吃</div>
            <div v-if="!liked.length" class="tc-empty">记的时候点「爱吃」</div>
            <span v-for="f in liked" :key="f.name" class="taste-chip like">{{ f.name }}<i v-if="f.count > 1">×{{ f.count }}</i></span>
          </div>
          <div>
            <div class="tc-title dislike">不爱吃</div>
            <div v-if="!disliked.length" class="tc-empty">记的时候点「不爱吃」</div>
            <span v-for="f in disliked" :key="f.name" class="taste-chip dislike">{{ f.name }}<i v-if="f.count > 1">×{{ f.count }}</i></span>
          </div>
        </div>
      </div>

      <!-- 餐食记录 -->
      <div class="card">
        <div class="card-title">
          <span class="ct-left"><Icon name="calendar" :size="16" />餐食记录</span>
          <span class="more">{{ store.meals.length }} 条</span>
        </div>
        <div v-for="g in groupedMeals.slice(0, dayLimit)" :key="g.date" class="meal-day">
          <div class="meal-date meal-click" title="回到那天的日记" @click="openDay(g.date)">
            {{ g.date }}<span v-if="g.date === today" class="badge badge-ok">今天</span>
            <RainbowPlate :groups="g.groups" :size="18" style="display:inline-block;vertical-align:-4px;margin-left:6px" />
            <span class="meal-go">看那天 →</span>
          </div>
          <div v-for="m in g.list" :key="m.id" class="tl-item">
            <span class="badge" :class="m.firstTaste ? 'badge-warn' : 'badge-ok'">{{ m.meal || '一餐' }}</span>
            <div class="tl-body">
              <div class="tl-title">
                {{ m.food }}
                <span v-for="d in dots(m.food)" :key="d.key" class="gdot" :style="{ background: d.color }" :title="d.key"></span>
                <span v-if="m.firstTaste" class="hw">⭐ 首尝</span>
                <span v-if="m.tag" class="mtag" :class="'mtag-' + m.tag">{{ m.tag }}</span>
              </div>
              <div v-if="m.note" class="tl-note">{{ m.note }}</div>
            </div>
            <button class="icon-btn" @click="remove(m)"><Icon name="trash" :size="15" /></button>
          </div>
        </div>
        <div v-if="groupedMeals.length > dayLimit" class="fc-more" @click="dayLimit += 14">再看 14 天</div>
        <div v-if="!store.meals.length" class="empty">还没记过餐食，在日记里点「吃了」贴纸记第一餐吧</div>
      </div>

      <!-- 首尝墙 -->
      <div class="card">
        <div class="card-title">
          <span class="ct-left"><Icon name="sparkles" :size="16" />首尝墙</span>
          <span class="more">每一口新食物都是里程碑</span>
        </div>
        <div v-if="firstTastes.length" class="taste-wall">
          <span v-for="m in firstTastes" :key="m.id" class="taste-chip" :title="m.date">
            {{ m.title.replace('第一次吃 ', '') }}
            <i>{{ m.date.slice(5) }}</i>
          </span>
        </div>
        <div v-else class="empty">记的时候打开「第一次吃」，新食物会自动贴到这面墙上</div>
      </div>
    </div>
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
const emit = defineEmits(['go'])
import { ta, her, diaryDate } from '../store.js'
import { ref, computed, reactive } from 'vue'
import Icon from '../components/Icon.vue'
import RainbowPlate from '../components/RainbowPlate.vue'
import {
  store, MEALS, MEAL_TAGS, addMeal, removeMeal, frequentFoods, todayStr,
  foodGroupsOf, isFoodConfirmed, setFoodGroups, setFoodAllergy, allergyOf, dayFoodGroups,
} from '../store.js'
import { FOOD_GROUPS } from '../utils/foodGroups.js'

const today = todayStr()
const p2 = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

// ---------- 彩虹餐盘 ----------
const weekOffset = ref(0)
const weekDays = computed(() => {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + weekOffset.value * 7)
  return WEEK.map((week, i) => {
    const d = fmt(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
    const foods = [...new Set(store.meals.filter(m => m.date === d).map(m => m.food))]
    return { date: d, week, groups: dayFoodGroups(d), foods }
  })
})
const weekLabel = computed(() => `${weekDays.value[0].date.slice(5).replace('-', '/')} ~ ${weekDays.value[6].date.slice(5).replace('-', '/')}`)
const weekFullDays = computed(() => {
  // 只看本周（不随翻页变化）
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  let n = 0
  for (let i = 0; i <= dow; i++) {
    const d = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + i))
    if (dayFoodGroups(d).size === FOOD_GROUPS.length) n++
  }
  return n
})
const weekSummary = computed(() => {
  const days = weekDays.value.filter(d => d.date <= today && d.foods.length)
  if (!days.length) return '这周还没有饮食记录'
  const missing = FOOD_GROUPS
    .map(g => ({ key: g.key, n: days.filter(d => !d.groups.has(g.key)).length }))
    .filter(x => x.n)
    .sort((a, b) => b.n - a.n)
  if (!missing.length) return `记录的 ${days.length} 天里，每天 5 类都吃到了，真棒`
  return `记录的 ${days.length} 天里：` + missing.map(x => `${x.key}有 ${x.n} 天没吃到`).join('，')
})

// ---------- 统计 ----------
const monthFoodCount = computed(() => {
  const ym = today.slice(0, 7)
  return new Set(store.meals.filter(m => m.date.slice(0, 7) === ym).map(m => m.food)).size
})
const firstTastes = computed(() =>
  store.milestones.filter(m => m.source === '餐桌').sort((a, b) => b.date.localeCompare(a.date))
)
const allergies = computed(() => store.foods.filter(f => f.allergy).sort((a, b) => (b.allergyDate || '').localeCompare(a.allergyDate || '')))

// ---------- 口味 ----------
function tagRank(tag) {
  const c = {}
  for (const m of store.meals) if (m.tag === tag) c[m.food] = (c[m.food] || 0) + 1
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
}
const liked = computed(() => tagRank('爱吃'))
const disliked = computed(() => tagRank('不爱吃'))

// ---------- 过敏 ----------
const al = reactive({ name: '', note: '' })
function addAllergy() {
  if (!al.name) return
  setFoodAllergy(al.name, true, al.note)
  showToast(`记下了：${al.name}`)
  al.name = ''
  al.note = ''
}
function unAllergy(f) {
  if (confirm(`把「${f.name}」移出过敏与不适清单？`)) setFoodAllergy(f.name, false)
}

// ---------- 补记一餐 ----------
function currentMeal() {
  const h = new Date().getHours()
  if (h < 10) return '早餐'
  if (h < 14) return '午餐'
  if (h < 17) return '加餐'
  return '晚餐'
}
const form = reactive({ date: today, meal: currentMeal(), food: '', firstTaste: false, tag: '', note: '' })
const frequent = computed(() => frequentFoods(8).filter(f => f !== form.food))
const formAllergy = computed(() => (form.food ? allergyOf(form.food) : null))
function submit() {
  if (!form.food) { showToast('先填吃了什么'); return }
  addMeal({ ...form })
  const wasFirst = form.firstTaste
  form.food = ''
  form.note = ''
  form.firstTaste = false
  form.tag = ''
  showToast(wasFirst ? '已记下，首尝进里程碑啦 ⭐' : '已记下')
}
function remove(m) {
  if (confirm(`删掉这餐「${m.food}」？（首尝里程碑会保留在首尝墙）`)) removeMeal(m.id)
}

// ---------- 食物分类 ----------
const allFoods = computed(() => {
  const c = {}
  for (const m of store.meals) if (m.food) c[m.food] = (c[m.food] || 0) + 1
  return Object.entries(c)
    .map(([name, count]) => ({ name, count, groups: foodGroupsOf(name), confirmed: isFoodConfirmed(name) }))
    .sort((a, b) => b.count - a.count)
})
// 待确认：没猜出分类的排最前
const todoFoods = computed(() =>
  allFoods.value.filter(f => !f.confirmed).sort((a, b) => (a.groups.length ? 1 : 0) - (b.groups.length ? 1 : 0) || b.count - a.count)
)
const classTab = ref('todo')
const classList = computed(() => (classTab.value === 'todo' ? todoFoods.value : allFoods.value))
const classLimit = ref(20)
function toggleGroup(f, key) {
  const next = f.groups.includes(key) ? f.groups.filter(g => g !== key) : [...f.groups, key]
  setFoodGroups(f.name, FOOD_GROUPS.map(g => g.key).filter(k => next.includes(k)))
}
function confirmFood(f) {
  setFoodGroups(f.name, f.groups)
}
const dots = name => FOOD_GROUPS.filter(g => foodGroupsOf(name).includes(g.key))

// ---------- 餐食记录 ----------
const dayLimit = ref(14)
const groupedMeals = computed(() => {
  const map = {}
  for (const m of store.meals) (map[m.date] = map[m.date] || []).push(m)
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({ date, list, groups: dayFoodGroups(date) }))
})
function openDay(date) {
  diaryDate.value = date
  emit('go', 'diary')
}
</script>

<style scoped>
.meal-click { cursor: pointer; }
.meal-click:hover { color: var(--brand-deep); }
.meal-go { font-size: 12px; color: var(--brand-deep); margin-left: 8px; opacity: 0; transition: opacity .15s; }
.meal-click:hover .meal-go { opacity: 1; }

.stat-box .num small { font-size: 13px; color: var(--ink-3); font-weight: 400; }
.stat-box.warn .num { color: #d0463c; }

.plate-nav { display: inline-flex; align-items: center; gap: 6px; font-weight: 400; }
.plate-nav .mini-btn { padding: 5px 8px; display: inline-flex; align-items: center; }
.plate-range { font-size: 12px; color: var(--ink-2); min-width: 92px; text-align: center; }
.plates { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.plate-day { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 2px; border-radius: 12px; }
.plate-day.today { background: var(--brand-soft); }
.plate-day.future { opacity: .35; }
.pd-label { font-size: 12px; font-weight: 700; display: flex; flex-direction: column; align-items: center; line-height: 1.3; }
.pd-label span { font-size: 11px; font-weight: 400; color: var(--ink-3); }
.pd-foods { font-size: 11px; color: var(--ink-2); text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plate-note { text-align: center; font-size: 12px; color: var(--ink-3); margin-top: 8px; }
.plate-legend { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--ink-2); margin-top: 10px; }
.plate-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
.plate-sum { text-align: center; font-size: 13px; margin-top: 8px; color: var(--ink); }
.plate-tip { text-align: center; font-size: 11px; color: var(--ink-3); margin-top: 4px; }

.allergy-card { border: 1px solid rgba(224, 85, 85, .35); }
.allergy-card .ct-left { color: #c0392b; }
.al-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px dashed var(--line); font-size: 13px; }
.al-row b { color: #c0392b; }
.al-note { flex: 1; color: var(--ink-2); }
.al-date { font-size: 11px; color: var(--ink-3); }
.al-warn { font-size: 12.5px; color: #c0392b; background: rgba(238, 99, 99, .08); border-radius: 8px; padding: 6px 10px; margin: -4px 0 10px; }

.fc-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--line); }
.fc-name { width: 96px; flex: none; font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-groups { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
.fc-g { font-size: 11px; border: 1px solid; border-radius: 999px; padding: 1px 8px; cursor: pointer; background: #fff; }
.fc-g.on { color: #fff; }
.fc-g.on.guess { opacity: .6; }
.fc-ok { padding: 3px 9px; }
.fc-done { color: var(--green); font-weight: 700; width: 28px; text-align: center; }
.fc-more { text-align: center; font-size: 12px; color: var(--brand-deep); cursor: pointer; padding-top: 8px; }

.taste-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tc-title { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
.tc-title.like { color: #3f7a1c; }
.tc-title.dislike { color: #8a7a68; }
.tc-empty { font-size: 12px; color: var(--ink-3); }
.taste-cols .taste-chip { margin: 0 6px 6px 0; display: inline-block; }
.taste-chip.like { background: rgba(143, 191, 95, .16); color: #3f7a1c; }
.taste-chip.dislike { background: rgba(196, 181, 160, .22); color: #6b5f50; }

.gdot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-left: 3px; vertical-align: 2px; }
.mtag { font-size: 11px; border-radius: 999px; padding: 0 7px; margin-left: 4px; }
.mtag-爱吃 { background: rgba(143, 191, 95, .18); color: #3f7a1c; }
.mtag-不爱吃 { background: rgba(196, 181, 160, .25); color: #6b5f50; }
.mtag-过敏 { background: rgba(238, 99, 99, .14); color: #c0392b; }
@media (max-width: 767px) {
  .plates { gap: 2px; }
  .plate-day svg { width: 40px; height: 40px; }
  .pd-foods { display: none; }
}
</style>
