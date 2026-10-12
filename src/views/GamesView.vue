<template>
  <div class="view-head">
    <h2>游戏册</h2>
    <div class="sub">一家人一起玩过的游戏，以及她一次次学会的样子</div>
  </div>

  <div class="stat-row">
    <div class="stat-box"><div class="num">{{ store.games.length }}</div><div class="lbl">册里的游戏</div></div>
    <div class="stat-box"><div class="num">{{ monthPlays }}</div><div class="lbl">本月玩了几次</div></div>
    <div class="stat-box"><div class="num">{{ firstCount }}</div><div class="lbl">第一次完成</div></div>
    <div class="stat-box"><div class="num g-top-name">{{ favorite || '—' }}</div><div class="lbl">最常玩</div></div>
  </div>

  <!-- 今天玩什么 -->
  <div class="card pick-card">
    <div class="card-title">
      <span class="ct-left"><Icon name="sparkles" :size="16" />今天玩什么？</span>
      <button class="mini-btn" @click="drawOne">{{ picked ? '换一个' : '抽一个' }}</button>
    </div>
    <div v-if="!picked" class="pick-empty">不知道玩什么的时候点一下，会优先抽最近没玩过的游戏</div>
    <div v-else class="pick-body">
      <div class="pick-name">{{ picked.name }}</div>
      <div class="g-tags">
        <span v-for="t in picked.tags" :key="t" class="g-tag" :class="'tag-' + tagIndex(t)">{{ t }}</span>
        <span v-if="picked.isIdea" class="g-tag tag-idea">灵感库</span>
        <span v-if="picked.isIdea && inSeason(picked)" class="g-tag tag-season">应景</span>
      </div>
      <div v-if="picked.how" class="pick-how">{{ picked.how }}</div>
      <div v-if="picked.last" class="pick-last">上次玩是 {{ picked.last }}</div>
      <div class="pick-actions">
        <button v-if="picked.isIdea" class="mini-btn" @click="addIdea(picked)">加入游戏册</button>
        <button v-else class="mini-btn" @click="startPlay(picked.id, true)">玩了，记一笔</button>
      </div>
    </div>
  </div>

  <div class="two-col">
    <!-- 左：新建 / 编辑 + 灵感库 -->
    <div class="col">
      <div class="card" ref="formCard">
        <div class="card-title"><span class="ct-left"><Icon name="plus" :size="16" />{{ form.id ? '编辑游戏' : '添一个游戏' }}</span></div>
        <div class="form-row">
          <label>游戏名</label>
          <input v-model.trim="form.name" placeholder="如 形状配对盒" @keyup.enter="saveForm" />
        </div>
        <div class="form-row">
          <label>锻炼什么（可多选）</label>
          <div class="chip-row">
            <span v-for="t in GAME_TAGS" :key="t" class="chip" :class="{ sel: form.tags.includes(t) }" @click="toggle(form.tags, t)">{{ t }}</span>
          </div>
        </div>
        <div v-if="toyOptions.length" class="form-row">
          <label>用到的玩具（从玩具屋选，可选）</label>
          <div class="chip-row">
            <span v-for="t in toyOptions" :key="t.id" class="chip" :class="{ sel: form.toyIds.includes(t.id) }" @click="toggle(form.toyIds, t.id)">{{ t.name }}</span>
          </div>
        </div>
        <div class="form-row">
          <label>怎么玩（可选）</label>
          <textarea v-model.trim="form.how" rows="2" placeholder="一句话说清楚玩法，以后翻出来就知道怎么玩"></textarea>
        </div>
        <div class="form-actions" style="display:flex;gap:8px">
          <button class="mini-btn" :disabled="!form.name" @click="saveForm">{{ form.id ? '保存修改' : '加入游戏册' }}</button>
          <button v-if="form.id" class="mini-btn ghost" @click="resetForm">取消</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span class="ct-left"><Icon name="gift" :size="16" />游戏灵感</span>
          <span class="more">适合 18–36 个月 · {{ ideas.length }} 个</span>
        </div>
        <div class="chip-row">
          <span class="chip" :class="{ sel: !ideaTag }" @click="ideaTag = ''">全部</span>
          <span v-for="t in GAME_TAGS" :key="t" class="chip" :class="{ sel: ideaTag === t }" @click="ideaTag = t">{{ t }}</span>
        </div>
        <div class="idea-season">现在是{{ nowTerm.name }}前后，{{ nowSeason }}季应景的排在前面 ✨</div>
        <div v-if="!ideas.length" class="empty">这一类的灵感都加进游戏册啦</div>
        <div v-for="i in ideas" :key="i.name" class="idea-row" :class="{ seasonal: inSeason(i) }">
          <div class="idea-body">
            <div class="idea-name">{{ i.name }}
              <span v-for="t in i.tags" :key="t" class="g-tag sm" :class="'tag-' + tagIndex(t)">{{ t }}</span>
              <span v-if="inSeason(i)" class="g-tag sm tag-season">应景</span>
            </div>
            <div class="idea-how">{{ i.how }}</div>
          </div>
          <button class="mini-btn ghost" @click="addIdea(i)">加入</button>
        </div>
        <div class="idea-tip">需要小物件的游戏（豆子、珠子）请大人全程看护</div>
      </div>
    </div>

    <!-- 右：游戏卡片墙 -->
    <div class="col">
      <div class="card">
        <div class="card-title">
          <span class="ct-left"><Icon name="blocks" :size="16" />我们的游戏</span>
          <span class="more">点图片可以换图</span>
        </div>
        <div v-if="store.games.length" class="chip-row">
          <span class="chip" :class="{ sel: !wallTag }" @click="wallTag = ''">全部</span>
          <span v-for="t in usedTags" :key="t" class="chip" :class="{ sel: wallTag === t }" @click="wallTag = t">{{ t }}</span>
        </div>
        <div v-if="!store.games.length" class="empty">游戏册还是空的：从左边的灵感里挑几个，或在日记里用「玩了」贴纸记一笔</div>

        <div class="g-grid">
          <div v-for="g in wall" :key="g.id" :id="'g-' + g.id" class="g-card" :class="{ flash: flashId === g.id }">
            <div class="g-head">
              <div class="g-img" :class="'tag-' + tagIndex(g.tags[0])" title="换图片" @click="pickImage(g)">
                <img v-if="g.imageUrl" :src="g.imageUrl" />
                <span v-else>{{ g.name.slice(0, 1) }}</span>
              </div>
              <div class="g-info">
                <div class="g-name">{{ g.name }}</div>
                <div class="g-tags">
                  <span v-for="t in g.tags" :key="t" class="g-tag sm" :class="'tag-' + tagIndex(t)">{{ t }}</span>
                </div>
                <div class="g-meta">{{ g.plays.length ? `玩过 ${g.plays.length} 次 · 最近 ${lastPlayDate(g).slice(5)}` : '还没玩过' }}</div>
              </div>
            </div>
            <div v-if="g.how" class="g-how">{{ g.how }}</div>
            <div v-if="toyNames(g).length" class="g-props">道具：{{ toyNames(g).join('、') }}</div>

            <!-- 进步线：新的在上 -->
            <div v-if="g.plays.length" class="g-line">
              <div v-for="p in shownPlays(g)" :key="p.id" class="gl-item" :class="{ first: p.first }">
                <span class="gl-date">{{ p.date.slice(5) }}</span>
                <span class="gl-dot"></span>
                <span class="gl-text">{{ p.note || '玩了一次' }}<span v-if="p.first" class="gl-stamp">第一次</span></span>
                <button class="gl-del" title="删掉这次" @click="delPlay(g, p)">×</button>
              </div>
              <div v-if="g.plays.length > 3" class="gl-more" @click="toggleOpen(g.id)">
                {{ openIds.has(g.id) ? '收起' : `看全部 ${g.plays.length} 次` }}
              </div>
            </div>

            <!-- 记一次 -->
            <div v-if="playingId === g.id" class="g-playform">
              <input v-model.trim="pf.note" class="pf-input" placeholder="她的表现（可选）" @keyup.enter="savePlay(g)" />
              <div class="pf-row">
                <span class="chip chip-first" :class="{ sel: pf.first }" @click="pf.first = !pf.first">🏅 第一次完成</span>
                <input v-model="pf.date" type="date" :max="todayStr()" class="pf-date" />
              </div>
              <div class="pf-row">
                <button class="mini-btn" @click="savePlay(g)">记下</button>
                <button class="mini-btn ghost" @click="playingId = ''">取消</button>
              </div>
            </div>

            <div v-else class="g-actions">
              <button class="mini-btn" @click="startPlay(g.id)">玩了一次</button>
              <button class="mini-btn ghost" @click="editGame(g)">编辑</button>
              <button class="icon-btn" title="删除游戏" @click="delGame(g)"><Icon name="trash" :size="15" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <input ref="imgInput" type="file" accept="image/*" hidden @change="onImage" />
  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import Icon from '../components/Icon.vue'
import {
  store, todayStr, GAME_TAGS, addGame, updateGame, setGameImage, removeGame,
  addPlay, removePlay, lastPlayDate,
} from '../store.js'
import { GAME_IDEAS } from '../utils/gameIdeas.js'
import { seasonOf, currentTerm } from '../utils/solarTerms.js'
import { compressImage } from '../utils/image.js'

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}

const tagIndex = t => Math.max(0, GAME_TAGS.indexOf(t))
function toggle(list, v) {
  const i = list.indexOf(v)
  if (i >= 0) list.splice(i, 1)
  else list.push(v)
}

// ---------- 统计 ----------
const ym = todayStr().slice(0, 7)
const monthPlays = computed(() => store.games.reduce((s, g) => s + g.plays.filter(p => p.date.slice(0, 7) === ym).length, 0))
const firstCount = computed(() => store.games.reduce((s, g) => s + g.plays.filter(p => p.first).length, 0))
const favorite = computed(() => {
  const g = [...store.games].sort((a, b) => b.plays.length - a.plays.length)[0]
  return g?.plays.length ? g.name : ''
})

// ---------- 今天玩什么 ----------
const picked = ref(null)
function drawOne() {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  let pool = store.games.filter(g => lastPlayDate(g) < weekAgo)
  if (!pool.length) pool = store.games
  let item
  if (pool.length && (store.games.length >= 3 || !ideasAll.value.length)) {
    const cands = pool.filter(g => g.id !== picked.value?.id)
    const g = (cands.length ? cands : pool)[Math.floor(Math.random() * (cands.length || pool.length))]
    item = { id: g.id, name: g.name, tags: g.tags, how: g.how, last: lastPlayDate(g), isIdea: false }
  } else {
    // 游戏册还少：从灵感库里抽
    const seasonal = ideasAll.value.filter(i => inSeason(i))
    const poolIdeas = seasonal.length ? seasonal : ideasAll.value
    const list = poolIdeas.filter(i => i.name !== picked.value?.name)
    const i = (list.length ? list : poolIdeas)[Math.floor(Math.random() * (list.length || poolIdeas.length))]
    item = { ...i, isIdea: true }
  }
  picked.value = item
}

// ---------- 新建 / 编辑 ----------
const formCard = ref(null)
const form = reactive({ id: '', name: '', tags: [], toyIds: [], how: '' })
const toyOptions = computed(() => store.toys.filter(t => !t.archived))
function resetForm() {
  Object.assign(form, { id: '', name: '', tags: [], toyIds: [], how: '' })
}
function saveForm() {
  if (!form.name) return
  if (form.id) {
    const clash = store.games.find(g => g.name === form.name && g.id !== form.id)
    if (clash) { showToast(`已经有一个叫「${form.name}」的游戏了`); return }
    updateGame(form.id, { name: form.name, tags: form.tags, toyIds: form.toyIds, how: form.how })
    showToast('改好了')
    flash(form.id)
  } else {
    if (store.games.some(g => g.name === form.name)) { showToast(`「${form.name}」已经在游戏册里了`); return }
    const g = addGame({ name: form.name, tags: form.tags, toyIds: form.toyIds, how: form.how })
    showToast(`「${g.name}」加入了游戏册`)
    flash(g.id)
  }
  resetForm()
}
function editGame(g) {
  Object.assign(form, { id: g.id, name: g.name, tags: [...g.tags], toyIds: [...(g.toyIds || [])], how: g.how || '' })
  nextTick(() => formCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function delGame(g) {
  const msg = g.plays.length
    ? `删除「${g.name}」？它的 ${g.plays.length} 次记录和相关里程碑会一起删除（照片仍在相册里）`
    : `删除「${g.name}」？`
  if (!confirm(msg)) return
  removeGame(g.id)
  if (form.id === g.id) resetForm()
}

// ---------- 灵感库 ----------
const ideaTag = ref('')
const nowSeason = computed(() => seasonOf(todayStr()))
const nowTerm = computed(() => currentTerm(todayStr()))
// 只标了季节的才算"应景"；四季皆宜的不占应景位
const inSeason = i => !!i.seasons?.includes(nowSeason.value)
// 应季的排在前面，其余保持原有顺序
const ideasAll = computed(() =>
  GAME_IDEAS.map((i, k) => ({ i, k }))
    .filter(({ i }) => !store.games.some(g => g.name === i.name))
    .sort((a, b) => (inSeason(b.i) ? 1 : 0) - (inSeason(a.i) ? 1 : 0) || a.k - b.k)
    .map(({ i }) => i)
)
const ideas = computed(() => ideasAll.value.filter(i => !ideaTag.value || i.tags.includes(ideaTag.value)))
function addIdea(i) {
  const g = addGame({ name: i.name, tags: i.tags, how: i.how })
  showToast(`「${g.name}」加入了游戏册`)
  if (picked.value?.name === i.name) picked.value = { id: g.id, name: g.name, tags: g.tags, how: g.how, last: '', isIdea: false }
  flash(g.id)
}

// ---------- 卡片墙 ----------
const wallTag = ref('')
const usedTags = computed(() => GAME_TAGS.filter(t => store.games.some(g => g.tags.includes(t))))
const wall = computed(() =>
  store.games
    .filter(g => !wallTag.value || g.tags.includes(wallTag.value))
    .sort((a, b) => (lastPlayDate(b) || b.createdAt).localeCompare(lastPlayDate(a) || a.createdAt))
)
const toyNames = g => (g.toyIds || []).map(id => store.toys.find(t => t.id === id)?.name).filter(Boolean)

const openIds = ref(new Set())
function toggleOpen(id) {
  const s = new Set(openIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openIds.value = s
}
// 按日期从新到旧（补记的旧日期也能排到正确位置）
const sortedPlays = g => [...g.plays].sort((a, b) => b.date.localeCompare(a.date))
const shownPlays = g => (openIds.value.has(g.id) ? sortedPlays(g) : sortedPlays(g).slice(0, 3))

const flashId = ref('')
function flash(id) {
  flashId.value = id
  nextTick(() => document.getElementById('g-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  setTimeout(() => { if (flashId.value === id) flashId.value = '' }, 1600)
}

// 换图
const imgInput = ref(null)
let imgTarget = null
function pickImage(g) {
  imgTarget = g.id
  imgInput.value.click()
}
async function onImage(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f?.type.startsWith('image/') || !imgTarget) return
  await setGameImage(imgTarget, await compressImage(f, 800, 0.8))
}

// ---------- 记一次 ----------
const playingId = ref('')
const pf = reactive({ note: '', first: false, date: todayStr() })
function startPlay(id, fromPick = false) {
  Object.assign(pf, { note: '', first: false, date: todayStr() })
  playingId.value = id
  if (fromPick) flash(id)
}
function savePlay(g) {
  const p = addPlay(g.id, { date: pf.date, note: pf.note, first: pf.first })
  showToast(p.first ? `🏅 ${g.name}：第一次完成，进里程碑啦` : `${g.name} 第 ${g.plays.length} 次`)
  playingId.value = ''
}
function delPlay(g, p) {
  if (!confirm(`删掉 ${p.date} 这次「${g.name}」的记录？`)) return
  removePlay(g.id, p.id)
}
</script>

<style scoped>
.g-top-name { font-size: 16px !important; line-height: 29px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pick-card { border: 1px dashed rgba(155, 143, 208, .6); }
.pick-empty { font-size: 13px; color: var(--ink-2); }
.pick-name { font-size: 20px; font-weight: 800; color: #4e3fa8; margin-bottom: 4px; }
.pick-how { font-size: 14px; margin-top: 8px; line-height: 1.6; }
.pick-last { font-size: 12px; color: var(--ink-3); margin-top: 4px; }
.pick-actions { margin-top: 10px; }

/* 标签色：精细动作 / 大运动 / 认知 / 语言 / 社交 / 想象力 */
.g-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.g-tag { font-size: 12px; padding: 1px 9px; border-radius: 999px; }
.g-tag.sm { font-size: 11px; padding: 0 7px; }
.tag-0 { background: #fdebd3; color: #9a5512; }
.tag-1 { background: #e3eefa; color: #245d96; }
.tag-2 { background: #eaf3de; color: #3b6d11; }
.tag-3 { background: #fbe4ec; color: #a23a62; }
.tag-4 { background: #fff1d6; color: #8a5a00; }
.tag-5 { background: #ece9fb; color: #4e3fa8; }
.tag-idea { background: #f1efe8; color: #5f5e5a; }
.tag-season { background: #e8f3d9; color: #4a7c23; }
.idea-season { font-size: 12px; color: #4a7c23; background: #eef6e2; border-radius: 8px; padding: 5px 10px; margin-bottom: 8px; }
.idea-row.seasonal { background: rgba(143, 191, 95, .08); margin: 0 -6px; padding-left: 6px; padding-right: 6px; border-radius: 8px; }

.idea-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px dashed var(--line); }
.idea-row:last-of-type { border-bottom: none; }
.idea-body { flex: 1; min-width: 0; }
.idea-name { font-size: 14px; font-weight: 700; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.idea-how { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
.idea-tip { font-size: 11px; color: var(--ink-3); margin-top: 8px; }

.g-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.g-card {
  background: #fffdf9; border: 1px solid var(--line); border-radius: 14px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px; transition: box-shadow .3s, border-color .3s;
}
.g-card.flash { border-color: #9b8fd0; box-shadow: 0 0 0 3px rgba(155, 143, 208, .3); }
.g-head { display: flex; gap: 10px; }
.g-img {
  width: 56px; height: 56px; border-radius: 12px; flex: none; overflow: hidden; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800;
}
.g-img img { width: 100%; height: 100%; object-fit: cover; }
.g-info { min-width: 0; flex: 1; }
.g-name { font-size: 15px; font-weight: 800; margin-bottom: 3px; }
.g-meta { font-size: 11px; color: var(--ink-3); margin-top: 4px; }
.g-how { font-size: 12.5px; color: var(--ink); line-height: 1.6; background: rgba(255, 243, 225, .6); border-radius: 8px; padding: 6px 8px; }
.g-props { font-size: 12px; color: var(--ink-2); }

.g-line { border-top: 1px dashed var(--line); padding-top: 6px; }
.gl-item { display: flex; align-items: flex-start; gap: 6px; font-size: 12.5px; padding: 3px 0; position: relative; }
.gl-date { width: 38px; flex: none; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.gl-dot { width: 7px; height: 7px; border-radius: 50%; background: #c9c1ea; margin-top: 6px; flex: none; }
.gl-item.first .gl-dot { background: #d8643f; }
.gl-text { flex: 1; line-height: 1.5; }
.gl-stamp {
  display: inline-block; margin-left: 4px; font-size: 10px; font-weight: 700; color: #d8643f;
  border: 1.5px solid #d8643f; border-radius: 3px; padding: 0 3px; transform: rotate(-6deg);
}
.gl-del { display: none; border: none; background: none; color: #e05555; cursor: pointer; font-size: 14px; padding: 0 2px; }
.gl-item:hover .gl-del { display: block; }
.gl-more { font-size: 12px; color: #4e3fa8; cursor: pointer; padding-top: 2px; }

.g-playform { background: #f6f4fd; border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.pf-input, .pf-date {
  border: 1px solid var(--line); border-radius: 8px; padding: 6px 9px; font-size: 13px;
  font-family: inherit; background: #fff; outline: none;
}
.pf-input:focus { border-color: #9b8fd0; }
.pf-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pf-row .chip { margin: 0; }
.pf-row .chip-first { width: auto; padding: 5px 14px; font-size: 12px; }
.g-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; }
.g-actions .icon-btn { margin-left: auto; }
</style>
