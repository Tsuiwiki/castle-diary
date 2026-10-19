<template>
  <div>
    <div class="view-head">
      <h2>第一次与重要时刻</h2>
      <div class="sub">第一次的表达、第一次的体验，和值得珍藏的瞬间——城堡上的旗，一面一个</div>
    </div>

    <div class="card">
      <div v-for="m in moments" :key="m.id" class="mo-item" @click="openDay(m.date)">
        <img v-if="photoOf(m)" class="mo-photo" :src="photoOf(m).imageUrl" alt="" @click.stop="lightbox = photoOf(m)" />
        <div v-else class="mo-flag"><Icon name="flag" :size="15" /></div>
        <div class="mo-body">
          <div class="mo-title">{{ m.title }}</div>
          <div class="mo-meta">
            <span>{{ shortDate(m.date) }}<template v-if="ageOf(m.date)"> · {{ ageOf(m.date) }}</template></span>
            <a class="mo-link">看那天 →</a>
          </div>
        </div>
      </div>
      <div v-if="!moments.length" class="empty">
        还没有记过「第一次」。日记里贴纸记下第一次做的事时会自动插旗；也可以在相册把照片挂到里程碑上
      </div>
    </div>

    <!-- 大图灯箱 -->
    <div v-if="lightbox" class="drawer-mask" @click="lightbox = null">
      <div class="lightbox" @click.stop>
        <img :src="lightbox.imageUrl" />
      </div>
    </div>
  </div>
</template>

<script setup>
// 第一次与重要时刻：用户主动记下的里程碑（排除餐桌/游戏自动生成的条目，与城堡旗、年度时间轴同口径）。
// 只读 milestones/photos，录入源仍是日记贴纸（首尝/第一次）与相册的里程碑挂接。
import { ref, computed } from 'vue'
import { store, diaryDate, babyAgeText } from '../store.js'
import Icon from '../components/Icon.vue'

const emit = defineEmits(['go'])
const lightbox = ref(null)

const moments = computed(() =>
  store.milestones
    .filter(m => m.source !== '餐桌' && m.source !== '游戏')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)

const photoOf = m => m.photoId ? store.photos.find(p => p.id === m.photoId && p.imageUrl) : null
const shortDate = d => d ? `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日` : ''
const ageCache = new Map()
const ageOf = d => {
  if (!ageCache.has(d)) ageCache.set(d, babyAgeText(d))
  return ageCache.get(d)
}

function openDay(date) {
  diaryDate.value = date
  emit('go', 'diary')
}
</script>

<style scoped>
.mo-item { display: flex; gap: 14px; align-items: center; padding: 12px 4px; border-bottom: 1px dashed rgba(226, 160, 110, .35); cursor: pointer; border-radius: 8px; }
.mo-item:hover { background: rgba(240, 147, 75, .06); }
.mo-item:last-of-type { border-bottom: none; }
.mo-photo { width: 74px; height: 74px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(226, 160, 110, .5); }
.mo-flag { width: 74px; height: 74px; border-radius: 10px; background: rgba(240, 147, 75, .12); color: var(--brand-deep); display: flex; align-items: center; justify-content: center; flex: none; }
.mo-body { flex: 1; }
.mo-title { font-size: 16px; color: #4a3520; }
.mo-meta { display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: var(--ink-3); }
.mo-link { color: var(--brand-deep); }
.empty { text-align: center; color: var(--ink-2); padding: 30px 10px; }
.lightbox { background: #fffdf8; border-radius: 16px; padding: 16px; max-width: min(720px, 92vw); }
.lightbox img { display: block; max-width: 100%; max-height: 70vh; border-radius: 8px; }
</style>
