<template>
  <!-- 会长大的城堡：月龄生日加一层，每 10 个会说的词添一块砖，每个里程碑插一面旗，
       每本读完的书点一盏灯，每个去过的地方院子里多一株小树。只长不倒。
       随季节换装：春发芽、夏出太阳、秋金黄落叶、冬飘雪盖顶。 -->
  <svg :viewBox="`0 0 320 ${VB_H}`" :width="width" :height="Math.round(width * VB_H / 320)" class="castle" role="img">
    <title>小宝的城堡</title>
    <desc>{{ summary }}</desc>
    <!-- 天空（随季节换色） -->
    <rect x="0" :y="skyTop" width="320" :height="GROUND - skyTop + 4" :fill="C.sky" />
    <!-- 夏天的小太阳 -->
    <g v-if="season === '夏'" :transform="`translate(36, ${skyTop + 26})`">
      <circle r="11" fill="#f7c94f" />
      <g stroke="#f7c94f" stroke-width="2" stroke-linecap="round">
        <line v-for="a in 8" :key="a" :x1="sunRay(a, 15).x" :y1="sunRay(a, 15).y" :x2="sunRay(a, 19).x" :y2="sunRay(a, 19).y" />
      </g>
    </g>
    <!-- 冬天飘雪 -->
    <g v-if="season === '冬'" fill="#ffffff" opacity=".9">
      <circle v-for="(s, i) in snowflakes" :key="'s' + i" :cx="s[0]" :cy="s[1] + skyTop + 30" :r="s[2]" />
    </g>
    <!-- 秋天飘叶 -->
    <g v-if="season === '秋'">
      <ellipse v-for="(l, i) in leaves" :key="'l' + i" :cx="l[0]" :cy="l[1] + skyTop + 30" rx="5" ry="2.6" :fill="l[2]" :transform="`rotate(${l[3]} ${l[0]} ${l[1] + skyTop + 30})`" />
    </g>
    <!-- 地面与小河 -->
    <rect x="0" :y="GROUND" width="320" height="22" :fill="C.ground" />
    <path :d="`M0 ${GROUND + 22} Q 30 ${GROUND + 30} 60 ${GROUND + 22} T 120 ${GROUND + 22} T 180 ${GROUND + 22} T 240 ${GROUND + 22} T 300 ${GROUND + 22} T 360 ${GROUND + 22} L 320 ${GROUND + 40} L 0 ${GROUND + 40} Z`" :fill="C.water" />
    <!-- 院子里的小树（去过的地方）；春天开花、秋天金黄、冬天挂雪 -->
    <g v-for="(b, i) in bushes" :key="i" :transform="`translate(${bushX(i)}, ${GROUND - 10})`">
      <rect x="-2" y="6" width="4" height="8" fill="#8a6b45" />
      <circle r="8" cx="0" cy="0" :fill="bushColor(i)" />
      <circle r="4" cx="5" cy="-5" :fill="bushColor(i, true)" />
      <g v-if="season === '春'" fill="#f4a9c0">
        <circle cx="-4" cy="-2" r="1.8" /><circle cx="3" cy="-6" r="1.8" /><circle cx="4" cy="2" r="1.8" />
      </g>
      <ellipse v-if="season === '冬'" cx="0" cy="-6" rx="6" ry="2.6" fill="#fff" />
    </g>
    <!-- 旗杆 -->
    <line :x1="TX1" :y1="towerTop" :x2="TX1" :y2="towerTop - 10" :stroke="C.stroke" stroke-width="1.5" />
    <line :x1="TX2" :y1="towerTop" :x2="TX2" :y2="towerTop - 10" :stroke="C.stroke" stroke-width="1.5" />
    <!-- 里程碑旗 -->
    <path v-for="i in flags" :key="'f' + i" :d="`M${flagX(i)} ${towerTop - 10} l 16 5 l -16 5 Z`" :fill="C.flag" />
    <!-- 左塔 / 右塔（冬天屋顶积雪） -->
    <rect :x="TX1 - 18" :y="towerTop" width="36" :height="towerH" :fill="C.tower" :stroke="C.stroke" />
    <rect :x="TX2 - 18" :y="towerTop" width="36" :height="towerH" :fill="C.tower" :stroke="C.stroke" />
    <path :d="`M${TX1 - 22} ${towerTop} L${TX1} ${towerTop - 16} L${TX1 + 22} ${towerTop} Z`" :fill="C.roof" />
    <path :d="`M${TX2 - 22} ${towerTop} L${TX2} ${towerTop - 16} L${TX2 + 22} ${towerTop} Z`" :fill="C.roof" />
    <template v-if="season === '冬'">
      <path :d="`M${TX1 - 22} ${towerTop} L${TX1} ${towerTop - 16} L${TX1 + 22} ${towerTop} Z`" fill="#fff" opacity=".85" />
      <path :d="`M${TX2 - 22} ${towerTop} L${TX2} ${towerTop - 16} L${TX2 + 22} ${towerTop} Z`" fill="#fff" opacity=".85" />
    </template>
    <rect :x="TX1 - 5" :y="towerTop + 26" width="10" height="14" rx="2" :fill="C.wall" />
    <rect :x="TX2 - 5" :y="towerTop + 26" width="10" height="14" rx="2" :fill="C.wall" />
    <!-- 城墙（层数 = 月龄生日次数） -->
    <rect
      v-for="i in floors" :key="'fl' + i"
      :x="80" :y="GROUND - i * FLOOR_H" width="160" :height="FLOOR_H"
      :fill="i % 2 ? C.wallA : C.wallB" :stroke="C.stroke" stroke-width="1"
    />
    <!-- 城垛：会说的词；冬天垛上落雪 -->
    <rect
      v-for="i in bricks" :key="'br' + i"
      :x="84 + (i - 1) * 21" :y="wallTop - 7" width="13" height="7" rx="1.5" :fill="C.brick"
    />
    <rect v-if="season === '冬'" :x="80" :y="wallTop - 9" width="160" height="4" rx="2" fill="#fff" opacity=".9" />
    <!-- 灯：读完的书 -->
    <rect
      v-for="w in windows" :key="'w' + w.i"
      :x="w.x" :y="w.y" width="9" height="12" rx="2"
      :fill="w.lit ? C.lit : C.dark"
    />
    <!-- 大门 -->
    <path :d="`M146 ${GROUND} L146 ${GROUND - 22} A14 13 0 0 1 174 ${GROUND - 22} L174 ${GROUND} Z`" :fill="C.door" :stroke="C.stroke" />
    <circle cx="166" :cy="GROUND - 10" r="2" fill="#f5d58a" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { store, babyMonths, babyDayOfLife, todayStr } from '../store.js'
import { seasonOf } from '../utils/solarTerms.js'

defineProps({
  width: { type: Number, default: 300 },
})

// 季节皮肤
const SEASONS = {
  春: { sky: '#eaf6e0', ground: '#a5d18b', water: '#a9cdea', bushes: ['#6fb25a', '#5f9c4f'], bushHi: ['#83c06c', '#6dab5c'] },
  夏: { sky: '#e3f1ff', ground: '#8fc96f', water: '#7fb8e8', bushes: ['#4f9c46', '#3f8c3d'], bushHi: ['#63ad58', '#519a4c'] },
  秋: { sky: '#fdf0d8', ground: '#d8c07e', water: '#a9cdea', bushes: ['#d99a4e', '#c9825b'], bushHi: ['#e3aa62', '#d4906a'] },
  冬: { sky: '#eef4fb', ground: '#e8eef5', water: '#b8cfe6', bushes: ['#9db3c4', '#8ba3b5'], bushHi: ['#adc0d0', '#9bb2c3'] },
}
const season = computed(() => seasonOf(todayStr()))
const SP = computed(() => SEASONS[season.value])
const bushColor = (i, hi) => (hi ? SP.value.bushHi : SP.value.bushes)[i % 2]

const BASE = {
  wall: '#f3d9ad', wallA: '#f3d9ad', wallB: '#eecfa0', brick: '#e0b87e',
  tower: '#f0b06e', roof: '#d97f5a', door: '#a06b3c', stroke: '#c98d5f',
  flag: '#d4537e', lit: '#f7c94f', dark: '#9c8b74',
}
const C = computed(() => ({ ...BASE, sky: SP.value.sky, ground: SP.value.ground, water: SP.value.water }))

// 雪花与落叶的位置固定，不随机，免得每次渲染跳动
const snowflakes = [[20, 10, 1.6], [60, 26, 1.2], [105, 6, 1.8], [150, 22, 1.3], [195, 12, 1.7], [238, 28, 1.2], [282, 8, 1.6], [305, 20, 1.2]]
const leaves = [[30, 30, '#d99a4e', 20], [90, 14, '#c9825b', -25], [170, 34, '#e0a53b', 40], [250, 18, '#c9825b', -15], [296, 30, '#d99a4e', 30]]

const GROUND = 116
const FLOOR_H = 24
const TX1 = 54
const TX2 = 266

const floors = computed(() => Math.min(1 + babyMonths(), 12))
const bricks = computed(() => Math.min(Math.floor(store.words.filter(w => ['词语', '发音'].includes(w.kind)).length / 10), 7))
const flags = computed(() => Math.min(store.milestones.length, 8))
const windows = computed(() => {
  const readBooks = store.books.filter(b => (b.reads || []).length).length
  const out = []
  for (let f = 0; f < floors.value; f++) {
    for (let k = 0; k < 3; k++) {
      out.push({ i: f * 3 + k, x: 100 + k * 46, y: GROUND - f * FLOOR_H - FLOOR_H + 7, lit: f * 3 + k < readBooks })
    }
  }
  return out
})
const bushes = computed(() => Math.min(new Set(store.trips.map(t => t.place)).size, 6))

const wallTop = computed(() => GROUND - floors.value * FLOOR_H)
const towerH = computed(() => floors.value * FLOOR_H + 30)
const towerTop = computed(() => GROUND - towerH.value)
// 画布高度跟着城堡走：加层、插旗都不会被裁掉（顶部留 20px 给旗杆）
const VB_H = computed(() => (GROUND + 40) + Math.max(0, 20 - wallTop.value))
const skyTop = computed(() => Math.min(wallTop.value, towerTop.value) - 20)
const flagX = i => (i % 2 ? TX1 : TX2) + (i > 2 ? 4 : 0)
const bushX = i => 24 + i * 46 + (i % 2 ? 10 : 0)
const sunRay = (a, r) => {
  const rad = (a * 45 - 90) * Math.PI / 180
  return { x: (r * Math.cos(rad)).toFixed(1), y: (r * Math.sin(rad)).toFixed(1) }
}

const summary = computed(() => {
  const d = babyDayOfLife()
  return `城堡 ${floors.value} 层，城垛 ${bricks.value} 块砖，塔上 ${flags.value} 面旗，${windows.value.filter(w => w.lit).length} 盏灯，院子里 ${bushes.value} 株小树${d ? `（出生第 ${d} 天）` : ''}，现在是${season.value}天`
})
</script>

<style scoped>
.castle { display: block; }
</style>
