<template>
  <div>
    <div class="view-head">
      <h2>分册</h2>
      <div class="sub">同一本日记，按主题分开放。点卡片进去翻。</div>
    </div>

    <div class="col-grid">
      <div class="card col-card">
        <div class="card-title"><span class="ct-left"><Icon name="library" :size="16" />阅读与识字</span></div>
        <p class="col-desc">书房、词库和翻卡巩固都在这。</p>
        <p class="col-sum">{{ readSum }}</p>
        <div class="col-links">
          <a @click="$emit('go', 'shelf')">书房</a>
          <a @click="$emit('go', 'words')">识字词库</a>
          <a @click="$emit('go', 'cards')">翻卡巩固</a>
        </div>
      </div>

      <div class="card col-card">
        <div class="card-title"><span class="ct-left"><Icon name="sparkles" :size="16" />游戏与玩具</span></div>
        <p class="col-desc">玩过的游戏、家里的玩具。</p>
        <p class="col-sum">{{ playSum }}</p>
        <div class="col-links">
          <a @click="$emit('go', 'games')">游戏册</a>
          <a @click="$emit('go', 'toys')">玩具屋</a>
        </div>
      </div>

      <div class="card col-card">
        <div class="card-title"><span class="ct-left"><Icon name="utensils" :size="16" />饮食记录</span></div>
        <p class="col-desc">每天吃了什么，彩虹餐盘在这。</p>
        <p class="col-sum">{{ dietSum }}</p>
        <div class="col-links"><a @click="$emit('go', 'diet')">饮食册</a></div>
      </div>

      <div class="card col-card">
        <div class="card-title"><span class="ct-left"><Icon name="map-pin" :size="16" />出行足迹</span></div>
        <p class="col-desc">去过的地方和路上记的事。</p>
        <p class="col-sum">{{ tripSum }}</p>
        <div class="col-links"><a @click="$emit('go', 'trips')">足迹册</a></div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 分册总览：只做导航和已有数据摘要，不产生任何新业务数据
import { computed } from 'vue'
import { store } from '../store.js'
import Icon from '../components/Icon.vue'

defineEmits(['go'])

const readSum = computed(() => {
  const b = store.books.length
  const w = store.words.length
  if (!b && !w) return '还没开始：先添加一本绘本，或在今天的日记里记下她说的新词'
  const parts = []
  if (b) parts.push(`藏书 ${b} 本`)
  if (w) parts.push(`记下 ${w} 个词`)
  return parts.join(' · ')
})
const playSum = computed(() => {
  const g = store.games.length
  const t = store.toys.length
  if (!g && !t) return '还没记过游戏，今天在日记里点「玩了」就能记'
  const parts = []
  if (g) parts.push(`${g} 种游戏`)
  if (t) parts.push(`${t} 件玩具`)
  return parts.join(' · ')
})
const dietSum = computed(() =>
  store.meals.length ? `记了 ${store.meals.length} 餐` : '还没记过餐食，今天在日记里点「吃了」就能记'
)
const tripSum = computed(() => {
  if (!store.trips.length) return '还没出过门的记录，今天在日记里点「去了」就能记'
  const latest = [...store.trips].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
  return `${store.trips.length} 个足迹 · 最近一次 ${latest.date || ''} ${latest.place || latest.title || ''}`.trim()
})
</script>

<style scoped>
.col-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.col-card { display: flex; flex-direction: column; }
.col-desc { font-size: 12.5px; color: var(--ink-3); margin: 2px 0 6px; }
.col-sum { font-size: 13px; color: var(--ink-2); margin: 0 0 10px; flex: 1; }
.col-links { display: flex; gap: 8px; flex-wrap: wrap; }
.col-links a {
  font-size: 13px; color: var(--brand-deep); cursor: pointer;
  background: rgba(240, 147, 75, .1); border-radius: 999px; padding: 5px 14px;
}
.col-links a:hover { background: rgba(240, 147, 75, .2); }
@media (max-width: 767px) { .col-grid { grid-template-columns: 1fr; } }
</style>
