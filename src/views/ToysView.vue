<template>
  <div class="view-head">
    <h2>城堡玩具屋</h2>
    <div class="sub">玩具入屋与玩耍记录 · 久未玩的会提醒你翻出来</div>
  </div>

  <!-- 久未玩提醒横幅 -->
  <div v-if="stale.length && !showArchived" class="stale-banner">
    <Icon name="bell" :size="15" />
    <span><b>{{ stale.length }}</b> 件玩具超过 30 天没玩了：{{ stale.map(t => t.name).slice(0, 4).join('、') }}<template v-if="stale.length > 4">…</template> 翻出来宠幸一下？</span>
    <span class="chip" @click="fState = 'stale'">看看</span>
  </div>

  <!-- 统计格 -->
  <div class="stat-row">
    <div class="stat-box"><div class="num">{{ activeToys.length }}</div><div class="lbl">在架玩具</div></div>
    <div class="stat-box"><div class="num">{{ playedToday }}</div><div class="lbl">今日玩过</div></div>
    <div class="stat-box"><div class="num" :style="stale.length ? 'color:#e0874c' : ''">{{ stale.length }}</div><div class="lbl">久未玩</div></div>
    <div class="stat-box"><div class="num">{{ archivedCount }}</div><div class="lbl">压箱底</div></div>
  </div>

  <div class="two-col">
    <!-- 入屋表单 -->
    <div class="card">
      <div class="card-title"><span class="ct-left"><Icon name="plus" :size="16" />玩具入屋</span></div>
      <div class="form-row">
        <label>玩具名称</label>
        <input v-model.trim="form.name" placeholder="如：彩虹叠叠乐" @keyup.enter="submit" />
      </div>
      <div class="form-row">
        <label>分类</label>
        <div class="chip-row" style="margin-bottom:0">
          <span
            v-for="c in TOY_CATEGORIES" :key="c"
            class="chip" :class="{ sel: form.category === c }"
            @click="form.category = c"
          >{{ c }}</span>
        </div>
      </div>
      <div class="form-row">
        <label>链接（可选）</label>
        <input v-model.trim="form.link" placeholder="如购买链接 https://…" />
      </div>
      <div class="form-row">
        <label>图片（可选）</label>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn-ghost" @click="imgInput.click()"><Icon name="camera" :size="14" />{{ form.imageUrl ? '换一张' : '选图片' }}</button>
          <img v-if="form.imageUrl" :src="form.imageUrl" class="toy-thumb" @click="previewImg = form.imageUrl" />
          <input ref="imgInput" type="file" accept="image/*" style="display:none" @change="onPickImage" />
        </div>
      </div>
      <button class="btn-primary" style="width:100%;justify-content:center" @click="submit">入屋</button>
      <div class="med-tip">点「玩了」记一次玩耍；不常玩的可以归档压箱底</div>
    </div>

    <!-- 玩具清单 -->
    <div class="card">
      <div class="card-title">
        <span class="ct-left"><Icon name="blocks" :size="16" />玩具清单</span>
        <span class="more">{{ filteredToys.length }} 件</span>
      </div>
      <div class="chip-row">
        <span class="chip" :class="{ sel: fState === 'all' }" @click="fState = 'all'">在架</span>
        <span class="chip" :class="{ sel: fState === 'stale' }" @click="fState = 'stale'">久未玩</span>
        <span class="chip" :class="{ sel: fState === 'archived' }" @click="fState = 'archived'">压箱底</span>
        <span style="flex:1"></span>
        <span
          v-for="c in TOY_CATEGORIES" :key="c"
          class="chip chip-soft" :class="{ sel: fCat === c }"
          @click="fCat = fCat === c ? '' : c"
        >{{ c }}</span>
      </div>
      <div v-for="t in filteredToys" :key="t.id" class="med-row toy-row" :class="{ archived: t.archived }">
        <img v-if="t.imageUrl" :src="t.imageUrl" class="toy-thumb" @click.stop="previewImg = t.imageUrl" />
        <span v-else class="med-ic" :class="{ warn: isStale(t) && !t.archived }"><Icon name="blocks" :size="17" /></span>
        <div class="med-main">
          <div class="med-name">
            {{ t.name }}
            <span class="badge" :class="t.archived ? 'badge-danger' : 'badge-ok'" style="margin-left:6px">{{ t.category }}</span>
            <span v-if="isStale(t) && !t.archived" class="badge badge-warn" style="margin-left:4px">久未玩</span>
          </div>
          <div class="med-sub">
            <span>玩过 {{ t.playCount }} 次</span>
            <span>{{ t.lastPlayedAt ? `上次：${t.lastPlayedAt}` : `入屋：${t.createdAt}` }}</span>
          </div>
        </div>
        <a v-if="t.link" class="icon-btn" :href="t.link" target="_blank" rel="noopener" @click.stop title="打开链接"><Icon name="link" :size="15" /></a>
        <button v-if="!t.archived" class="mini-btn" @click.stop="play(t)">玩了</button>
        <button class="mini-btn ghost" @click.stop="toggleEdit(t)">{{ editingId === t.id ? '收起' : '编辑' }}</button>
        <button class="mini-btn ghost" @click.stop="toggleToyArchive(t.id)">{{ t.archived ? '翻出来' : '压箱底' }}</button>
        <button class="icon-btn" @click.stop="remove(t)"><Icon name="trash" :size="15" /></button>
        <!-- 行内编辑：链接 + 换图 -->
        <div v-if="editingId === t.id" class="toy-edit">
          <input v-model.trim="editLink" placeholder="链接（可空），如购买链接 https://…" @keyup.enter="saveEdit(t)" />
          <button class="btn-ghost" @click="editImgInput.click()"><Icon name="camera" :size="14" />{{ t.imageUrl ? '换图' : '加图' }}</button>
          <button class="btn-primary" @click="saveEdit(t)">保存</button>
        </div>
      </div>
      <div v-if="!filteredToys.length" class="empty">
        {{ fState === 'archived' ? '压箱底是空的' : fState === 'stale' ? '没有久未玩的玩具，挺好' : '玩具屋是空的，先入屋一件吧' }}
      </div>
    </div>
  </div>

  <!-- 图片灯箱：点缩略图放大 -->
  <div v-if="previewImg" class="drawer-mask" @click="previewImg = ''">
    <div class="lightbox" @click.stop>
      <img :src="previewImg" class="lb-img" />
      <div class="lb-bar">
        <div class="lb-info">玩具图片</div>
        <div class="lb-actions"><button class="mini-btn ghost" @click="previewImg = ''">关闭</button></div>
      </div>
    </div>
  </div>
  <!-- 行内编辑共用的换图文件框 -->
  <input ref="editImgInput" type="file" accept="image/*" style="display:none" @change="onEditImage" />

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import Icon from '../components/Icon.vue'
import { store, TOY_CATEGORIES, addToy, removeToy, playToy, toggleToyArchive, updateToy, setToyImage, staleToys, todayStr } from '../store.js'
import { compressImage } from '../utils/image.js'

const form = reactive({ name: '', category: '益智', link: '', imageUrl: '' })
const fState = ref('all')   // all | stale | archived
const fCat = ref('')
const imgInput = ref(null)
const editImgInput = ref(null)
const previewImg = ref('')     // 灯箱放大的图
const editingId = ref('')      // 正在行内编辑的玩具 id
const editLink = ref('')

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

const stale = computed(() => staleToys(30))
const activeToys = computed(() => store.toys.filter(t => !t.archived))
const archivedCount = computed(() => store.toys.filter(t => t.archived).length)
const playedToday = computed(() => store.toys.filter(t => t.lastPlayedAt === todayStr()).length)
const showArchived = computed(() => fState.value === 'archived')

const filteredToys = computed(() => {
  let list = store.toys
  if (fState.value === 'all') list = list.filter(t => !t.archived)
  else if (fState.value === 'stale') list = stale.value
  else list = list.filter(t => t.archived)
  if (fCat.value) list = list.filter(t => t.category === fCat.value)
  // 在架列表：久未玩的排前面
  return [...list].sort((a, b) => {
    const la = a.lastPlayedAt || a.createdAt
    const lb = b.lastPlayedAt || b.createdAt
    return la.localeCompare(lb)
  })
})

function isStale(t) { return stale.value.some(s => s.id === t.id) }

async function onPickImage(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  form.imageUrl = await compressImage(f, 800, 0.75)
}

async function submit() {
  if (!form.name) { showToast('先填玩具名称'); return }
  const t = addToy({ name: form.name, category: form.category, link: form.link })
  if (!t) { showToast('这件玩具已经在屋里了'); return }
  if (form.imageUrl) await setToyImage(t.id, form.imageUrl)
  form.name = ''
  form.link = ''
  form.imageUrl = ''
  showToast('已入屋')
}

// ---------- 行内编辑：链接 + 换图 ----------
function toggleEdit(t) {
  if (editingId.value === t.id) { editingId.value = ''; return }
  editingId.value = t.id
  editLink.value = t.link || ''
}

async function onEditImage(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f || !editingId.value) return
  const dataUrl = await compressImage(f, 800, 0.75)
  await setToyImage(editingId.value, dataUrl)
  showToast('图片已更新')
}

function saveEdit(t) {
  updateToy(t.id, { link: editLink.value })
  editingId.value = ''
  showToast('已保存')
}

function play(t) {
  playToy(t.id)
  showToast(`${t.name}：第 ${t.playCount} 次玩耍`)
}

function remove(t) {
  if (confirm(`把「${t.name}」移出玩具屋？`)) removeToy(t.id)
}
</script>
