<template>
  <div class="view-head">
    <h2>往日日记</h2>
    <div class="sub">点任意一天，翻开那天的日记；颜色是她那天的心情</div>
  </div>

  <div class="card">
    <div class="cal-nav">
      <button class="mini-btn ghost" @click="shift(-1)"><Icon name="chevron-left" :size="14" />上个月</button>
      <div class="cal-title">
        <b>{{ year }} 年 {{ month }} 月</b>
        <span class="cal-sum">写了 {{ writtenDays }} 天<template v-if="photoCount"> · {{ photoCount }} 张照片</template></span>
      </div>
      <div class="cal-castle" :title="`城堡：月龄生日加一层，词添砖、里程碑插旗、读完的书点灯、去过的地方种树；随季节换装`">
        <CastleSvg :width="170" />
        <span class="cal-season">{{ seasonName }} · 本月写了 {{ writtenDays }} 天</span>
      </div>
      <button class="mini-btn ghost" :disabled="isCurrentMonth" @click="shift(1)">下个月<Icon name="chevron-right" :size="14" /></button>
    </div>

    <div class="cal-grid">
      <div v-for="w in WEEK" :key="w" class="cal-wk">{{ w }}</div>
      <div
        v-for="(c, i) in cells" :key="i"
        class="cal-cell"
        :class="{ blank: !c, future: c && c.future, today: c && c.isToday, has: c && c.info }"
        :style="c && c.info?.photo ? { backgroundImage: `url(${c.info.photo})` } : null"
        @click="c && !c.future && open(c.date)"
      >
        <template v-if="c">
          <span class="cal-d">{{ c.day }}</span>
          <span v-if="c.mood" class="cal-mood" :style="{ background: c.mood.color }">{{ c.mood.key }}</span>
          <span v-if="c.info?.count" class="cal-count">{{ c.info.count }} 条</span>
        </template>
      </div>
    </div>

    <div class="cal-legend">
      <span v-for="m in MOODS" :key="m.key"><i :style="{ background: m.color }"></i>{{ m.key }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Icon from '../components/Icon.vue'
import { store, MOODS, diaryDate, todayStr } from '../store.js'
import { monthIndex } from '../utils/diaryText.js'
import CastleSvg from '../components/CastleSvg.vue'
import { seasonOf } from '../utils/solarTerms.js'

const today = todayStr()

const emit = defineEmits(['go'])
const WEEK = ['一', '二', '三', '四', '五', '六', '日']
const p2 = n => String(n).padStart(2, '0')

const now = new Date()
const cursor = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth() + 1)
const ym = computed(() => `${year.value}-${p2(month.value)}`)
const isCurrentMonth = computed(() => ym.value === todayStr().slice(0, 7))

function shift(n) {
  cursor.value = new Date(year.value, cursor.value.getMonth() + n, 1)
}

const index = computed(() => monthIndex(ym.value))
const writtenDays = computed(() => Object.keys(index.value).length)
// 季节名（城堡随季节换装；写作天数用文字表达，不再压城堡的颜色）
const seasonName = computed(() => seasonOf(today) + '天')
const photoCount = computed(() => store.photos.filter(p => p.date.slice(0, 7) === ym.value).length)

const cells = computed(() => {
  const first = new Date(year.value, month.value - 1, 1)
  const lead = (first.getDay() + 6) % 7 // 周一开头
  const days = new Date(year.value, month.value, 0).getDate()
  const today = todayStr()
  const list = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) {
    const date = `${ym.value}-${p2(d)}`
    const info = index.value[date] || null
    list.push({
      day: d, date, info,
      mood: info?.mood ? MOODS.find(m => m.key === info.mood) : null,
      isToday: date === today,
      future: date > today,
    })
  }
  return list
})

function open(date) {
  diaryDate.value = date
  emit('go', 'diary')
}
</script>

<style scoped>
.cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.cal-title { text-align: center; }
.cal-castle { position: absolute; right: 18px; top: 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cal-season { font-size: 11px; color: var(--ink-3); }
.card { position: relative; }
.cal-title b { font-size: 17px; display: block; }
.cal-sum { font-size: 12px; color: var(--ink-2); }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
.cal-wk { text-align: center; font-size: 12px; color: var(--ink-2); padding-bottom: 2px; }
.cal-cell {
  position: relative; aspect-ratio: 1 / .82; border-radius: 12px; padding: 6px 8px;
  background: rgba(255, 255, 255, .55); border: 1px solid var(--line);
  background-size: cover; background-position: center; cursor: pointer;
  transition: transform .12s, box-shadow .12s; overflow: hidden;
}
.cal-cell:hover:not(.blank):not(.future) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(240, 147, 75, .15); }
.cal-cell.blank { background: transparent; border: none; cursor: default; }
.cal-cell.future { opacity: .4; cursor: default; }
.cal-cell.today { border: 2px solid var(--brand); background-color: #fff3d9; }
.cal-cell.has { background-color: #fff8ee; }
.cal-d {
  font-size: 14px; font-weight: 700; color: var(--ink);
  background: rgba(255, 255, 255, .85); border-radius: 6px; padding: 0 5px;
}
.cal-mood {
  position: absolute; top: 6px; right: 6px; font-size: 11px; color: #fff; font-weight: 700;
  border-radius: 999px; padding: 0 7px;
}
.cal-count {
  position: absolute; left: 6px; bottom: 6px; font-size: 11px; color: var(--brand-deep);
  background: rgba(255, 255, 255, .88); border-radius: 6px; padding: 0 5px;
}
.cal-legend { display: flex; gap: 14px; justify-content: center; margin-top: 14px; font-size: 12px; color: var(--ink-2); flex-wrap: wrap; }
.cal-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: -1px; }
@media (max-width: 767px) {
  .cal-grid { gap: 4px; }
  .cal-cell { padding: 3px 4px; border-radius: 8px; }
  .cal-mood { display: none; }
  .cal-count { font-size: 10px; }
}
</style>
