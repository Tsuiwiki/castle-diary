<template>
  <div class="view-head">
    <h2>日记日历</h2>
    <div class="sub">点一天先看看那天记了什么，想细看再翻开日记；颜色是{{ ta() }}那天的心情</div>
  </div>

  <div class="card">
    <div class="cal-nav">
      <button class="mini-btn ghost" @click="shift(-1)"><Icon name="chevron-left" :size="14" />上个月</button>
      <div class="cal-title">
        <b>{{ year }} 年 {{ month }} 月</b>
        <span class="cal-sum">本月记了 {{ writtenDays }} 天</span>
      </div>
      <div class="cal-castle" :title="`城堡：月龄生日加一层，词添砖、里程碑插旗、读完的书点灯、去过的地方种树；随季节换装`">
        <CastleSvg :width="118" :date="`${ym}-15`" />
        <span class="cal-season">{{ seasonName }}</span>
      </div>
      <button class="mini-btn ghost" :disabled="isCurrentMonth" @click="shift(1)">下个月<Icon name="chevron-right" :size="14" /></button>
    </div>

    <div class="cal-grid">
      <div v-for="w in WEEK" :key="w" class="cal-wk">{{ w }}</div>
      <div
        v-for="(c, i) in cells" :key="i"
        class="cal-cell"
        :class="{ blank: !c, future: c && c.future, today: c && c.isToday, has: c && c.info, sel: c && c.date === picked }"
        :style="c && c.info?.photo ? { backgroundImage: `url(${c.info.photo})` } : null"
        @click="c && !c.future && pick(c.date)"
      >
        <template v-if="c">
          <span class="cal-d">{{ c.day }}</span>
          <span v-if="c.mood" class="cal-mood" :style="{ background: c.mood.color }">{{ c.mood.key }}</span>
          <!-- 彩色小条：吃了/去了/读了/说了/玩了/病了/节点/照片，颜色与日记正文词条一致 -->
          <span v-if="c.info" class="cal-bars">
            <span v-for="k in KIND_ORDER.filter(k => c.info.kinds[k])" :key="k" class="cal-bar" :class="'cb-' + k" :title="KIND_LABELS[k] + ' ' + c.info.kinds[k]">
              <Icon :name="KIND_ICONS[k]" :size="10" />{{ c.info.kinds[k] }}
            </span>
          </span>
          <span v-if="c.info?.count" class="cal-count">{{ c.info.count }} 条</span>
        </template>
      </div>
    </div>

    <!-- 选中那天的轻摘要 -->
    <div v-if="picked" class="day-peek">
      <div class="dp-head">
        <b>{{ picked.slice(5).replace('-', '/') }}</b>
        <span v-if="peekMood" class="dp-mood" :style="{ background: peekMood.color }">{{ peekMood.key }}</span>
        <span class="dp-count">{{ peekLines.length ? peekAll + ' 条记录' : '' }}</span>
        <button class="dp-close" aria-label="收起" @click="picked = ''">✕</button>
      </div>
      <template v-if="peekLines.length || peekPhotos.length">
        <div v-for="(l, i) in peekLines" :key="i" class="dp-line">{{ l }}</div>
        <div v-if="peekMore" class="dp-line dp-more">…等 {{ peekAll }} 条</div>
        <div v-if="peekPhotos.length" class="dp-photos"><img v-for="p in peekPhotos" :key="p.id" :src="p.imageUrl" /></div>
      </template>
      <div v-else class="dp-line dp-more">这天还没记，去补上 →</div>
      <button class="mini-btn dp-open" @click="open(picked)">翻开这一天的日记 →</button>
    </div>

    <div class="cal-legend">
      <span v-for="m in MOODS" :key="m.key"><i :style="{ background: m.color }"></i>{{ m.key }}</span>
    </div>
  </div>
</template>

<script setup>
import { ta, her } from '../store.js'
import { ref, computed } from 'vue'
import Icon from '../components/Icon.vue'
import { store, MOODS, diaryDate, todayStr, getDayState } from '../store.js'
import { monthIndex, dayLines } from '../utils/diaryText.js'
import CastleSvg from '../components/CastleSvg.vue'
import { seasonOf } from '../utils/solarTerms.js'

const today = todayStr()

const emit = defineEmits(['go'])
const WEEK = ['一', '二', '三', '四', '五', '六', '日']
// 日历格子里的彩色小条：顺序 / 图标 / 名称（颜色见 .cb-*，与日记正文 .tk-* 同色）
const KIND_ORDER = ['food', 'trip', 'read', 'word', 'play', 'photo', 'sick', 'health', 'milestone']
const KIND_ICONS = { food: 'utensils', trip: 'map-pin', read: 'library', word: 'message-circle', play: 'sparkles', photo: 'camera', sick: 'heart-pulse', health: 'plus', milestone: 'flag' }
const KIND_LABELS = { food: '吃了', trip: '去了', read: '读了', word: '说了', play: '玩了', photo: '照片', sick: '不舒服', health: '健康', milestone: '成长节点' }
const p2 = n => String(n).padStart(2, '0')

const now = new Date()
const cursor = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth() + 1)
const ym = computed(() => `${year.value}-${p2(month.value)}`)
const isCurrentMonth = computed(() => ym.value === todayStr().slice(0, 7))

function shift(n) {
  cursor.value = new Date(year.value, cursor.value.getMonth() + n, 1)
  picked.value = '' // 翻月收起摘要
}

// ---------- 选中那天的轻摘要 ----------
const picked = ref('')
function pick(date) {
  picked.value = picked.value === date ? '' : date
}
const peekMood = computed(() => {
  const m = getDayState(picked.value)
  return m ? MOODS.find(x => x.key === m) : null
})
const peekAllLines = computed(() => picked.value ? (dayLines(picked.value).lines || []).map(l => l.tokens.map(t => t.v).join('')).filter(Boolean) : [])
const peekAll = computed(() => peekAllLines.value.length)
const peekLines = computed(() => peekAllLines.value.slice(0, 6))
const peekMore = computed(() => peekAll.value > 6)
const peekPhotos = computed(() => picked.value ? store.photos.filter(p => p.date === picked.value && p.imageUrl).slice(0, 3) : [])

const index = computed(() => monthIndex(ym.value))
const writtenDays = computed(() => Object.keys(index.value).length)
// 季节名（城堡随季节换装；写作天数用文字表达，不再压城堡的颜色）
const seasonName = computed(() => seasonOf(`${ym.value}-15`) + '天')
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
.cal-nav { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 14px; }
.cal-title { text-align: center; }
.cal-castle { flex: none; display: flex; flex-direction: column; align-items: center; gap: 2px; }
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
.cal-bars { position: absolute; left: 6px; right: 6px; top: 50%; transform: translateY(-50%); display: flex; flex-wrap: wrap; gap: 3px; }
.cal-bar { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700; border-radius: 5px; padding: 0 4px; line-height: 15px; font-variant-numeric: tabular-nums; }
.cb-food { color: #3f7a1c; background: rgba(143, 191, 95, .2); }
.cb-trip { color: #245d96; background: rgba(106, 166, 216, .22); }
.cb-read { color: #a55a10; background: rgba(240, 160, 80, .2); }
.cb-word { color: #a23a62; background: rgba(229, 143, 174, .22); }
.cb-play { color: #4e3fa8; background: rgba(155, 143, 208, .24); }
.cb-photo { color: #c2701c; background: rgba(245, 167, 66, .2); }
.cb-sick { color: #b8452c; background: rgba(229, 103, 90, .18); }
.cb-health { color: #1f7f6b; background: rgba(42, 160, 130, .18); }
.cb-milestone { color: #5b4bb0; background: rgba(155, 143, 208, .24); }
.cal-cell.sel { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(240, 147, 75, .35); }
.day-peek { margin-top: 12px; border-top: 1px dashed var(--line); padding-top: 12px; }
.dp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dp-head b { font-size: 15px; }
.dp-mood { color: #fff; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 8px; }
.dp-count { font-size: 11.5px; color: var(--ink-3); }
.dp-close { margin-left: auto; border: none; background: none; color: var(--ink-3); cursor: pointer; font-size: 13px; padding: 2px 6px; }
.dp-line { font-size: 13px; color: var(--ink); line-height: 1.7; }
.dp-more { color: var(--ink-3); font-size: 12px; }
.dp-photos { display: flex; gap: 6px; margin-top: 6px; }
.dp-photos img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; }
.dp-open { margin-top: 10px; }
.cal-legend { display: flex; gap: 14px; justify-content: center; margin-top: 14px; font-size: 12px; color: var(--ink-2); flex-wrap: wrap; }
.cal-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: -1px; }
@media (max-width: 767px) {
  .cal-grid { gap: 4px; }
  .cal-cell { padding: 3px 4px; border-radius: 8px; }
  /* 心情不整块隐藏，缩成小色点保留信息 */
  .cal-mood { font-size: 0; width: 9px; height: 9px; padding: 0; top: 5px; right: 5px; }
  .cal-count { font-size: 10px; }
  .cal-bars { gap: 2px; }
  .cal-bar { font-size: 9px; padding: 0 3px; line-height: 13px; }
  /* 顶部改两层：第一行月份 + 统计，第二行翻月按钮；城堡在窄屏隐藏避免拥挤 */
  .cal-nav { flex-wrap: wrap; align-items: center; row-gap: 8px; }
  .cal-title { order: -1; width: 100%; display: flex; align-items: baseline; justify-content: space-between; }
  .cal-castle { display: none; }
}
</style>
