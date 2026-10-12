<template>
  <div class="card-mask">
    <div class="card-topbar">
      <button class="back-btn" @click="$emit('close')"><Icon name="arrow-left" :size="17" /></button>
      <span class="prog" v-if="!finished">第 {{ done + 1 }} 题 · 共 {{ total }} 题 · 点图或按 1-4</span>
      <span class="prog" v-else>本轮完成</span>
      <span style="width:34px"></span>
    </div>

    <!-- 答题中 -->
    <template v-if="!finished && current">
      <div class="card-stage">
        <div class="quiz-wrap">
          <!-- 题目：大字 + 拼音 + 朗读 -->
          <div class="quiz-word">
            <button class="fc-tts" style="position:static;margin-left:10px" title="读一读" @click="speak(current.word)"><Icon name="volume" :size="20" /></button>
            <div v-if="current.pinyin" class="fc-pinyin-front">{{ current.pinyin }}</div>
            <div class="quiz-big">{{ current.word }}</div>
            <div class="quiz-tip">找出对应的图片</div>
          </div>
          <!-- 2x2 选项 -->
          <div class="quiz-grid">
            <div
              v-for="(opt, i) in options" :key="opt.id"
              class="quiz-opt" :class="{ right: picked === opt.id && opt.id === current.id, wrong: picked === opt.id && opt.id !== current.id }"
              @click="pick(opt)"
            >
              <img :src="opt.imageUrl" :alt="'选项' + (i + 1)" />
              <span class="quiz-no">{{ i + 1 }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 本轮小结 -->
    <div v-else class="card-stage">
      <div class="flash-card" style="cursor:default">
        <div style="font-size:56px">🎉</div>
        <div style="font-size:22px;font-weight:800;margin-top:12px">本轮完成</div>
        <div class="fc-meta">
          共 {{ total }} 题 · 一次答对 {{ firstTryRight }} 题
          <template v-if="newlyMastered"><br>{{ newlyMastered }} 个词新掌握</template>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px">
          <button class="btn-ghost" @click="restart">再玩一轮</button>
          <button class="btn-primary" @click="$emit('close')">收工</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import { store, setWordMastered } from '../store.js'
import { speak, stopSpeak } from '../utils/tts.js'

const props = defineProps({ words: { type: Array, required: true } })
const emit = defineEmits(['close'])

// 只有带配图的词能出题；至少需要 4 个（1 正确 + 3 干扰）
const pool = computed(() => props.words.filter(w => w.imageUrl))

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildRounds() {
  // 未掌握优先出题
  return shuffle(pool.value).sort((a, b) => (a.mastered ? 1 : 0) - (b.mastered ? 1 : 0)).map(w => w.id)
}

const rounds = ref(buildRounds())
const done = ref(0)
const total = ref(rounds.value.length)
const picked = ref('')       // 当前选中的选项 id（用于对错着色）
const locked = ref(false)    // 答对后短暂锁屏等跳转
const finished = ref(false)
const firstTryRight = ref(0)
const newlyMastered = ref(0)
const wrongThisRound = ref(false)

const current = computed(() => props.words.find(w => w.id === rounds.value[0]) || null)

// 选项：正确词 + 3 个随机干扰项，打乱
const options = computed(() => {
  if (!current.value) return []
  const others = shuffle(pool.value.filter(w => w.id !== current.value.id)).slice(0, 3)
  return shuffle([current.value, ...others])
})

function pick(opt) {
  if (locked.value || !current.value) return
  picked.value = opt.id
  if (opt.id === current.value.id) {
    locked.value = true
    speak(current.value.word)
    if (!wrongThisRound.value) {
      firstTryRight.value++
      if (!current.value.mastered) { newlyMastered.value++; setWordMastered(current.value.id, true) }
    }
    setTimeout(() => {
      rounds.value.shift()
      done.value++
      picked.value = ''
      locked.value = false
      wrongThisRound.value = false
      if (!rounds.value.length) finished.value = true
    }, 700)
  } else {
    wrongThisRound.value = true
    setTimeout(() => { picked.value = '' }, 500)
  }
}

function restart() {
  rounds.value = buildRounds()
  done.value = 0
  total.value = rounds.value.length
  picked.value = ''
  locked.value = false
  finished.value = false
  firstTryRight.value = 0
  newlyMastered.value = 0
  wrongThisRound.value = false
}

// 出题自动朗读
watch(current, w => {
  if (w && store.settings.tts !== false) speak(w.word)
}, { immediate: true })

function onKey(e) {
  if (e.key === 'Escape') return emit('close')
  if (finished.value || !current.value) return
  const n = parseInt(e.key)
  if (n >= 1 && n <= 4 && options.value[n - 1]) pick(options.value[n - 1])
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  stopSpeak()
})
</script>

<style scoped>
.back-btn {
  width: 34px; height: 34px; border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, .75);
  background: rgba(255, 255, 255, .68); backdrop-filter: blur(10px);
  color: var(--brand-deep); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(240, 147, 75, .08);
}
.quiz-wrap { display: flex; flex-direction: column; align-items: center; gap: 26px; }
.quiz-word { text-align: center; }
.quiz-big { font-size: 72px; font-weight: 800; letter-spacing: 4px; color: var(--ink); line-height: 1.2; }
.quiz-tip { margin-top: 8px; font-size: 13px; color: var(--ink-3); }
.quiz-grid { display: grid; grid-template-columns: repeat(2, 200px); gap: 16px; }
.quiz-opt {
  position: relative; width: 200px; aspect-ratio: 1; border-radius: 18px; overflow: hidden;
  cursor: pointer; border: 3px solid rgba(255, 255, 255, .9);
  box-shadow: 0 4px 14px rgba(240, 147, 75, .14);
  transition: transform .12s, border-color .12s;
}
.quiz-opt:hover { transform: translateY(-2px); }
.quiz-opt img { width: 100%; height: 100%; object-fit: cover; }
.quiz-opt.right { border-color: var(--green); box-shadow: 0 0 0 4px rgba(127, 176, 105, .3); }
.quiz-opt.wrong { border-color: var(--accent); animation: shake .35s; }
.quiz-no {
  position: absolute; top: 8px; left: 8px; width: 24px; height: 24px; border-radius: 50%;
  background: rgba(255, 255, 255, .85); color: var(--brand-deep);
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
@media (max-width: 767px) {
  .quiz-big { font-size: 52px; }
  .quiz-grid { grid-template-columns: repeat(2, minmax(0, 42vw)); }
  .quiz-opt { width: 100%; }
}
</style>
