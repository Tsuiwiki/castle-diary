<template>
  <div class="view-head">
    <h2>相册</h2>
    <div class="sub">照片留在本机浏览器里，不会上传</div>
  </div>

  <!-- 上传区 -->
  <div
    class="card album-upload" :class="{ 'drop-active': dragOver }"
    @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="onDrop"
  >
    <div class="au-inner" @click="fileInput.click()">
      <Icon name="image" :size="26" />
      <div>
        <b>点这里或把照片拖进来</b>
        <div class="au-sub">支持多选；可顺手写一句备注、挂到里程碑</div>
      </div>
    </div>
    <div class="au-form">
      <input v-model="note" placeholder="备注（可选）：今天在公园吹泡泡" />
      <select v-model="milestoneId">
        <option value="">不挂里程碑</option>
        <option v-for="m in milestonesDesc" :key="m.id" :value="m.id">{{ m.date.slice(5) }} {{ m.title }}</option>
      </select>
      <input v-model="date" type="date" />
    </div>
    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPick" />
  </div>

  <!-- 里程碑照片墙 -->
  <div v-if="wallGroups.length" class="card">
    <div class="card-title"><span class="ct-left"><Icon name="flag" :size="16" />里程碑照片墙</span><span class="more">{{ wallCount }} 张</span></div>
    <div v-for="g in wallGroups" :key="g.milestone.id" class="wall-group">
      <div class="wall-title">🏁 {{ g.milestone.title }}<span class="wk-date" style="margin-left:8px">{{ g.milestone.date }}</span></div>
      <div class="photo-grid">
        <img v-for="p in g.photos" :key="p.id" :src="p.imageUrl" class="photo-cell" @click="open(p)" />
      </div>
    </div>
  </div>

  <!-- 全部照片（按日分组） -->
  <div class="card">
    <div class="card-title"><span class="ct-left"><Icon name="image" :size="16" />全部照片</span><span class="more">{{ store.photos.length }} 张</span></div>
    <div v-if="!dayGroups.length" class="empty empty-illus">
      <svg width="120" height="86" viewBox="0 0 120 86" fill="none">
        <rect x="18" y="10" width="84" height="64" rx="6" stroke="#d9b98c" stroke-width="2" stroke-dasharray="5 4" fill="#fffdf6" />
        <circle cx="42" cy="32" r="7" stroke="#e5b96f" stroke-width="2" />
        <path d="M26 66 L48 46 L62 58 L74 48 L94 66" stroke="#e5b96f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="86" cy="20" r="3" fill="#f3c969" /><circle cx="96" cy="26" r="2" fill="#f3c969" />
      </svg>
      <div>还没有照片，传第一张吧</div>
      <div class="empty-sub">照片存在本机浏览器里，不会上传</div>
    </div>
    <div v-for="g in dayGroups" :key="g.date" class="day-group">
      <div class="meal-date meal-click" title="回到那天的日记" @click="openDay(g.date)">{{ g.date }}<span class="day-count">{{ g.photos.length }} 张</span><span class="meal-go">看那天 →</span></div>
      <div class="photo-grid">
        <img v-for="p in g.photos" :key="p.id" :src="p.imageUrl" class="photo-cell" @click="open(p)" />
      </div>
    </div>
  </div>

  <!-- 大图灯箱 -->
  <div v-if="current" class="drawer-mask" @click="current = null">
    <div class="lightbox" @click.stop>
      <img :src="current.imageUrl" class="lb-img" />
      <div class="lb-bar">
        <div class="lb-info">
          <b>{{ current.date }}</b>
          <span v-if="current.note"> · {{ current.note }}</span>
          <div v-if="linkedMilestone" class="lb-ms">🏁 {{ linkedMilestone.title }}</div>
        </div>
        <div class="lb-actions">
          <select class="lb-select" :value="current.milestoneId" @change="relink($event.target.value)">
            <option value="">不挂里程碑</option>
            <option v-for="m in milestonesDesc" :key="m.id" :value="m.id">{{ m.title }}</option>
          </select>
          <button class="mini-btn ghost" @click="removeCurrent"><Icon name="trash" :size="13" />删除</button>
          <button class="mini-btn" @click="current = null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['go'])
import { ref, computed } from 'vue'
import Icon from '../components/Icon.vue'
import { diaryDate } from '../store.js'
import { store, addPhoto, removePhoto, linkPhotoMilestone, todayStr } from '../store.js'
import { compressImage } from '../utils/image.js'

const fileInput = ref(null)
const dragOver = ref(false)
const note = ref('')
const date = ref(todayStr())
const milestoneId = ref('')
const current = ref(null)
const uploading = ref(false)

const milestonesDesc = computed(() =>
  [...store.milestones].sort((a, b) => b.date.localeCompare(a.date))
)

const dayGroups = computed(() => {
  const map = new Map()
  for (const p of store.photos) {
    if (!map.has(p.date)) map.set(p.date, [])
    map.get(p.date).push(p)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, photos]) => ({ date, photos }))
})

const wallGroups = computed(() =>
  milestonesDesc.value
    .map(m => ({ milestone: m, photos: store.photos.filter(p => p.milestoneId === m.id && p.imageUrl) }))
    .filter(g => g.photos.length)
)
const wallCount = computed(() => wallGroups.value.reduce((s, g) => s + g.photos.length, 0))

const linkedMilestone = computed(() =>
  current.value?.milestoneId ? store.milestones.find(m => m.id === current.value.milestoneId) : null
)

async function handleFiles(files) {
  if (!files?.length || uploading.value) return
  uploading.value = true
  try {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue
      const dataUrl = await compressImage(f, 1280, 0.72)
      await addPhoto({ dataUrl, date: date.value || todayStr(), note: note.value, milestoneId: milestoneId.value })
    }
    note.value = ''
  } finally {
    uploading.value = false
  }
}

function onPick(e) {
  handleFiles([...e.target.files])
  e.target.value = ''
}
function onDrop(e) {
  dragOver.value = false
  handleFiles([...(e.dataTransfer?.files || [])])
}

function open(p) { current.value = p }
function relink(mid) {
  linkPhotoMilestone(current.value.id, mid)
}
function removeCurrent() {
  if (!confirm('删除这张照片？')) return
  const r = removePhoto(current.value.id)
  if (r === 'blocked') { alert('这张照片还被出行/游戏记录用着，先去那边删掉引用再删'); return }
  current.value = null
}
function openDay(date) {
  diaryDate.value = date
  emit('go', 'diary')
}
</script>

<style scoped>
.meal-click { cursor: pointer; }
.meal-click:hover { color: var(--brand-deep); }
.meal-go { font-size: 12px; color: var(--brand-deep); margin-left: 8px; opacity: 0; transition: opacity .15s; }
.meal-click:hover .meal-go { opacity: 1; }
</style>
