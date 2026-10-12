<template>
  <!-- 彩虹餐盘：5 格对应主食 / 蔬菜 / 水果 / 肉蛋鱼 / 奶豆，吃到了哪类哪格上色 -->
  <svg :width="size" :height="size" viewBox="0 0 40 40" class="plate" role="img">
    <title>{{ title }}</title>
    <circle cx="20" cy="20" r="19" fill="#fff" stroke="#e6d6bf" stroke-width="1" />
    <path
      v-for="(g, i) in FOOD_GROUPS" :key="g.key"
      :d="sector(i)"
      :fill="has(g.key) ? g.color : '#f3ece1'"
      stroke="#fff" stroke-width="1.2"
    />
    <circle cx="20" cy="20" r="5" fill="#fff" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { FOOD_GROUPS } from '../utils/foodGroups.js'

const props = defineProps({
  groups: { type: [Set, Array], default: () => [] },
  size: { type: Number, default: 40 },
})
const set = computed(() => (props.groups instanceof Set ? props.groups : new Set(props.groups)))
const has = k => set.value.has(k)
const title = computed(() => {
  const hit = FOOD_GROUPS.filter(g => has(g.key)).map(g => g.key)
  return hit.length ? `吃到了：${hit.join('、')}` : '没有记录'
})

const R = 17
function pt(deg) {
  const r = (deg - 90) * Math.PI / 180
  return `${(20 + R * Math.cos(r)).toFixed(2)} ${(20 + R * Math.sin(r)).toFixed(2)}`
}
function sector(i) {
  const a = i * 72
  return `M20 20 L${pt(a)} A${R} ${R} 0 0 1 ${pt(a + 72)} Z`
}
</script>

<style scoped>
.plate { display: block; flex: none; }
</style>
