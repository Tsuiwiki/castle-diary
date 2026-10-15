<template>
  <div class="view-head">
    <h2>识字词库</h2>
    <p class="sub">从读过的绘本里沉淀的词语 · 点「开始识字卡片」带宝宝巩固</p>
  </div>

  <!-- 词库统计 -->
  <div class="stat-row">
    <div class="stat-box"><div class="num">{{ store.words.length }}</div><div class="lbl">词库总数</div></div>
    <div class="stat-box"><div class="num">{{ learningCount }}</div><div class="lbl">学习中</div></div>
    <div class="stat-box"><div class="num">{{ masteredCount }}</div><div class="lbl">已掌握</div></div>
  </div>

  <!-- 识字卡片入口 -->
  <div class="card card-entry" @click="cardOpen = true">
    <span class="ct-left"><Icon name="sparkles" :size="20" /></span>
    <span class="entry-text">开始识字卡片<span class="entry-sub">大字翻卡 · 不熟的自动重练 · 支持键盘操作</span></span>
    <Icon name="chevron-right" :size="16" />
  </div>

  <!-- 看字选图入口（需要 ≥4 个带配图的词） -->
  <div class="card card-entry" :class="{ disabled: imageWordCount < 4 }" @click="openQuiz">
    <span class="ct-left"><Icon name="image" :size="20" /></span>
    <span class="entry-text">看字选图<span class="entry-sub">{{ imageWordCount >= 4 ? `${imageWordCount} 个带图词可出题 · 点图或按 1-4` : `还需 ${4 - imageWordCount} 个带配图的词才能玩（已有 ${imageWordCount} 个）` }}</span></span>
    <Icon name="chevron-right" :size="16" />
  </div>

  <!-- 录入新词 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="plus" :size="16" />记一个新词</span>
    </div>
    <div class="inline-add">
      <input v-model.trim="form.word" placeholder="词 / 字 / 句子" style="flex:1.4" @keyup.enter="add" />
      <select v-model="form.kind">
        <option v-for="k in WORD_KINDS" :key="k">{{ k }}</option>
      </select>
      <select v-model="form.sourceBook">
        <option value="">来源：随手记</option>
        <option v-for="b in store.books" :key="b.id" :value="b.title">《{{ b.title }}》</option>
      </select>
      <button class="mini-btn" @click="add">记下来</button>
    </div>
    <div class="inline-add" style="margin-top:8px">
      <input v-model.trim="form.pinyin" placeholder="拼音（自动生成，可改）" style="flex:1" @keyup.enter="add" />
      <input v-model.trim="form.meaning" placeholder="含义 / 备注（可选）" style="flex:1.6" @keyup.enter="add" />
      <button class="mini-btn btn-ghost" @click="imgInput.click()">{{ form.image ? '换图' : '+ 配图' }}</button>
      <input ref="imgInput" type="file" accept="image/*" style="display:none" @change="pickImage" />
    </div>
    <div v-if="form.image" class="img-preview">
      <img :src="form.image" alt="配图预览" />
      <span class="img-tip">翻卡时正面会显示这张图</span>
      <button class="wdel" style="position:static;opacity:1" @click="form.image = ''">×</button>
    </div>
  </div>

  <!-- 筛选 -->
  <div class="chip-row">
    <span class="chip" :class="{ sel: !fKind }" @click="fKind = ''">全部</span>
    <span v-for="k in WORD_KINDS" :key="k" class="chip" :class="{ sel: fKind === k }" @click="fKind = k">{{ k }}</span>
    <span style="flex:none;width:8px"></span>
    <span class="chip" :class="{ sel: fState === 'learning' }" @click="fState = fState === 'learning' ? '' : 'learning'">学习中</span>
    <span class="chip" :class="{ sel: fState === 'mastered' }" @click="fState = fState === 'mastered' ? '' : 'mastered'">已掌握</span>
    <select v-model="fBook" class="chip chip-select">
      <option value="">全部来源</option>
      <option v-for="b in store.books" :key="b.id" :value="b.title">《{{ b.title }}》</option>
      <option value="__none__">随手记</option>
    </select>
  </div>

  <!-- 旧数据里默认记成「识字」的词：给家长一个一键改回「词语」的入口 -->
  <div v-if="charWordCount && !hideKindTip" class="card kind-tip">
    <Icon name="alert-triangle" :size="16" />
    <span>
      词库里有 <b>{{ charWordCount }}</b> 个词标的是「识字」，日记会写成"认识了 XX"。
      之前录词默认就是「识字」，如果这些其实是{{ ta() }}<b>会说</b>的词，可以一键改成「词语」；个别真的是认字的，再到表格里单独改回来。
    </span>
    <button class="mini-btn" @click="convertCharWords">全部改成「词语」</button>
    <button class="mini-btn ghost" @click="hideKindTip = true">先不改</button>
  </div>

  <!-- 词库宫格 / 表格 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="message-circle" :size="16" />词库</span>
      <span class="more">
        {{ filtered.length }} 个 ·
        <span class="view-toggle">
          <span :class="{ on: listView === 'grid' }" @click="listView = 'grid'">宫格</span>｜<span :class="{ on: listView === 'table' }" @click="listView = 'table'">表格</span>
        </span>
        <template v-if="missingPinyinCount"> · <span class="fill-py" @click="fillAllPinyin">补齐拼音（{{ missingPinyinCount }}）</span></template>
        · 悬停/长按可删除
      </span>
    </div>
    <div class="word-grid" v-if="listView === 'grid'">
      <div
        v-for="w in filtered" :key="w.id"
        class="word-cell" :class="{ mastered: w.mastered }"
        v-longpress="() => delWord(w)"
        @dblclick="toggleMastered(w)"
        :title="(w.pinyin ? w.pinyin + ' · ' : '') + (w.mastered ? '已掌握（双击改为学习中）' : '学习中（双击标记已掌握）')"
      >
        {{ w.word }}<span v-if="w.funny" class="wquote on" title="金句">✨</span><img v-if="w.imageUrl" :src="w.imageUrl" class="wthumb" :alt="w.word" /><button v-if="w.audioUrl" class="waudio" :title="her('听她说')" @click.stop="playAudio(w.audioUrl)" @dblclick.stop><Icon name="volume" :size="12" /></button><span class="wkind">{{ w.kind }}{{ w.mastered ? ' · 已掌握' : '' }}</span>
        <button class="wdel" @click.stop="delWord(w)">×</button>
      </div>
    </div>
    <!-- 表格视图：拼音/含义可直接编辑，点状态 pill 切换掌握 -->
    <div class="wt-scroll" v-else>
    <table class="word-table">
      <thead>
        <tr><th>图</th><th>词语</th><th>类型</th><th>拼音</th><th>含义 / 备注</th><th>来源</th><th>首现日期</th><th>状态</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="w in filtered" :key="w.id" :class="{ mastered: w.mastered }">
          <td>
            <img v-if="w.imageUrl" :src="w.imageUrl" class="wt-thumb" :alt="w.word" title="点击更换配图" @click="replaceImage(w)" />
            <button v-else class="wt-addimg" title="上传配图" @click="replaceImage(w)">＋</button>
          </td>
          <td class="wt-word">
            {{ w.word }}<button v-if="w.audioUrl" class="waudio" :title="her('听她说')" @click="playAudio(w.audioUrl)"><Icon name="volume" :size="12" /></button>
            <button v-if="w.kind === '句子'" class="wquote" :class="{ on: w.funny }" :title="w.funny ? '取消金句' : '标为金句（童言稚语）'" @click="updateWord(w.id, { funny: !w.funny })">✨</button>
          </td>
          <td>
            <select class="wt-kind" :value="w.kind" @change="e => updateWord(w.id, { kind: e.target.value })">
              <option v-for="k in WORD_KINDS" :key="k">{{ k }}</option>
            </select>
          </td>
          <td><input class="wt-input" :value="w.pinyin" placeholder="—" @change="e => editWord(w, 'pinyin', e.target.value)" /></td>
          <td><input class="wt-input" :value="w.meaning" placeholder="—" @change="e => editWord(w, 'meaning', e.target.value)" /></td>
          <td>{{ w.sourceBook ? '《' + w.sourceBook + '》' : '随手记' }}</td>
          <td>{{ w.date }}</td>
          <td><span class="wt-state" :class="{ on: w.mastered }" @click="toggleMastered(w)">{{ w.mastered ? '已掌握' : '学习中' }}</span></td>
          <td><button class="wdel" style="position:static;opacity:1" @click="delWord(w)">×</button></td>
        </tr>
      </tbody>
    </table>
    </div>
    <div v-if="!filtered.length" class="empty">{{ store.words.length ? '这个筛选条件下没有词' : '还没有词语记录' }}</div>
  </div>

  <!-- 首现日期 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="clock" :size="16" />词语首现日期</span>
    </div>
    <div v-for="w in filtered.slice(0, 15)" :key="'t' + w.id" class="ms-item">
      <span class="ms-date">{{ w.date }}</span>
      <div class="ms-text">
        {{ w.word }}
        <span v-if="w.sourceBook" style="color:var(--ink-2);font-size:12px">（读《{{ w.sourceBook }}》那天学会）</span>
      </div>
    </div>
    <div v-if="!filtered.length" class="empty">暂无记录</div>
  </div>

  <!-- 识字卡片全屏层 -->
  <WordCardSheet v-if="cardOpen" :words="filtered" @close="cardOpen = false" />

  <!-- 看字选图全屏层 -->
  <PicQuizSheet v-if="quizOpen" :words="store.words" @close="quizOpen = false" />

  <!-- 表格视图换图用的隐藏 file input -->
  <input ref="rowImgInput" type="file" accept="image/*" style="display:none" @change="pickRowImage" />
</template>

<script setup>
import { ta, her } from '../store.js'
import { ref, computed, reactive, watch } from 'vue'
import Icon from '../components/Icon.vue'
import WordCardSheet from '../components/WordCardSheet.vue'
import PicQuizSheet from '../components/PicQuizSheet.vue'
import { store, addWord, removeWord, setWordMastered, updateWord, setWordImage, WORD_KINDS } from '../store.js'
import { compressImage } from '../utils/image.js'
import { genPinyin } from '../utils/pinyin.js'
import { playAudio } from '../utils/recorder.js'

const cardOpen = ref(false)
const quizOpen = ref(false)
const fKind = ref('')
const fState = ref('')   // '' | 'learning' | 'mastered'
const fBook = ref('')    // '' | 书名 | '__none__'
const listView = ref('grid') // 'grid' | 'table'
const form = reactive({ word: '', kind: '词语', sourceBook: '', pinyin: '', meaning: '', image: '' })
const imgInput = ref(null)
const rowImgInput = ref(null)
const pendingImgWordId = ref('')

// 输入词语时自动生成拼音（多音字取最常见读音，可手改）
watch(() => form.word, w => { form.pinyin = genPinyin(w) })

// 一键给缺拼音的旧词补齐
const missingPinyinCount = computed(() => store.words.filter(w => !w.pinyin).length)
function fillAllPinyin() {
  let n = 0
  for (const w of store.words) {
    if (!w.pinyin) {
      const p = genPinyin(w.word)
      if (p) { updateWord(w.id, { pinyin: p }); n++ }
    }
  }
  alert(n ? `已给 ${n} 个词补上拼音` : '所有词都已有拼音')
}

const learningCount = computed(() => store.words.filter(w => !w.mastered).length)
const masteredCount = computed(() => store.words.filter(w => w.mastered).length)
const imageWordCount = computed(() => store.words.filter(w => w.imageUrl).length)

function openQuiz() {
  if (imageWordCount.value < 4) {
    alert(`看字选图需要至少 4 个带配图的词，目前已有 ${imageWordCount.value} 个。在下方录词时点上「+ 配图」即可。`)
    return
  }
  quizOpen.value = true
}

const filtered = computed(() => store.words.filter(w => {
  if (fKind.value && w.kind !== fKind.value) return false
  if (fState.value === 'learning' && w.mastered) return false
  if (fState.value === 'mastered' && !w.mastered) return false
  if (fBook.value === '__none__' && w.sourceBook) return false
  if (fBook.value && fBook.value !== '__none__' && w.sourceBook !== fBook.value) return false
  return true
}))

async function add() {
  if (!form.word) return
  await addWord({ word: form.word, kind: form.kind, sourceBook: form.sourceBook || null, pinyin: form.pinyin, meaning: form.meaning, image: form.image })
  form.word = ''; form.pinyin = ''; form.meaning = ''; form.image = ''
}

async function pickImage(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  form.image = await compressImage(f, 800, 0.72)
}

// 表格视图：给已有词上传/更换配图
function replaceImage(w) {
  pendingImgWordId.value = w.id
  rowImgInput.value.click()
}

async function pickRowImage(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f || !pendingImgWordId.value) return
  const dataUrl = await compressImage(f, 800, 0.72)
  await setWordImage(pendingImgWordId.value, dataUrl)
  pendingImgWordId.value = ''
}

function editWord(w, field, value) {
  updateWord(w.id, { [field]: value.trim() })
}

const hideKindTip = ref(false)
const charWordCount = computed(() => store.words.filter(w => w.kind === '识字').length)
function convertCharWords() {
  const list = store.words.filter(w => w.kind === '识字')
  if (!confirm(her(`把 ${list.length} 个「识字」的词都改成「词语」（她会说的词）？之后可以在表格里单独改回`))) return
  for (const w of list) updateWord(w.id, { kind: '词语' })
}

function delWord(w) {
  if (confirm(`把「${w.word}」从词库删除？`)) removeWord(w.id)
}

function toggleMastered(w) {
  setWordMastered(w.id, !w.mastered)
}
</script>

<style scoped>
.kind-tip { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; line-height: 1.6; border: 1px solid rgba(240, 147, 75, .45); background: #fff7ee; }
.kind-tip > svg { color: var(--brand-deep); flex: none; }
.kind-tip > span { flex: 1; min-width: 260px; }
.wt-kind { border: 1px solid transparent; border-radius: 8px; padding: 4px 6px; font-size: 13px; font-family: inherit; background: transparent; color: var(--ink); cursor: pointer; }
.wt-kind:hover, .wt-kind:focus { border-color: var(--line); background: #fff; outline: none; }
.wquote { border: none; background: none; cursor: pointer; font-size: 13px; opacity: .35; padding: 0 2px; }
.wquote.on, .wquote:hover { opacity: 1; }
.waudio {
  display: inline-flex; align-items: center; justify-content: center; vertical-align: 1px;
  width: 20px; height: 20px; margin-left: 4px; border-radius: 50%; border: none; cursor: pointer;
  background: #e0466f; color: #fff; padding: 0;
}
.waudio:hover { background: #c7335b; }
.card-entry {
  display: flex; align-items: center; gap: 12px; cursor: pointer;
  color: var(--brand-deep); border-color: rgba(240, 147, 75, .35);
}
.card-entry:hover { box-shadow: 0 4px 14px rgba(240, 147, 75, .16); }
.card-entry.disabled { opacity: .55; cursor: not-allowed; }
.card-entry.disabled:hover { box-shadow: none; }
.entry-text { flex: 1; font-size: 15px; font-weight: 700; color: var(--ink); }
.entry-sub { display: block; font-size: 12px; font-weight: 400; color: var(--ink-2); margin-top: 2px; }
.chip-select { outline: none; font-family: inherit; }
.fill-py { color: var(--brand-deep); cursor: pointer; font-weight: 600; }
.fill-py:hover { text-decoration: underline; }
.img-preview { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.img-preview img { width: 44px; height: 44px; object-fit: cover; border-radius: 10px; box-shadow: 0 2px 6px rgba(240,147,75,.18); }
.img-tip { flex: 1; font-size: 12px; color: var(--ink-3); }
.wthumb { width: 22px; height: 22px; object-fit: cover; border-radius: 6px; margin-left: 6px; vertical-align: -5px; }
.wt-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 8px; cursor: pointer; display: block; }
.wt-addimg {
  width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
  border: 1px dashed rgba(240,147,75,.5); background: rgba(240,147,75,.06);
  color: var(--brand-deep); font-size: 16px; line-height: 1;
}
</style>
