<template>
  <div>
    <div class="view-head">
      <h2>{{ ta() }}说过的话</h2>
      <div class="sub">原话、可爱表达、会唱的歌谣——都是{{ ta() }}嘴里出来的{{ store.settings.childName ? '' : '话' }}，点「看那天」回到记下它的那一天</div>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <div class="chip-row">
        <span v-for="f in FILTERS" :key="f.key" class="chip" :class="{ sel: filter === f.key }" @click="filter = f.key">{{ f.label }}</span>
        <span class="q-sum">{{ filtered.length }} 句</span>
      </div>
    </div>

    <!-- 按月分组 -->
    <div v-for="g in groups" :key="g.ym" class="card q-month">
      <div class="q-month-head">{{ g.ymText }}</div>
      <div v-for="w in g.list" :key="w.id" class="q-item" :class="{ funny: w.funny }" @click="w.date && openDay(w.date)">
        <div class="q-body">
          <span class="q-word" :class="{ 'q-quote': w.funny || w.kind === '句子' }">{{ (w.funny || w.kind === '句子') ? `“${w.word}”` : w.word }}</span>
          <button v-if="w.audioUrl" class="q-play" :class="{ playing: playingUrl === w.audioUrl }" :title="playingUrl === w.audioUrl ? '停止' : '听录音'" @click.stop="playAudio(w.audioUrl)"><Icon name="volume" :size="14" /></button>
          <span v-if="w.funny" class="stamp stamp-金句">金句</span>
          <span class="q-kind">{{ w.kind }}</span>
        </div>
        <div class="q-meta">
          <span>{{ shortDate(w.date) }}<template v-if="ageOf(w.date)"> · {{ ageOf(w.date) }}</template></span>
          <a class="q-link">看那天 →</a>
        </div>
      </div>
    </div>

    <div v-if="!filtered.length" class="card empty">
      <template v-if="store.words.length">{{ her('词库里的识字内容不会出现在这里；日记里点「她说」记下的话，会收进这里') }}</template>
      <template v-else>{{ her('还没记过她说的话。今天她说了什么有意思的，去日记里点「她说」记下来') }}</template>
    </div>
  </div>
</template>

<script setup>
// 她说过的话：真实表达的回忆集合（不含词库里的「识字」——认识不等于主动说出）。
// 只读 words，单一录入源仍是日记的「她说」贴纸或词库页补录。
import { ref, computed } from 'vue'
import { store, diaryDate, babyAgeText, her, ta } from '../store.js'
import { playAudio, playingUrl } from '../utils/recorder.js'
import Icon from '../components/Icon.vue'

const emit = defineEmits(['go'])

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: '词语', label: '词语' },
  { key: '句子', label: '句子' },
  { key: '歌谣', label: '歌谣' },
  { key: 'funny', label: '✨ 金句' },
]
const filter = ref('all')

const spoken = computed(() => store.words.filter(w => w.kind !== '识字'))
const filtered = computed(() => {
  let list = spoken.value
  if (filter.value === 'funny') list = list.filter(w => w.funny)
  else if (filter.value !== 'all') list = list.filter(w => w.kind === filter.value)
  return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const groups = computed(() => {
  const map = new Map()
  for (const w of filtered.value) {
    const ym = (w.date || '').slice(0, 7)
    if (!ym) continue
    if (!map.has(ym)) map.set(ym, [])
    map.get(ym).push(w)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([ym, list]) => ({
    ym, list,
    ymText: `${Number(ym.slice(0, 4))} 年 ${Number(ym.slice(5, 7))} 月 · ${list.length} 句`,
  }))
})

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
.q-sum { margin-left: auto; font-size: 12px; color: var(--ink-3); align-self: center; }
.q-month { margin-top: 12px; }
.q-month-head { font-size: 13px; color: var(--brand-deep); font-weight: 700; margin-bottom: 6px; letter-spacing: 1px; }
.q-item { padding: 10px 4px; border-bottom: 1px dashed rgba(226, 160, 110, .35); cursor: pointer; border-radius: 8px; }
.q-item:hover { background: rgba(240, 147, 75, .06); }
.q-item:last-child { border-bottom: none; }
.q-body { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.q-word { font-size: 17px; color: #4a3520; }
.q-quote { font-family: "KaiTi", "STKaiti", serif; font-size: 19px; }
.q-item.funny .q-word { color: #8a4f1f; }
.q-play { border: none; background: rgba(240, 147, 75, .15); color: var(--brand-deep); border-radius: 999px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.q-play.playing { background: var(--brand); color: #fff; }
.stamp-金句 { background: #f6d38d; color: #7a4f10; }
.q-kind { margin-left: auto; font-size: 12px; color: var(--ink-3); border: 1px solid var(--line); border-radius: 999px; padding: 1px 9px; }
.q-meta { display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: var(--ink-3); }
.q-link { color: var(--brand-deep); }
.empty { text-align: center; color: var(--ink-2); padding: 30px 10px; }
</style>
