<template>
  <div class="view-head">
    <h2>城堡书房</h2>
    <p class="sub">只记录读过的，不卖书 · 点封面看详情</p>
  </div>

  <!-- 书房统计 -->
  <div class="stat-row">
    <div class="stat-box"><div class="num">{{ store.books.length }}</div><div class="lbl">城堡藏书</div></div>
    <div class="stat-box"><div class="num">{{ stats.count }}</div><div class="lbl">本月阅读次数</div></div>
    <div class="stat-box"><div class="num">{{ stats.minutes }}</div><div class="lbl">本月分钟</div></div>
    <div class="stat-box"><div class="num">{{ store.words.length }}</div><div class="lbl">沉淀词语</div></div>
  </div>

  <!-- 阅读足迹：趋势 + 地图合并一卡，桌面双栏并排省纵向空间 -->
  <div class="card">
    <div class="footprint-grid">
      <div class="fp-col">
        <div class="fp-head">
          <span class="ct-left"><Icon name="trending-up" :size="15" />近 14 天阅读趋势</span>
          <span class="more">分钟</span>
        </div>
        <svg class="trend-chart" :viewBox="`0 0 ${trend.length * 30} 118`">
          <!-- 背景轨道柱：空态也有"图"的结构感 -->
          <rect
            v-for="(d, i) in trend" :key="'bg' + d.date"
            :x="i * 30 + 5" y="14" :width="20" height="84" rx="5"
            :fill="i === trend.length - 1 ? 'rgba(240,147,75,.14)' : 'rgba(206,170,128,.2)'"
          >
            <title>{{ d.date }}：没读</title>
          </rect>
          <!-- 数值柱（叠加在轨道上），悬停显示当天读的书 -->
          <rect
            v-for="(d, i) in trend" :key="d.date"
            :x="i * 30 + 5" :y="98 - barH(d.minutes)" :width="20" :height="barH(d.minutes)"
            rx="5" :fill="d.minutes ? 'url(#barGrad)' : 'transparent'"
          >
            <title v-if="d.count">{{ d.date }}：读了 {{ d.count }} 次 · {{ d.minutes }} 分钟
{{ d.titles.map(t => '《' + t + '》').join('、') }}</title>
          </rect>
          <!-- 有数据的日子：柱顶标分钟数 -->
          <text
            v-for="(d, i) in trend" :key="'m' + d.date"
            v-show="d.minutes"
            :x="i * 30 + 15" :y="92 - barH(d.minutes)" text-anchor="middle" class="trend-value"
          >{{ d.minutes }}</text>
          <!-- 底线 -->
          <line x1="0" y1="99" :x2="trend.length * 30" y2="99" stroke="rgba(180,140,95,.5)" stroke-width="1.2" />
          <text
            v-for="(d, i) in trend" :key="'t' + d.date"
            :x="i * 30 + 15" y="112" text-anchor="middle" class="trend-label"
            :class="{ today: i === trend.length - 1 }"
          >{{ d.date.slice(8) }}</text>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ffb470" /><stop offset="1" stop-color="#ff9273" />
            </linearGradient>
          </defs>
        </svg>
        <div class="empty" style="padding:6px 0 0" v-if="!trend.some(d => d.count)">近 14 天还没读过，今晚来一本？</div>
      </div>
      <div class="fp-col">
        <div class="fp-head">
          <span class="ct-left"><Icon name="map" :size="15" />阅读地图</span>
          <span class="more">近 16 周 · 悬停看当天书目</span>
        </div>
        <div class="heat-wrap">
          <svg class="heat-chart" :viewBox="`0 0 ${heatWeeks.length * 15} 105`">
            <template v-for="(week, wi) in heatWeeks" :key="wi">
              <rect
                v-for="d in week" :key="d.date"
                :x="wi * 15" :y="d.dow * 15" width="12" height="12" rx="3"
                :fill="heatColor(d.minutes)"
              >
                <title>{{ d.date }}<template v-if="d.count">：读了 {{ d.count }} 次 · {{ d.minutes }} 分钟 · {{ d.titles.map(t => '《' + t + '》').join('、') }}</template><template v-else>：没读</template></title>
              </rect>
            </template>
          </svg>
          <div class="heat-legend">
            <span>少</span>
            <i v-for="l in [0, 10, 20, 40, 61]" :key="l" :style="{ background: heatColor(l) }"></i>
            <span>多</span>
          </div>
        </div>
        <div class="empty" style="padding:6px 0 0" v-if="!heatWeeks.flat().some(d => d.count)">地图上还没有足迹，读完一本就会点亮一格</div>
      </div>
    </div>
  </div>

  <!-- 添加藏书（支持把封面图直接拖到这张卡片上） -->
  <div class="card add-card" ref="addCardRef" :class="{ 'drop-active': dragOver }"
    @dragover.prevent="dragOver = true" @dragleave.prevent="dragOver = false" @drop.prevent="onDrop"
  >
    <div class="card-title">
      <span class="ct-left"><Icon name="plus" :size="16" />新书上架</span>
      <span class="more">拍封面 / 拖图可自动识别书名</span>
    </div>
    <div class="inline-add">
      <input ref="titleInput" v-model.trim="newTitle" placeholder="绘本名称" style="flex:1.4" @keyup.enter="add" />
      <input v-model.trim="newAuthor" placeholder="作者（可选）" />
      <select v-model="newCat" title="分类">
        <option v-for="c in BOOK_CATEGORIES" :key="c" :value="c">{{ c }}</option>
      </select>
      <button class="mini-btn" @click="add">上架</button>
    </div>
    <div class="inline-add" style="margin-top:8px">
      <input v-model.trim="newPublisher" placeholder="出版社（可选）" @keyup.enter="add" />
      <input v-model.trim="newAge" placeholder="适龄（可选，如 3-6 岁）" style="max-width:180px" @keyup.enter="add" />
    </div>
    <div v-if="ocrCandidates.length" class="ocr-cands">
      <span class="cand-tip">识别不准？点这里换：</span>
      <button v-for="c in ocrCandidates" :key="c" class="cand-chip" @click="newTitle = c; newCat = guessCategory(c)">{{ c }}</button>
    </div>
    <div class="cover-row">
      <button class="ocr-btn" :disabled="ocrLoading" @click="fileInput.click()">
        <Icon name="scan" :size="16" />{{ ocrLoading ? '识别中…' : '拍封面识别书名' }}
      </button>
      <div v-if="pendingCover" class="cover-preview">
        <img :src="pendingCover" alt="封面预览" />
        <span>上架后作为本书封面</span>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onCover" />
  </div>

  <!-- 书架（整张卡片也接受拖入封面图，松手即走 OCR 上架流程） -->
  <div
    class="card" :class="{ 'drop-active': dragOverShelf }"
    @dragover.prevent="dragOverShelf = true" @dragleave.prevent="dragOverShelf = false" @drop.prevent="onShelfDrop"
  >
    <div class="card-title">
      <span class="ct-left"><Icon name="library" :size="16" />书架</span>
      <span class="more">{{ filteredBooks.length }} / {{ store.books.length }} 本 · 拖封面图进来也能上架</span>
    </div>
    <!-- 顶部操作栏：搜索 + 近 14 天趋势迷你图 + 新书上架 + 分类筛选 -->
    <div class="shelf-toolbar">
      <div class="shelf-toolbar-row">
        <input v-model.trim="search" class="shelf-search" placeholder="搜索书名 / 作者…" />
        <!-- 近 14 天趋势迷你图 -->
        <svg class="mini-trend" :viewBox="`0 0 ${trend.length * 8} 24`" :title="'近 14 天阅读趋势（分钟）'">
          <rect
            v-for="(d, i) in trend" :key="'mini' + d.date"
            :x="i * 8 + 1" :y="20 - miniBarH(d.minutes)" width="5" :height="Math.max(2, miniBarH(d.minutes))" rx="1.5"
            :fill="d.minutes ? '#ff9273' : 'rgba(206,170,128,.3)'"
          ><title>{{ d.date }}：{{ d.minutes ? d.minutes + ' 分钟' : '没读' }}</title></rect>
          <line x1="0" y1="21" :x2="trend.length * 8" y2="21" stroke="rgba(180,140,95,.4)" stroke-width="1" />
        </svg>
        <button class="mini-btn" @click="scrollToAdd"><Icon name="plus" :size="13" />新书上架</button>
      </div>
      <div class="chip-row" style="margin-bottom:0">
        <span class="chip" :class="{ sel: !fCat }" @click="fCat = ''">全部</span>
        <span v-for="c in BOOK_CATEGORIES" :key="c" class="chip" :class="{ sel: fCat === c }" @click="fCat = c">{{ c }}</span>
      </div>
    </div>
    <div class="book-grid">
      <div v-for="b in filteredBooks" :key="b.id" class="book-cell clickable" @click="$emit('open', b.id)">
        <div class="bwrap">
          <div class="bcover">
            <img v-if="b.coverUrl" :src="b.coverUrl" :alt="b.title" />
            <template v-else>{{ b.title.slice(0, 1) }}</template>
          </div>
          <div class="shelf-board"></div>
          <!-- Hover 快速操作浮层 -->
          <div class="boverlay" @click.stop>
            <template v-if="wordFor !== b.id">
              <div class="bo-stats">已读 {{ b.reads.length }} 次 · 词 {{ wordCount(b.title) }}</div>
              <button class="bo-btn" @click="quickRead(b)">
                <Icon name="book-open" :size="14" />{{ justRead === b.id ? '已打卡 +15分钟' : '+ 记一次阅读' }}
              </button>
              <button class="bo-btn" @click="wordFor = b.id"><Icon name="message-circle" :size="14" />录入新词</button>
              <button class="bo-btn bo-primary" @click="$emit('open', b.id)"><Icon name="chevron-right" :size="14" />查看详情</button>
            </template>
            <!-- 内联录词 -->
            <template v-else>
              <div class="bo-stats">录词自动关联《{{ b.title }}》</div>
              <input v-model.trim="quickWord" class="bo-input" placeholder="词 / 字 / 句子" @keyup.enter="addQuickWord(b)" @keyup.esc="wordFor = ''" ref="quickWordInput" />
              <select v-model="quickKind" class="bo-input"><option v-for="k in WORD_KINDS" :key="k">{{ k }}</option></select>
              <div style="display:flex;gap:6px">
                <button class="bo-btn bo-primary" style="flex:1" @click="addQuickWord(b)">记下来</button>
                <button class="bo-btn" @click="wordFor = ''">取消</button>
              </div>
            </template>
          </div>
        </div>
        《{{ b.title }}》
        <span class="bmeta">{{ b.author || '佚名' }} · {{ b.category }}</span>
      </div>
    </div>
    <div v-if="!filteredBooks.length" class="empty">{{ store.books.length ? '没有符合筛选的书' : '书架还空着，上架第一本绘本吧' }}</div>
  </div>

  <!-- 阅读闭环 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="link" :size="16" />阅读 → 识字闭环</span>
    </div>
    <div class="loop-flow">
      <div class="lf-node"><span class="lf-icon"><Icon name="book-open" :size="20" /></span>读绘本</div>
      <span class="lf-arrow">→</span>
      <div class="lf-node"><span class="lf-icon"><Icon name="message-circle" :size="20" /></span>沉淀词语</div>
      <span class="lf-arrow">→</span>
      <div class="lf-node"><span class="lf-icon"><Icon name="sparkles" :size="20" /></span>卡片巩固</div>
    </div>
  </div>

  <!-- 最近阅读 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="clock" :size="16" />最近阅读</span>
    </div>
    <div v-for="r in recentReads" :key="r.key" class="tl-item">
      <span class="tl-time">{{ r.time.slice(5, 10) }}</span>
      <span class="tl-icon"><Icon name="book-open" :size="18" /></span>
      <div class="tl-body">
        <div class="tl-title">《{{ r.book }}》 {{ r.minutes ? r.minutes + ' 分钟' : '' }}</div>
        <div v-if="r.note || r.scene" class="tl-note">{{ r.scene }} {{ r.note }}</div>
      </div>
    </div>
    <div v-if="!recentReads.length" class="empty">还没有阅读记录</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Icon from '../components/Icon.vue'
import { store, monthReadStats, readingTrend, addBook, setBookCover, addRead, addWord, nowLocal, WORD_KINDS, BOOK_CATEGORIES, addBookSignal, updateSettings } from '../store.js'
import { compressImage } from '../utils/image.js'
import { ocrRecognize } from '../utils/ocr.js'
import { genPinyin } from '../utils/pinyin.js'

defineEmits(['open'])

const newTitle = ref('')
const newAuthor = ref('')
const newCat = ref('其他')
const newPublisher = ref('')
const newAge = ref('')
const fileInput = ref(null)
const ocrLoading = ref(false)
const pendingCover = ref('') // 待上架封面（压缩后的 dataUrl）
const dragOver = ref(false)   // 封面图拖拽悬停在上架卡片上
const addCardRef = ref(null)
const titleInput = ref(null)

// 书架标题栏「+ 新书上架」：滚动到上架卡片并聚焦书名输入
function scrollToAdd() {
  addCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => titleInput.value?.focus(), 350)
}

// 侧边栏全局「+ 新书上架」按钮的信号（切到书房视图后触发）
watch(addBookSignal, () => scrollToAdd())

// P0：搜索 + 分类筛选
const search = ref('')
const fCat = ref('')
const filteredBooks = computed(() => store.books.filter(b => {
  if (fCat.value && b.category !== fCat.value) return false
  if (search.value) {
    const q = search.value.toLowerCase()
    if (!b.title.toLowerCase().includes(q) && !(b.author || '').toLowerCase().includes(q)) return false
  }
  return true
}))

// P0：Hover 快速操作
const wordFor = ref('')      // 正在录词的书 id
const quickWord = ref('')
const quickKind = ref('词语')
const justRead = ref('')     // 刚打卡的书 id（短暂反馈）

const wordCount = title => store.words.filter(w => w.sourceBook === title).length

function quickRead(b) {
  addRead(b.id, { time: nowLocal(), minutes: 15, scene: '睡前', withWho: '', note: '' })
  justRead.value = b.id
  setTimeout(() => { if (justRead.value === b.id) justRead.value = '' }, 1600)
}

async function addQuickWord(b) {
  if (!quickWord.value) return
  await addWord({ word: quickWord.value, kind: quickKind.value, sourceBook: b.title, pinyin: genPinyin(quickWord.value) })
  quickWord.value = ''
  wordFor.value = ''
}

const stats = computed(() => monthReadStats())
const trend = computed(() => readingTrend(14))
const maxMinutes = computed(() => Math.max(20, ...trend.value.map(d => d.minutes)))
const barH = m => (m ? Math.max(10, (m / maxMinutes.value) * 80) : 0)
// 书架标题栏迷你趋势图：柱高最大 18px
const miniBarH = m => (m ? Math.max(3, (m / maxMinutes.value) * 18) : 0)

// 阅读地图：近 16 周（周一开头），按天聚合分钟数与书目
const heatWeeks = computed(() => {
  const map = {}
  for (const b of store.books) {
    for (const r of b.reads) {
      const key = r.time.slice(0, 10)
      if (!map[key]) map[key] = { minutes: 0, count: 0, titles: [] }
      map[key].count++
      map[key].minutes += r.minutes || 0
      if (!map[key].titles.includes(b.title)) map[key].titles.push(b.title)
    }
  }
  // 起点：15 周前的周一
  const today = new Date()
  const dow = (today.getDay() + 6) % 7 // 周一=0
  const start = new Date(today.getTime() - (dow + 15 * 7) * 86400000)
  const weeks = []
  for (let w = 0; w < 16; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const t = new Date(start.getTime() + (w * 7 + d) * 86400000)
      const date = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
      const agg = map[date] || { minutes: 0, count: 0, titles: [] }
      week.push({ date, dow: d, ...agg })
    }
    weeks.push(week)
  }
  return weeks
})

// 热力配色：分钟数越多越深（品牌橙色系）
function heatColor(m) {
  if (!m) return 'rgba(206,170,128,.16)'
  if (m <= 15) return '#ffd9b3'
  if (m <= 30) return '#ffab5e'
  if (m <= 60) return '#f0812c'
  return '#e8541e'
}

const recentReads = computed(() => {
  const list = []
  for (const b of store.books) {
    for (const r of b.reads) list.push({ ...r, book: b.title, key: b.id + r.time })
  }
  return list.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8)
})

async function add() {
  if (!newTitle.value) return
  const book = addBook({ title: newTitle.value, author: newAuthor.value, category: newCat.value, publisher: newPublisher.value, age: newAge.value })
  if (!book) return alert('这本书已经在架上啦')
  if (pendingCover.value) {
    await setBookCover(book.id, pendingCover.value).catch(e => console.warn('[cover]', e))
  }
  newTitle.value = ''; newAuthor.value = ''; newCat.value = '其他'; newPublisher.value = ''; newAge.value = ''; pendingCover.value = ''; ocrCandidates.value = []
}

// OCR：拍封面 → 压缩 → 直连 OCR.space 识别 → 按「字号 + 营销词黑名单」打分挑书名，
// 候选行可点选更换；顺带识别作者行（著/文/图/绘/译），封面暂存待上架
const ocrCandidates = ref([])

// 首次使用 OCR 前明确告知：封面图会发送给 OCR.space（第三方）识别；也可选手动录入不用它
function confirmOcrFirstUse() {
  if (store.settings.ocrNoticeShown) return true
  const ok = confirm('封面识别会把这张照片发送给第三方服务 OCR.space 进行文字识别（不经过我们自己的服务器）。\n\n不上传的话也可以直接手动输入书名上架。继续识别吗？')
  if (ok) updateSettings({ ocrNoticeShown: true })
  return ok
}

// 封面营销标语黑名单（命中大幅降权，避免把广告语当书名）
const MARKETING_RE = /百万|千万|畅销|销量|全\s*\d+\s*册|适合|周岁|\d+\s*[-~到]\s*\d+\s*岁|启蒙|推荐|必读|系列|大奖|获奖|套装|亲子共读|引进|正版|扫码|包邮|编著委员会|出版|社$/

// 清洗：去书名号/括号、汉字间空格合并（OCR 常把词拆开）
function cleanLine(t) {
  return t.replace(/[《》〈〉\[\]【】「」［］]/g, '').replace(/([一-龥])\s+(?=[一-龥])/g, '$1').trim()
}

// 按书名关键词粗猜分类（OCR 回填时预选，用户可改）
const CAT_GUESS = [
  ['动物', /熊|猫|狗|兔|鼠|猪|鸡|鸭|鸟|鱼|虫|恐龙|狮|虎|象|鹿|羊|马|蛙|龟|鲸|鲨|企鹅|狐狸|刺猬|河马|长颈鹿/],
  ['交通', /车|汽车|火车|飞机|船|挖掘机|公交|自行车|火箭/],
  ['情感', /爸爸|妈妈|爷爷|奶奶|爱|哭|笑|生气|害怕|勇敢|朋友|家人|抱抱|晚安/],
  ['认知', /数字|颜色|形状|字母|ABC|abc|认一认|学一学|第一套|认知/],
  ['自然', /花|树|雨|雪|风|月亮|太阳|星|海|山|四季|春天|夏天|秋天|冬天|种子/],
  ['习惯', /刷牙|洗澡|睡觉|吃饭|拉粑粑|便便|礼貌|分享|排队|收拾|好习惯|起床/],
]
function guessCategory(title) {
  for (const [cat, re] of CAT_GUESS) if (re.test(title)) return cat
  return '其他'
}

function pickTitle(lines) {
  const cjk = lines
    .map(l => ({ ...l, text: cleanLine(l.text) }))
    .filter(l => {
      const n = (l.text.match(/[一-龥]/g) || []).length
      if (n < 2 || n > 14) return false
      // 汉字占比过半（滤掉"新屋出EKNEWSEARTRESS"这类乱码行）
      const total = l.text.replace(/\s/g, '').length
      return total > 0 && n / total >= 0.5
    })
  if (!cjk.length) return { best: '', candidates: [] }
  const maxSize = Math.max(...cjk.map(l => l.size), 0)
  const scored = cjk.map(l => {
    const n = (l.text.match(/[一-龥]/g) || []).length
    // 主分：相对字号（书名通常是封面最大的中文行）；无版面信息时给中性分
    let score = maxSize ? (l.size / maxSize) * 100 : 50
    if (MARKETING_RE.test(l.text)) score -= 60
    else if (/绘本|童话/.test(l.text)) score += 8   // 书名常见词小幅加权
    if (n > 12) score -= 15                          // 过长更像标语
    if (/\d/.test(l.text)) score -= 10               // 带数字多为营销/册数
    return { ...l, score }
  }).sort((a, b) => b.score - a.score)
  const seen = new Map()
  for (const s of scored) if (!seen.has(s.text)) seen.set(s.text, s)
  const candidates = [...seen.values()]
    .slice(1) // 跳过最佳
    .filter(s => s.score >= 20 && (!maxSize || s.size >= maxSize * 0.3)) // 字号太小的多为乱码行
    .map(s => s.text)
    .slice(0, 3)
  return { best: scored[0].text, candidates }
}

function pickAuthor(lines, bestTitle) {
  // 命中「[日] 佐佐木洋子 文/图」「XXX 著」「XXX 译」这类行，提取人名
  // 不匹配单独的 绘/图，避免撞上书名里的「绘本」
  for (const l of lines) {
    // 先剥掉行首国别括号（[日]/(美)/［英］…），再做通用清洗
    const text = cleanLine(l.text.replace(/^\s*[（(\[【］［][^\]】)）］［]{1,4}[\]】)）］［]\s*/, ''))
    if (text.length > 24 || !/[一-龥]/.test(text)) continue
    if (text === bestTitle || MARKETING_RE.test(text)) continue
    const m = text.match(/([一-龥A-Za-z·]{2,12})\s*(?:著|译|文\/图|文\s*\/\s*图)/)
    if (m) return m[1].trim()
  }
  return ''
}

async function processCover(file) {
  if (!file || !file.type.startsWith('image/')) return
  ocrLoading.value = true
  ocrCandidates.value = []
  try {
    const dataUrl = await compressImage(file)
    pendingCover.value = dataUrl
    const lines = await ocrRecognize(dataUrl)
    const { best, candidates } = pickTitle(lines)
    if (!best) throw new Error('识别结果为空')
    newTitle.value = best
    newCat.value = guessCategory(best)
    ocrCandidates.value = candidates
    if (!newAuthor.value) {
      const author = pickAuthor(lines, best)
      if (author) newAuthor.value = author
    }
  } catch (err) {
    alert('没识别出来：' + err.message + '，手动输入吧')
  } finally {
    ocrLoading.value = false
  }
}

async function onCover(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !confirmOcrFirstUse()) return
  await processCover(file)
}

// 拖拽封面上架：图片拖进上架卡片松手即识别
function onDrop(e) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f && confirmOcrFirstUse()) processCover(f)
}

// 拖到书架卡片上也一样：先滚到上架表单，再走同一套识别流程
const dragOverShelf = ref(false)
function onShelfDrop(e) {
  dragOverShelf.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  scrollToAdd()
  processCover(file)
}
</script>

<style scoped>
.add-card .inline-add input, .add-card .inline-add select {
  border-color: rgba(240, 147, 75, .4); background: #fffdf9;
  box-shadow: 0 1px 4px rgba(240, 147, 75, .08);
}
.add-card .inline-add input:focus, .add-card .inline-add select:focus {
  border-color: var(--brand); box-shadow: 0 0 0 3px rgba(240, 147, 75, .14);
}
.ocr-cands { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 8px 2px 0; }
.ocr-cands .cand-tip { font-size: 12px; color: var(--ink-3); }
.cand-chip {
  border: 1px solid rgba(240, 147, 75, .45); background: #fff6ec; color: var(--brand-deep);
  border-radius: 999px; padding: 4px 12px; font-size: 13px; font-family: inherit;
  cursor: pointer; transition: all .12s;
}
.cand-chip:hover { background: var(--brand); color: #fff; border-color: var(--brand); }
.ocr-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px dashed rgba(240, 147, 75, .5); border-radius: 12px; padding: 9px;
  background: rgba(240, 147, 75, .06); color: var(--brand-deep);
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.ocr-btn:disabled { opacity: .6; cursor: wait; }
.cover-row { margin-top: 10px; display: flex; gap: 12px; align-items: center; }
.cover-preview {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--ink-2);
}
.cover-preview img {
  width: 44px; height: 58px; object-fit: cover;
  border-radius: 8px; border: 1px solid var(--line);
}
</style>
