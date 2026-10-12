<template>
  <div class="view-head">
    <h2>小主人档案</h2>
    <div class="sub">生日 / 出生天数 / 最新身高体重 / 家底一览</div>
  </div>

  <!-- Hero 卡 -->
  <div class="card profile-hero">
    <div class="ph-avatar" @click="avatarInput.click()" title="点我换头像">
      <img v-if="store.settings.avatarUrl" :src="store.settings.avatarUrl" />
      <Icon v-else name="baby" :size="40" />
      <span class="ph-avatar-edit"><Icon name="camera" :size="12" /></span>
    </div>
    <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatar" />
    <div class="ph-info">
      <div class="ph-name">{{ store.settings.childName || '还没起名' }}</div>
      <div class="ph-sub">
        <span v-if="store.settings.birthday">🎂 {{ store.settings.birthday }}</span>
        <span v-if="dayOfLife">出生第 <b>{{ dayOfLife }}</b> 天</span>
        <span v-if="months != null">（{{ months }} 月龄）</span>
      </div>
      <div class="ph-sub dim" v-if="latest">
        最新记录 {{ latest.date }}：<template v-if="latest.height">身高 {{ latest.height }} cm</template><template v-if="latest.height && latest.weight"> · </template><template v-if="latest.weight">体重 {{ latest.weight }} kg</template>
      </div>
      <div class="ph-sub dim" v-else>还没有身高体重记录，去「健康档案」记一次体检吧</div>
    </div>
    <button class="mini-btn ghost" @click="$emit('go', 'settings')"><Icon name="settings" :size="13" />改名字/生日</button>
  </div>

  <!-- 她的数字：一句可以念出来的话 -->
  <div class="card story-card">
    <div class="story">
      <template v-for="(seg, i) in story" :key="i"><b v-if="seg.b">{{ seg.t }}</b><span v-else>{{ seg.t }}</span></template>
    </div>
    <button class="mini-btn ghost story-copy" @click="copyStory">{{ copied ? '已复制 ✓' : '复制这段话' }}</button>
  </div>

  <div class="stat-grid">
    <div class="stat-cell"><b>{{ spokenCount }}</b><span>会说的词</span></div>
    <div class="stat-cell"><b>{{ totalReads }}</b><span>读书次数</span></div>
    <div class="stat-cell"><b>{{ store.photos.length }}</b><span>照片</span></div>
    <div class="stat-cell"><b>{{ placeCount }}</b><span>去过的地方</span></div>
    <div class="stat-cell"><b>{{ gamesPlayed }}</b><span>玩过的游戏</span></div>
    <div class="stat-cell"><b>{{ vaccineDone }}<small>/{{ VACCINE_SCHEDULE.length }}</small></b><span>疫苗{{ vaccineLegacy ? ` +${vaccineLegacy} 历史` : '' }}</span></div>
  </div>

  <!-- 里程碑速览 -->
  <div class="card" v-if="recentMilestones.length">
    <div class="card-title"><span class="ct-left"><Icon name="flag" :size="16" />最近的里程碑</span></div>
    <div class="tl">
      <div v-for="m in recentMilestones" :key="m.id" class="tl-item">
        <span class="tl-date">{{ m.date }}</span>
        <span class="tl-dot"></span>
        <span class="tl-body">{{ m.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Icon from '../components/Icon.vue'
import { store, babyDayOfLife, babyMonths, latestGrowth, setAvatar, babyAgeText, growthPoints } from '../store.js'
import { VACCINE_SCHEDULE } from '../utils/vaccineSchedule.js'
import { compressImage } from '../utils/image.js'

defineEmits(['go'])

const avatarInput = ref(null)

const dayOfLife = computed(() => babyDayOfLife())
const months = computed(() => babyMonths())
const latest = computed(() => latestGrowth())
const totalReads = computed(() => store.books.reduce((s, b) => s + (b.reads?.length || 0), 0))
const masteredCount = computed(() => store.words.filter(w => w.mastered).length)
// 只数当前 2026 版程序里存在的剂次；旧版程序留下的历史记录单独标注，不混进"已接种"数
const VAC_KEYS = new Set(VACCINE_SCHEDULE.map(d => d.key))
const vaccineDone = computed(() => store.vaccines.filter(v => VAC_KEYS.has(v.id)).length)
const vaccineLegacy = computed(() => store.vaccines.filter(v => !VAC_KEYS.has(v.id)).length)
const spokenCount = computed(() => store.words.filter(w => ['词语', '发音'].includes(w.kind)).length)
const gamesPlayed = computed(() => store.games.filter(g => (g.plays || []).length).length)
const placeCount = computed(() => new Set(store.trips.map(t => t.place)).size)
const favBook = computed(() => [...store.books].sort((a, b) => (b.reads?.length || 0) - (a.reads?.length || 0))[0] || null)
// 一年左右长高了多少：最新身高 vs 约一年前（10~14 个月前）最近的那次
const heightGain = computed(() => {
  const pts = growthPoints().filter(p => p.height)
  if (pts.length < 2) return null
  const last = pts[pts.length - 1]
  const lastT = new Date(last.date + 'T00:00:00').getTime()
  const earlier = pts.filter(p => (lastT - new Date(p.date + 'T00:00:00').getTime()) / 86400000 >= 300)
  const base = earlier[earlier.length - 1] || pts[0]
  const months = Math.round((lastT - new Date(base.date + 'T00:00:00').getTime()) / 86400000 / 30.4)
  if (months < 1) return null
  return { cm: Math.round((last.height - base.height) * 10) / 10, months }
})
const story = computed(() => {
  const segs = []
  const t = (x, b = false) => segs.push({ t: x, b })
  const name = store.settings.childName || '宝宝'
  t(name)
  if (dayOfLife.value) { t('出生第 '); t(String(dayOfLife.value), true); t(` 天（${babyAgeText()}）`) }
  t('。')
  if (spokenCount.value) { t('她会说 '); t(String(spokenCount.value), true); t(' 个词') }
  else t('她还在攒第一个会说的词')
  const fb = favBook.value
  if (fb?.reads?.length) { t('，最爱的书是'); t(`《${fb.title}》`, true); t(`（读了 ${fb.reads.length} 次）`) }
  if (heightGain.value) {
    const g = heightGain.value
    t(`，${g.months >= 10 ? '这一年' : `这 ${g.months} 个月`}长高了 `); t(String(g.cm), true); t(' cm')
  } else if (latest.value?.height) {
    t('，现在身高 '); t(String(latest.value.height), true); t(' cm')
  }
  if (placeCount.value) { t('，去过 '); t(String(placeCount.value), true); t(' 个地方') }
  if (gamesPlayed.value) { t('，和爸爸妈妈玩过 '); t(String(gamesPlayed.value), true); t(' 种游戏') }
  t('，疫苗打了 '); t(`${vaccineDone.value} / ${VACCINE_SCHEDULE.length}`, true); t(' 针。')
  return segs
})
const copied = ref(false)
async function copyStory() {
  try {
    await navigator.clipboard.writeText(story.value.map(x => x.t).join(''))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch { /* 剪贴板不可用时忽略 */ }
}

const recentMilestones = computed(() =>
  [...store.milestones].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
)

async function onAvatar(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f || !f.type.startsWith('image/')) return
  const dataUrl = await compressImage(f, 400, 0.8)
  setAvatar(dataUrl)
}
</script>

<style scoped>
.story-card { display: flex; align-items: flex-start; gap: 14px; }
.story {
  flex: 1; font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 19px; line-height: 1.9; color: #4a3520;
}
.story b { color: var(--brand-deep); font-size: 22px; padding: 0 2px; }
.story-copy { flex: none; }
.stat-cell b small { font-size: 12px; color: var(--ink-3); font-weight: 400; }
</style>
