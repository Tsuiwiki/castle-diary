<template>
  <div class="card-mask">
    <div class="card-topbar">
      <button class="back-btn" @click="$emit('close')"><Icon name="arrow-left" :size="17" /></button>
      <span class="prog" v-if="!finished">第 {{ done + 1 }} 张 · 本轮共 {{ total }} 张 · 空格翻面</span>
      <span class="prog" v-else>本轮完成</span>
      <span style="width:34px"></span>
    </div>

    <!-- 翻卡中 -->
    <template v-if="!finished && current">
      <div class="card-stage">
        <div class="flash-card" @click="flipped = !flipped">
          <button class="fc-tts" :class="{ 'fc-her': current.audioUrl }" :title="current.audioUrl ? '再听一遍她说的' : '再读一遍'" @click.stop="sayIt(current, true)"><Icon name="volume" :size="20" /></button>
          <div v-if="current.audioUrl" class="fc-her-tag">她的声音</div>
          <!-- 正面（早教机卡片版式）：配图 → 拼音 → 大字 -->
          <img v-if="current.imageUrl" :src="current.imageUrl" class="fc-img" :alt="current.word" />
          <div v-if="current.pinyin" class="fc-pinyin-front">{{ current.pinyin }}</div>
          <div class="fc-word" :class="{ 'fc-word-sm': current.imageUrl }">{{ current.word }}</div>
          <template v-if="flipped">
            <div v-if="current.meaning" class="fc-meaning">{{ current.meaning }}</div>
            <div class="fc-meta">
              {{ current.kind }}
              <template v-if="current.sourceBook"> · 读《{{ current.sourceBook }}》学会</template>
              <br>首现于 {{ current.date }}
            </div>
          </template>
          <div class="fc-hint">{{ flipped ? '认识了 → 按 → 或点绿按钮' : '点击卡片或按空格看详情' }}</div>
        </div>
      </div>
      <div class="card-actions">
        <button class="act act-no" @click="notYet">还不熟</button>
        <button class="act act-yes" @click="gotIt">认识了</button>
      </div>
    </template>

    <!-- 本轮小结 -->
    <div v-else class="card-stage">
      <div class="flash-card" style="cursor:default">
        <div style="font-size:56px">🎉</div>
        <div style="font-size:22px;font-weight:800;margin-top:12px">本轮巩固完成</div>
        <div class="fc-meta">
          共复习 {{ total }} 个词<br>
          其中 {{ newlyMastered }} 个新掌握
          <template v-if="remainingCount"> · 还有 {{ remainingCount }} 个学习中</template>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px">
          <button class="btn-ghost" v-if="remainingCount" @click="restart">再练一轮</button>
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
import { playAudio, stopAudio } from '../utils/recorder.js'

const props = defineProps({ words: { type: Array, required: true } })
const emit = defineEmits(['close'])

// 快照一份队列：未掌握的排前面，内部打乱
function buildQueue() {
  const pool = [...props.words]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  pool.sort((a, b) => (a.mastered ? 1 : 0) - (b.mastered ? 1 : 0))
  return pool.map(w => w.id)
}

const queue = ref(buildQueue())
const done = ref(0)
const total = ref(queue.value.length)
const flipped = ref(false)
const finished = ref(false)
const newlyMastered = ref(0)

const current = computed(() => props.words.find(w => w.id === queue.value[0]) || null)
const remainingCount = computed(() => props.words.filter(w => !w.mastered).length)

function advance() {
  queue.value.shift()
  done.value++
  flipped.value = false
  if (!queue.value.length) finished.value = true
}

function gotIt() {
  if (!current.value) return
  if (!current.value.mastered) newlyMastered.value++
  setWordMastered(current.value.id, true)
  advance()
}

function notYet() {
  if (!current.value) return
  // 不熟的重新插到队尾（隔几张再见一次）
  const id = queue.value.shift()
  queue.value.push(id)
  flipped.value = false
}

function restart() {
  queue.value = buildQueue().filter(id => {
    const w = props.words.find(x => x.id === id)
    return w && !w.mastered
  })
  done.value = 0
  total.value = queue.value.length
  flipped.value = false
  finished.value = !queue.value.length
}

function onKey(e) {
  if (e.key === 'Escape') return emit('close')
  if (finished.value || !current.value) return
  if (e.key === ' ') { e.preventDefault(); flipped.value = !flipped.value }
  if (e.key === 'ArrowRight' || e.key === 'Enter') { flipped.value ? gotIt() : (flipped.value = true) }
  if (e.key === 'ArrowLeft') notYet()
}

// 有她自己的录音就放录音，没有才用浏览器朗读
function sayIt(w, force = false) {
  if (!w) return
  stopSpeak()
  stopAudio()
  if (w.audioUrl) playAudio(w.audioUrl)
  else if (force || store.settings.tts !== false) speak(w.word)
}

// 每切到一张新卡自动播放（朗读可在设置里关；她的录音总是播放）
watch(current, w => {
  if (w && (w.audioUrl || store.settings.tts !== false)) sayIt(w)
}, { immediate: true })

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  stopSpeak()
  stopAudio()
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
.card-mask { outline: none; }
.flash-card .fc-tts.fc-her { background: #e0466f; border-color: #e0466f; color: #fff; }
.fc-her-tag { position: absolute; top: 20px; right: 62px; font-size: 12px; color: #a23a62; background: #fde8ef; border-radius: 999px; padding: 2px 9px; }
</style>
