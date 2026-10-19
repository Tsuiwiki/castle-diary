<template>
  <div>
    <div class="view-head">
      <h2>回忆</h2>
      <div class="sub">把日常记录，慢慢变成值得珍藏的记忆</div>
    </div>

    <!-- 最近珍藏 -->
    <div v-if="recentQuotes.length || recentMoments.length" class="card">
      <div class="card-title"><span class="ct-left"><Icon name="sparkles" :size="16" />最近珍藏</span></div>
      <div class="treasure">
        <blockquote v-for="w in recentQuotes" :key="w.id" class="tr-quote" @click="openDay(w.date)">
          “{{ w.word }}”<span class="tr-meta">{{ shortDate(w.date) }} · 看那天 →</span>
        </blockquote>
        <div v-for="m in recentMoments" :key="m.id" class="tr-moment" @click="openDay(m.date)">
          <span class="tr-dot"></span>{{ m.title }}<span class="tr-meta">{{ shortDate(m.date) }} · 看那天 →</span>
        </div>
      </div>
    </div>

    <!-- 记忆入口 -->
    <div class="col-grid">
      <div class="card col-card" @click="$emit('go', 'calendar')">
        <div class="card-title"><span class="ct-left"><Icon name="calendar" :size="16" />往日日记</span></div>
        <p class="col-desc">按日期找回当天的记录。</p>
        <p class="col-sum">{{ daysThisMonth ? `本月记了 ${daysThisMonth} 天` : '想找某一天，从这翻' }}</p>
      </div>
      <div class="card col-card" @click="$emit('go', 'album')">
        <div class="card-title"><span class="ct-left"><Icon name="camera" :size="16" />相册</span></div>
        <p class="col-desc">用照片找回某一天、某个场景。</p>
        <p class="col-sum">{{ store.photos.length ? `${store.photos.length} 张照片` : '日记里加照片，就会在这里' }}</p>
      </div>
      <div class="card col-card" @click="$emit('go', 'quotes')">
        <div class="card-title"><span class="ct-left"><Icon name="message-circle" :size="16" />{{ ta() }}说过的话</span></div>
        <p class="col-desc">原话、可爱表达和会唱的歌。</p>
        <p class="col-sum">{{ spokenCount ? `${spokenCount} 句${quoteCount ? ` · ${quoteCount} 个金句` : ''}` : her('日记里点「她说」记下的话，会收进这里') }}</p>
      </div>
      <div class="card col-card" @click="$emit('go', 'moments')">
        <div class="card-title"><span class="ct-left"><Icon name="award" :size="16" />第一次与重要时刻</span></div>
        <p class="col-desc">第一次的表达、体验和值得珍藏的瞬间。</p>
        <p class="col-sum">{{ momentCount ? `${momentCount} 个重要时刻` : '记下「第一次」，就插上第一面旗' }}</p>
      </div>
      <div class="card col-card" @click="$emit('go', 'weekly')">
        <div class="card-title"><span class="ct-left"><Icon name="calendar" :size="16" />成长周报</span></div>
        <p class="col-desc">按周回顾生活片段。</p>
        <p class="col-sum">这一周过得怎么样，翻翻就知道</p>
      </div>
      <div class="card col-card" @click="$emit('go', 'year')">
        <div class="card-title"><span class="ct-left"><Icon name="award" :size="16" />年度回顾</span></div>
        <p class="col-desc">回看一整年的照片、故事与重要时刻。</p>
        <p class="col-sum">{{ yearCount ? `${yearCount} 段回忆，还能印成一本书` : '到年底，这里会有一整年的故事' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// 回忆总览（记忆收藏室）：只做导航和"最近珍藏"，不产生任何新数据
import { computed } from 'vue'
import { store, diaryDate, todayStr, her, ta } from '../store.js'
import { monthIndex } from '../utils/diaryText.js'
import Icon from '../components/Icon.vue'

const emit = defineEmits(['go'])

const shortDate = d => `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`

// 真实表达（不含识字）与重要时刻，和 QuotesView / MomentsView 同一口径
const spokenWords = computed(() => store.words.filter(w => w.kind !== '识字'))
const spokenCount = computed(() => spokenWords.value.length)
const quoteCount = computed(() => spokenWords.value.filter(w => w.funny).length)
const realMoments = computed(() => store.milestones.filter(m => m.source !== '餐桌' && m.source !== '游戏'))
const momentCount = computed(() => realMoments.value.length)

const recentQuotes = computed(() => spokenWords.value.filter(w => w.funny || w.kind === '句子').slice(0, 2))
const recentMoments = computed(() => [...realMoments.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2))

const daysThisMonth = computed(() => Object.keys(monthIndex(todayStr().slice(0, 7))).length)
const yearCount = computed(() => {
  const y = todayStr().slice(0, 4)
  return store.diaries.filter(d => (d.date || '').startsWith(y) && d.text).length
    + store.photos.filter(p => (p.date || '').startsWith(y)).length
})

function openDay(date) {
  diaryDate.value = date
  emit('go', 'diary')
}
</script>

<style scoped>
.treasure { display: flex; flex-direction: column; gap: 8px; }
.tr-quote { margin: 0; font-family: "KaiTi", "STKaiti", serif; font-size: 17px; color: #4a3520; cursor: pointer; }
.tr-quote:hover .tr-meta, .tr-moment:hover .tr-meta { color: var(--brand-deep); }
.tr-moment { font-size: 14px; color: #4a3520; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.tr-dot { width: 8px; height: 8px; border-radius: 50%; background: #e0a15c; flex: none; }
.tr-meta { font-size: 12px; color: var(--ink-3); margin-left: 10px; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }

.col-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
.col-card { display: flex; flex-direction: column; cursor: pointer; }
.col-card:hover { border-color: rgba(240, 147, 75, .45); }
.col-desc { font-size: 12.5px; color: var(--ink-3); margin: 2px 0 6px; }
.col-sum { font-size: 13px; color: var(--ink-2); margin: 0; flex: 1; }
@media (max-width: 767px) { .col-grid { grid-template-columns: 1fr; } }
</style>
