// ========== 城堡绘本识字 · 数据层 ==========
// 纯本地模式：结构化数据进 localStorage，封面原图进 IndexedDB。
// 数据 100% 留在本机浏览器；跨设备迁移走「导出/导入 JSON 备份」。

import { reactive, ref } from 'vue'
import { idbPutCover, idbGet, idbAllCovers, idbDelCover, idbClear } from './utils/idb.js'
import { compressDataUrl } from './utils/image.js'
import { dueDoses, monthLabel } from './utils/vaccineSchedule.js'
import { guessFoodGroups, guessPlaceCat, PLACE_CATS } from './utils/foodGroups.js'

export const APP_VERSION = '0.23.1'
const LS_KEY = 'castle-books-local-v1'

export const WORD_KINDS = ['发音', '词语', '识字', '句子', '歌谣']
export const BOOK_CATEGORIES = ['动物', '情感', '认知', '自然', '交通', '习惯', '其他']

// ---------- 工具 ----------
const p2 = n => String(n).padStart(2, '0')
// ISO 时间 → 本地 YYYY-MM-DD（比较"今天"用，避免 UTC 偏移误伤）
export function localDateOf(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

export function nowLocal() {
  const d = new Date()
  return `${todayStr()}T${p2(d.getHours())}:${p2(d.getMinutes())}`
}

function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// ---------- 初始数据 ----------
function buildSeed() {
  return {
    settings: { childName: '', birthday: todayStr(), tts: true },
    books: [],
    words: [],
    medicines: [],
    healths: [],
    vaccines: [],
    meals: [],
    toys: [],
    milestones: [],
    photos: [],
    trips: [],
    diaries: [],
    games: [],
    foods: [],
    places: [],
    illnesses: [],
    members: [
      { id: 'mb1', name: '爸爸', relation: '爸爸', color: '#5b8dd9' },
      { id: 'mb2', name: '妈妈', relation: '妈妈', color: '#e07a9a' },
    ],
  }
}

// ---------- 本地状态（响应式，视图只读它） ----------
export const store = reactive({
  settings: { childName: '', birthday: todayStr() },
  books: [],
  words: [],
  medicines: [],
  healths: [],
  vaccines: [],
  meals: [],
  toys: [],
  milestones: [],
  photos: [],
  trips: [],
  diaries: [],
  games: [],
  foods: [],
  places: [],
  illnesses: [],
  members: [],
})

export const ready = ref(false)

// 跨视图信号：「+ 新书上架」→ 通知书房页滚动聚焦上架表单
export const addBookSignal = ref(0)

// 日记页当前查看的日期（往日日记日历点某天 → 日记页切到这天）
export const diaryDate = ref(todayStr())

// 超过 14 天没备份时的提醒（日记页右栏显示）
export function backupDaysAgo() {
  const t = store.settings.lastExportAt
  if (!t) return null // 从没备份过
  return Math.floor((Date.now() - new Date(t).getTime()) / 86400000)
}

// ---------- 持久化（localStorage 存结构化数据，IndexedDB 存封面原图） ----------
let saveTimer = null

// 运行时缓存字段（图片 / 录音的 dataUrl），原件在 IndexedDB，不能写进 localStorage，
// 否则几十张照片就会撑爆 localStorage 约 5MB 的上限，导致之后的保存全部失败
const RUNTIME_KEYS = new Set(['coverUrl', 'imageUrl', 'avatarUrl', 'audioUrl'])
const dropRuntime = (k, v) => (RUNTIME_KEYS.has(k) ? undefined : v)

// 保存失败时给界面一个醒目的提示（之前只打 console，用户无从得知）
export const storageError = ref('')
let lastPersistFailed = false

// 写图片/录音到 IndexedDB：配额不足时自动重压图片再试一次，仍不行就在页面顶部给出明确提示
async function putMedia(rec, label = '文件') {
  try {
    await idbPutCover(rec)
    return true
  } catch (e) {
    if (e?.name === 'QuotaExceededError' && rec.dataUrl?.startsWith('data:image')) {
      try {
        const smaller = await compressDataUrl(rec.dataUrl, 640, 0.55)
        await idbPutCover({ ...rec, dataUrl: smaller })
        storageError.value = `浏览器存储空间有点紧张，已自动压缩这张${label}存下了。建议到「设置 → 备份与迁移」导出一次备份。`
        return true
      } catch { /* 重压也失败，走下面的统一提示 */ }
    }
    storageError.value = `浏览器存储空间不足，这张${label}没能保存。请先到「设置 → 备份与迁移」导出备份，再到相册删掉一些旧照片腾出空间。`
    return false
  }
}

export function persistNow() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      settings: store.settings,
      books: store.books,
      words: store.words,
      medicines: store.medicines,
      healths: store.healths,
      vaccines: store.vaccines,
      meals: store.meals,
      toys: store.toys,
      milestones: store.milestones,
      photos: store.photos,
      trips: store.trips,
      diaries: store.diaries,
      games: store.games,
      foods: store.foods,
      places: store.places,
      illnesses: store.illnesses,
      members: store.members,
    }, dropRuntime))
    if (lastPersistFailed) {
      storageError.value = ''
      lastPersistFailed = false
    }
  } catch (e) {
    console.warn('[castle-diary] 本地保存失败（存储空间不足？）', e)
    storageError.value = '刚才的记录没能保存到本机（浏览器存储空间不足）。请先到「设置 → 备份与迁移」导出备份。'
    lastPersistFailed = true
  }
}

function saveLocal() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persistNow, 300)
  scheduleAutoBackup()
}

function applyState(s) {
  store.settings = { childName: '', birthday: todayStr(), tts: true, ...(s.settings || {}) }
  store.books = s.books || []
  store.words = s.words || []
  store.medicines = s.medicines || []
  store.healths = s.healths || []
  store.vaccines = s.vaccines || []
  store.meals = s.meals || []
  store.toys = s.toys || []
  store.milestones = s.milestones || []
  store.photos = s.photos || []
  store.trips = s.trips || []
  store.diaries = s.diaries || []
  store.games = s.games || []
  store.foods = s.foods || []
  store.places = s.places || []
  store.illnesses = s.illnesses || []
  store.members = s.members || []
}

// 疫苗程序换版时的旧记录迁移（备用，当前不自动执行）：2021 版「白破疫苗 6 周岁」→ 2026 版「百白破疫苗 第 5 针（6 周岁）」
// 只改勾选存证的 key/name，接种日期与健康档案里的历史记录不动
function migrateVaccineKeys() {
  let changed = false
  for (const v of store.vaccines) {
    if (v.id === 'dt') {
      v.id = 'dtap5'
      v.name = '百白破疫苗 第 5 针'
      changed = true
    }
  }
  if (changed) persistNow()
}

async function loadLocal() {
  const raw = localStorage.getItem(LS_KEY)
  let s
  if (raw) {
    try { s = JSON.parse(raw) } catch { /* 损坏则重置 */ }
  }
  if (!s?.settings) {
    s = buildSeed()
    applyState(s)
    persistNow()
  } else {
    applyState(s)
  }
  // 2026 版换版迁移暂不自动执行（家长要求旧记录先不动）；
  // 旧「白破」勾选记录与新表的 dtap5 不冲突：存证仍在，只是不再对应到龄提醒

  // 合并 IndexedDB 里的封面/词图原图（coverId/imageId -> 运行时 Url 仅供渲染，不落 localStorage）
  try {
    const blobs = await idbAllCovers()
    const map = Object.fromEntries(blobs.map(b => [b.id, b.dataUrl]))
    for (const b of store.books) {
      if (b.coverId) b.coverUrl = map[b.coverId] || null
    }
    for (const w of store.words) {
      if (w.imageId) w.imageUrl = map[w.imageId] || null
      if (w.audioId) w.audioUrl = map[w.audioId] || null
    }
    for (const g of store.games) {
      if (g.imageId) g.imageUrl = map[g.imageId] || null
    }
    for (const p of store.photos) {
      if (p.imageId) p.imageUrl = map[p.imageId] || null
    }
    for (const t of store.toys) {
      if (t.imageId) t.imageUrl = map[t.imageId] || null
    }
    if (store.settings.avatarId) store.settings.avatarUrl = map[store.settings.avatarId] || null
  } catch (e) {
    console.warn('[castle-diary] 读取本地图片失败', e)
  }
  // 老数据补默认成员（爸爸妈妈）
  if (!store.members.length) {
    for (const m of buildSeed().members) store.members.push(m)
    persistNow()
  }
}

// 导出成功后记下时间，日记页据此提醒下次备份
export function markExported() {
  store.settings.lastExportAt = new Date().toISOString()
  persistNow()
}

// ---------- 自动备份到本地文件夹（v0.18，File System Access API，仅电脑端 Chrome/Edge） ----------
// 句柄存在 IndexedDB（结构化克隆），localStorage 只存开关与时间。
// 每天第一次有改动后静默写一个「城堡日记-自动备份.json」；权限被收回就在设置页提示重新授权。
export const autoBackup = reactive({ supported: !!window.showDirectoryPicker, enabled: false, dirName: '', status: '', lastAt: '' })
let backupDir = null
let backupTimer = null

export async function initAutoBackup() {
  if (!autoBackup.supported) return
  try {
    const rec = await idbGet('backup-dir')
    if (rec?.handle) {
      backupDir = rec.handle
      autoBackup.enabled = true
      autoBackup.dirName = rec.handle.name || '所选文件夹'
      autoBackup.lastAt = store.settings.autoBackupAt || ''
      const perm = await backupDir.queryPermission({ mode: 'readwrite' })
      autoBackup.status = perm === 'granted' ? 'on' : 'need-auth'
    }
  } catch (e) {
    console.warn('[auto-backup]', e)
  }
}

export async function enableAutoBackup() {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await idbPutCover({ id: 'backup-dir', handle })
  backupDir = handle
  autoBackup.enabled = true
  autoBackup.dirName = handle.name || '所选文件夹'
  autoBackup.status = 'on'
  await runAutoBackup(true)
}

export async function resumeAutoBackup() {
  if (!backupDir) return
  const perm = await backupDir.requestPermission({ mode: 'readwrite' })
  autoBackup.status = perm === 'granted' ? 'on' : 'need-auth'
}

export async function disableAutoBackup() {
  autoBackup.enabled = false
  backupDir = null
  await idbDelCover('backup-dir').catch(() => {})
}

async function runAutoBackup(force = false) {
  if (!autoBackup.enabled || !backupDir || autoBackup.status !== 'on') return
  const today = todayStr()
  const lastLocal = store.settings.autoBackupAt ? localDateOf(store.settings.autoBackupAt) : ''
  if (!force && lastLocal === today) return
  try {
    const fh = await backupDir.getFileHandle('城堡日记-自动备份.json', { create: true })
    const w = await fh.createWritable()
    await w.write(JSON.stringify(await exportBackup()))
    await w.close()
    store.settings.autoBackupAt = new Date().toISOString()
    autoBackup.lastAt = store.settings.autoBackupAt
    persistNow()
  } catch (e) {
    console.warn('[auto-backup] 写入失败', e)
    autoBackup.status = 'need-auth'
  }
}

function scheduleAutoBackup() {
  if (!autoBackup.enabled) return
  clearTimeout(backupTimer)
  backupTimer = setTimeout(() => runAutoBackup(), 8000)
}

async function init() {
  await loadLocal()
  await initAutoBackup()
  // 申请把浏览器存储固定住（照片、录音都在里面，避免磁盘紧张时被浏览器清掉）
  navigator.storage?.persist?.().then(ok => {
    if (!ok) console.warn('[castle-diary] 浏览器拒绝了持久化存储申请，请记得定期导出备份')
  }).catch(() => {})
  ready.value = true
}
init()

// ---------- 档案 ----------
export function updateSettings({ childName, birthday, tts }) {
  if (childName !== undefined) store.settings.childName = childName
  if (birthday) store.settings.birthday = birthday
  if (tts !== undefined) store.settings.tts = !!tts
  saveLocal()
}

// ---------- 书房 ----------
export function addBook({ title, author = '', publisher = '', category = '其他', age = '' }) {
  if (store.books.some(b => b.title === title)) return null
  const book = { id: uid(), title, author, publisher, category, age, reads: [] }
  store.books.unshift(book)
  saveLocal()
  return book
}

export function removeBook(id) {
  const book = store.books.find(b => b.id === id)
  const idx = store.books.findIndex(b => b.id === id)
  if (idx >= 0) store.books.splice(idx, 1)
  if (book?.coverId) idbDelCover(book.coverId).catch(e => console.warn('[cover]', e))
  saveLocal()
}

// 就地更新书籍信息（分类/作者等）
export function updateBook(id, fields) {
  const b = store.books.find(x => x.id === id)
  if (!b) return
  for (const k of ['author', 'publisher', 'category', 'age']) {
    if (fields[k] !== undefined) b[k] = fields[k]
  }
  saveLocal()
}

// 给书上封面（原图进 IndexedDB，内存里挂 coverUrl 供渲染）
export async function setBookCover(bookId, dataUrl) {
  const book = store.books.find(b => b.id === bookId)
  if (!book) return
  if (book.coverId && book.coverId !== undefined) {
    await idbDelCover(book.coverId).catch(() => {})
  }
  const coverId = uid()
  await putMedia({ id: coverId, dataUrl }, '封面')
  book.coverId = coverId
  book.coverUrl = dataUrl
  saveLocal()
}

// 书记一次阅读（书籍详情页快捷入口）
export function addRead(bookId, read) {
  const book = store.books.find(b => b.id === bookId)
  if (!book) return
  book.reads.unshift({ id: uid(), ...read })
  saveLocal()
}

// 撤销一次阅读：优先按 id，老数据没有 id 就按时间
export function removeRead(bookId, ref) {
  const book = store.books.find(b => b.id === bookId)
  if (!book) return
  const idx = book.reads.findIndex(r => (r.id || r.time) === ref)
  if (idx >= 0) { book.reads.splice(idx, 1); saveLocal() }
}

// 近 N 天阅读趋势（按天聚合分钟数与次数，附带当天读过的书名供悬停展示）
export function readingTrend(days = 14) {
  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    buckets.push({ date: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, minutes: 0, count: 0, titles: [] })
  }
  const map = Object.fromEntries(buckets.map(b => [b.date, b]))
  for (const b of store.books) {
    for (const r of b.reads) {
      const day = map[r.time.slice(0, 10)]
      if (day) {
        day.count++
        day.minutes += r.minutes || 0
        if (!day.titles.includes(b.title)) day.titles.push(b.title)
      }
    }
  }
  return buckets
}

export function monthReadStats() {
  const ym = todayStr().slice(0, 7)
  let count = 0, minutes = 0
  for (const b of store.books) {
    for (const r of b.reads) {
      if (r.time.slice(0, 7) === ym) { count++; minutes += r.minutes || 0 }
    }
  }
  return { count, minutes }
}

// ---------- 词库 ----------
export function addWord({ word, kind = '词语', sourceBook = null, date, pinyin = '', meaning = '', image = '', audio = null, funny = false }) {
  const w = {
    id: uid(), word, kind,
    date: date || todayStr(),
    sourceBook: sourceBook || null,
    pinyin: pinyin || '',
    meaning: meaning || '',
    mastered: false,
    funny: !!funny,   // 金句：说得很妙的话（童言稚语）
  }
  // 配图（可选）：原图进 IndexedDB，词条只挂 imageId，imageUrl 为运行时缓存
  if (image) {
    w.imageId = uid()
    w.imageUrl = image
    putMedia({ id: w.imageId, dataUrl: image }, '配图')
  }
  // 录音（可选）：她自己说这个词的声音，同样进 IndexedDB
  if (audio?.dataUrl) {
    w.audioId = uid()
    w.audioMs = audio.ms || 0
    w.audioUrl = audio.dataUrl
    putMedia({ id: w.audioId, dataUrl: audio.dataUrl }, '录音')
  }
  store.words.unshift(w)
  saveLocal()
  return w
}

// 给已有的词补录 / 换录音
export async function setWordAudio(id, audio) {
  const w = store.words.find(x => x.id === id)
  if (!w || !audio?.dataUrl) return
  if (w.audioId) await idbDelCover(w.audioId).catch(() => {})
  const audioId = uid()
  await putMedia({ id: audioId, dataUrl: audio.dataUrl }, '录音')
  w.audioId = audioId
  w.audioMs = audio.ms || 0
  w.audioUrl = audio.dataUrl
  saveLocal()
}

export function removeWord(id) {
  const w = store.words.find(x => x.id === id)
  const idx = store.words.findIndex(x => x.id === id)
  if (idx >= 0) { store.words.splice(idx, 1); saveLocal() }
  if (w?.imageId) idbDelCover(w.imageId).catch(e => console.warn('[word-img]', e))
  if (w?.audioId) idbDelCover(w.audioId).catch(e => console.warn('[word-audio]', e))
}

export function setWordMastered(id, mastered) {
  const w = store.words.find(x => x.id === id)
  if (w) { w.mastered = mastered; saveLocal() }
}

// 就地更新词条目（表格视图编辑拼音/含义用）
export function updateWord(id, fields) {
  const w = store.words.find(x => x.id === id)
  if (!w) return
  if (fields.pinyin !== undefined) w.pinyin = fields.pinyin
  if (fields.meaning !== undefined) w.meaning = fields.meaning
  if (fields.kind && WORD_KINDS.includes(fields.kind)) w.kind = fields.kind
  if (fields.funny !== undefined) w.funny = !!fields.funny
  saveLocal()
}

// 给词配/换图（原图进 IndexedDB，内存里挂 imageUrl 供渲染）
export async function setWordImage(id, dataUrl) {
  const w = store.words.find(x => x.id === id)
  if (!w) return
  if (w.imageId) await idbDelCover(w.imageId).catch(() => {})
  const imageId = uid()
  await putMedia({ id: imageId, dataUrl }, '照片')
  w.imageId = imageId
  w.imageUrl = dataUrl
  saveLocal()
}

// ---------- 药箱 ----------
export const MED_UNITS = ['盒', '瓶', '支', '袋', '粒', '贴']

export function addMedicine({ name, spec = '', stock = 1, unit = '盒', expiry = '' }) {
  const med = {
    id: uid(), name, spec,
    stock: Number(stock) || 1, unit, expiry,
    createdAt: nowLocal(),
    logs: [{ mode: 'in', time: nowLocal(), note: `入库 ${Number(stock) || 1} ${unit}` }],
  }
  store.medicines.unshift(med)
  saveLocal()
  return med
}

export function removeMedicine(id) {
  const idx = store.medicines.findIndex(m => m.id === id)
  if (idx >= 0) { store.medicines.splice(idx, 1); saveLocal() }
}

// 记一次用药：库存 -1 并写日志；返回 { med, emptied } 供页面提示补货
// time 默认现在（补记以前的日子时传那天）；illnessId 表示这次用药属于哪次生病
export function useMedicine(id, time = '', illnessId = '') {
  const med = store.medicines.find(m => m.id === id)
  if (!med) return null
  if (med.stock > 0) med.stock--
  const log = { mode: 'use', time: time || nowLocal(), note: '用药一次' }
  if (illnessId) log.illnessId = illnessId
  med.logs.unshift(log)
  saveLocal()
  return { med, emptied: med.stock === 0 }
}

// 手动补货（库存 +n 并写日志）
export function restockMedicine(id, n = 1) {
  const med = store.medicines.find(m => m.id === id)
  if (!med) return
  med.stock += Number(n) || 1
  med.logs.unshift({ mode: 'in', time: nowLocal(), note: `补货 ${Number(n) || 1} ${med.unit}` })
  saveLocal()
}

// 临期状态：danger=已过期，warn=30 天内到期，ok=安全
export function medStatus(m) {
  if (!m.expiry) return { level: 'ok', text: '未填有效期', days: null }
  const days = Math.ceil((new Date(m.expiry + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000)
  if (days < 0) return { level: 'danger', text: `已过期 ${-days} 天`, days }
  if (days === 0) return { level: 'warn', text: '今天到期', days }
  if (days <= 30) return { level: 'warn', text: `${days} 天后到期`, days }
  return { level: 'ok', text: '有效期内', days }
}

// ---------- 健康档案 ----------
export const HEALTH_KINDS = ['体检', '疫苗', '就医', '生长']

export function addHealth({ kind = '体检', date, title, note = '', height = '', weight = '', nextDate = '' }) {
  const h = {
    id: uid(), kind,
    date: date || todayStr(),
    title: title || kind,
    note,
    height: height ? Number(height) : null,
    weight: weight ? Number(weight) : null,
    nextDate: nextDate || '',
    createdAt: nowLocal(),
  }
  store.healths.unshift(h)
  saveLocal()
  return h
}

export function removeHealth(id) {
  const idx = store.healths.findIndex(h => h.id === id)
  if (idx >= 0) { store.healths.splice(idx, 1); saveLocal() }
}

// 生长曲线数据点：体检/生长记录里带身高体重的，按日期升序
export function growthPoints() {
  return store.healths
    .filter(h => (h.kind === '体检' || h.kind === '生长') && (h.height || h.weight))
    .map(h => ({ date: h.date, height: h.height, weight: h.weight }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// 宝宝月龄（疫苗计划表用）
export function babyMonths() {
  const bd = store.settings.birthday
  if (!bd) return 0
  const b = new Date(bd + 'T00:00:00')
  const n = new Date()
  let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
  if (n.getDate() < b.getDate()) m--
  return Math.max(0, m)
}

// ---------- 疫苗计划表 ----------
// 记为已打：存证 + 联动写一条健康档案（healthId 关联，撤销时一起删）
export function setVaccineDone(key, name, date) {
  const d = date || todayStr()
  const h = addHealth({ kind: '疫苗', date: d, title: name, note: '计划表勾选接种' })
  const exist = store.vaccines.find(v => v.id === key)
  if (exist) {
    removeHealth(exist.healthId)
    exist.date = d
    exist.healthId = h.id
    saveLocal()
    return exist
  }
  const v = { id: key, name, date: d, healthId: h.id }
  store.vaccines.push(v)
  saveLocal()
  return v
}

export function cancelVaccine(key) {
  const idx = store.vaccines.findIndex(v => v.id === key)
  if (idx >= 0) {
    const v = store.vaccines[idx]
    if (v.healthId) removeHealth(v.healthId)
    store.vaccines.splice(idx, 1)
    saveLocal()
  }
}

// ---------- 生病记（v0.16：一次生病一张卡） ----------
export const SYMPTOMS = ['发烧', '咳嗽', '流鼻涕', '鼻塞', '嗓子哑', '拉肚子', '呕吐', '便秘', '起疹子', '没精神', '不爱吃饭', '哭闹睡不好']

// 某天正在进行的那次生病（开始 ≤ date，且没好或好的那天 ≥ date）
export function illnessOn(date) {
  return store.illnesses.find(i => i.start <= date && (!i.end || i.end >= date)) || null
}
export function illnessDays(ill, onDate) {
  const end = onDate || ill.end || todayStr()
  return Math.round((new Date(end + 'T00:00:00') - new Date(ill.start + 'T00:00:00')) / 86400000) + 1
}

export function startIllness({ date, symptoms = [] }) {
  const ill = { id: uid(), start: date || todayStr(), end: '', symptoms: [...symptoms], temps: [], notes: [], visits: [] }
  store.illnesses.unshift(ill)
  saveLocal()
  return ill
}
function findIll(id) { return store.illnesses.find(i => i.id === id) }

export function addSymptoms(id, list) {
  const ill = findIll(id)
  if (!ill) return
  for (const s of list) if (s && !ill.symptoms.includes(s)) ill.symptoms.push(s)
  saveLocal()
}
export function removeSymptom(id, s) {
  const ill = findIll(id)
  if (!ill) return
  ill.symptoms = ill.symptoms.filter(x => x !== s)
  saveLocal()
}
// 体温：time 为 YYYY-MM-DDTHH:mm
export function addTemp(id, value, time) {
  const ill = findIll(id)
  const v = Number(value)
  if (!ill || !(v >= 34 && v <= 43)) return null
  const t = { time: time || nowLocal(), value: Math.round(v * 10) / 10 }
  ill.temps.push(t)
  ill.temps.sort((a, b) => a.time.localeCompare(b.time))
  saveLocal()
  return t
}
export function removeTemp(id, time) {
  const ill = findIll(id)
  if (!ill) return
  ill.temps = ill.temps.filter(t => t.time !== time)
  saveLocal()
}
// 每天一句（同一天覆盖）
export function setIllnessNote(id, date, text) {
  const ill = findIll(id)
  if (!ill) return
  ill.notes = ill.notes.filter(n => n.date !== date)
  if (text) ill.notes.push({ date, text })
  ill.notes.sort((a, b) => a.date.localeCompare(b.date))
  saveLocal()
}
// 去医院：同时写一条健康档案「就医」，删除时一起删
export function addVisit(id, { date, title = '', note = '' }) {
  const ill = findIll(id)
  if (!ill) return null
  const d = date || todayStr()
  const h = addHealth({ kind: '就医', date: d, title: title || `看病（${ill.symptoms.join('、') || '不舒服'}）`, note })
  ill.visits.push({ date: d, healthId: h.id })
  saveLocal()
  return h
}
export function removeVisit(id, healthId) {
  const ill = findIll(id)
  if (!ill) return
  ill.visits = ill.visits.filter(v => v.healthId !== healthId)
  removeHealth(healthId)
  saveLocal()
}
// 这次生病里吃的药（从药箱日志里按 illnessId 找）
export function illnessMeds(id) {
  const out = []
  for (const m of store.medicines) {
    for (const l of m.logs || []) if (l.mode === 'use' && l.illnessId === id) out.push({ medId: m.id, name: m.name, time: l.time })
  }
  return out.sort((a, b) => a.time.localeCompare(b.time))
}
export function endIllness(id, date) {
  const ill = findIll(id)
  if (!ill) return
  ill.end = date || todayStr()
  if (ill.end < ill.start) ill.end = ill.start
  saveLocal()
}
// 这次生病里"最让人心疼 / 坚强的一个瞬间"
export function setIllnessMoment(id, text) {
  const ill = findIll(id)
  if (!ill) return
  ill.moment = (text || '').trim()
  saveLocal()
}

export function reopenIllness(id) {
  const ill = findIll(id)
  if (ill) { ill.end = ''; saveLocal() }
}
// 删除整次生病：体温 / 每天一句随之删除；就医记录一起删；药箱里的用药流水保留（库存已经扣了），只去掉关联
export function removeIllness(id) {
  const ill = findIll(id)
  if (!ill) return
  for (const v of ill.visits) removeHealth(v.healthId)
  for (const m of store.medicines) for (const l of m.logs || []) if (l.illnessId === id) delete l.illnessId
  store.illnesses.splice(store.illnesses.indexOf(ill), 1)
  saveLocal()
}

// ---------- 里程碑 ----------
export function addMilestone({ date, title, source = '' }) {
  // 同名同日的里程碑不重复记（首尝撤销重记等场景幂等）
  const dup = store.milestones.find(m => m.title === title && m.date === (date || todayStr()))
  if (dup) return dup
  const m = { id: uid(), date: date || todayStr(), title, source }
  store.milestones.unshift(m)
  saveLocal()
  return m
}

export function removeMilestone(id) {
  const idx = store.milestones.findIndex(m => m.id === id)
  if (idx >= 0) { store.milestones.splice(idx, 1); saveLocal() }
}

// ---------- 餐桌 ----------
export const MEALS = ['早餐', '午餐', '晚餐', '加餐']

export const MEAL_TAGS = ['爱吃', '不爱吃', '过敏']

// 记一餐；firstTaste=true 时自动进里程碑（「第一次吃 XX」）；tag 为「爱吃 / 不爱吃」（可选）
export function addMeal({ date, meal, food, firstTaste = false, note = '', tag = '' }) {
  const m = {
    id: uid(), date: date || todayStr(),
    meal, food, firstTaste: !!firstTaste, note,
    tag: MEAL_TAGS.includes(tag) ? tag : '',
    createdAt: nowLocal(),
  }
  store.meals.unshift(m)
  saveLocal()
  if (m.firstTaste) addMilestone({ date: m.date, title: `第一次吃 ${food}`, source: '餐桌' })
  if (m.tag === '过敏') setFoodAllergy(food, true, note, m.date)
  return m
}

export function removeMeal(id) {
  const idx = store.meals.findIndex(m => m.id === id)
  if (idx >= 0) { store.meals.splice(idx, 1); saveLocal() }
}

// 常吃的食物（快捷 chips 数据源：按出现次数取前 N）
export function frequentFoods(n = 8) {
  const freq = {}
  for (const m of store.meals) {
    if (m.food) freq[m.food] = (freq[m.food] || 0) + 1
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([food]) => food)
}

// ---------- 食物分类与过敏（v0.15：彩虹餐盘） ----------
// foods 里有记录 = 家长确认过分类；没有就按关键词猜
export function foodEntry(name) {
  return store.foods.find(f => f.name === name) || null
}
export function foodGroupsOf(name) {
  const f = foodEntry(name)
  return f?.groups ? f.groups : guessFoodGroups(name)
}
export function isFoodConfirmed(name) {
  return !!foodEntry(name)?.groups
}
function ensureFood(name) {
  let f = foodEntry(name)
  if (!f) {
    f = { name, groups: null, allergy: false, allergyNote: '', allergyDate: '' }
    store.foods.push(f)
  }
  return f
}
export function setFoodGroups(name, groups) {
  const f = ensureFood(name)
  f.groups = [...groups]
  saveLocal()
}
export function setFoodAllergy(name, on, note = '', date = '') {
  const f = ensureFood(name)
  f.allergy = !!on
  if (on) {
    if (note) f.allergyNote = note
    f.allergyDate = f.allergyDate || date || todayStr()
  }
  saveLocal()
}
export function allergyOf(name) {
  const f = foodEntry(name)
  return f?.allergy ? f : null
}

// 某一天吃到了哪几类（彩虹餐盘的一格）
export function dayFoodGroups(date) {
  const hit = new Set()
  for (const m of store.meals) {
    if (m.date !== date || !m.food) continue
    for (const g of foodGroupsOf(m.food)) hit.add(g)
  }
  return hit
}

// ---------- 玩具屋 ----------
export const TOY_CATEGORIES = ['益智', '玩偶', '运动', '音乐', '图书周边', '其他']

export function addToy({ name, category = '其他', link = '' }) {
  if (store.toys.some(t => t.name === name)) return null
  const t = {
    id: uid(), name, category, link,
    playCount: 0, lastPlayedAt: null, archived: false,
    createdAt: todayStr(),
  }
  store.toys.unshift(t)
  saveLocal()
  return t
}

// 更新玩具链接
export function updateToy(id, { link }) {
  const t = store.toys.find(x => x.id === id)
  if (!t) return
  t.link = link || ''
  saveLocal()
}

// 玩具图片：原图进 IndexedDB（复用 covers 表），内存挂 imageUrl 仅供渲染
export async function setToyImage(id, dataUrl) {
  const t = store.toys.find(x => x.id === id)
  if (!t) return
  if (t.imageId) await idbDelCover(t.imageId).catch(() => {})
  const imageId = uid()
  await putMedia({ id: imageId, dataUrl }, '照片')
  t.imageId = imageId
  t.imageUrl = dataUrl
  saveLocal()
}

export function removeToy(id) {
  const t = store.toys.find(x => x.id === id)
  const idx = store.toys.findIndex(x => x.id === id)
  if (idx >= 0) { store.toys.splice(idx, 1); saveLocal() }
  if (t?.imageId) idbDelCover(t.imageId).catch(() => {})
}

// 「玩了」：次数 +1，刷新最后玩日期
export function playToy(id) {
  const t = store.toys.find(x => x.id === id)
  if (!t) return
  t.playCount++
  t.lastPlayedAt = todayStr()
  saveLocal()
}

// 压箱底 / 翻出来
export function toggleToyArchive(id) {
  const t = store.toys.find(x => x.id === id)
  if (t) { t.archived = !t.archived; saveLocal() }
}

// 久未玩：未归档且（最后玩日期或入屋日期）超过 days 天
export function staleToys(days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000)
  return store.toys.filter(t => {
    if (t.archived) return false
    const last = t.lastPlayedAt || t.createdAt
    return last && new Date(last + 'T00:00:00') < cutoff
  })
}

// ---------- 游戏册（v0.14：记录一家人玩过的游戏，以及她一次次的进步） ----------
export const GAME_TAGS = ['精细动作', '大运动', '认知', '语言', '社交', '想象力']

export function addGame({ name, tags = [], toyIds = [], how = '' }) {
  name = (name || '').trim()
  if (!name) return null
  const exist = store.games.find(g => g.name === name)
  if (exist) return exist
  const g = {
    id: uid(), name,
    tags: tags.filter(t => GAME_TAGS.includes(t)),
    toyIds: [...toyIds], how,
    plays: [],
    createdAt: todayStr(),
  }
  store.games.unshift(g)
  saveLocal()
  return g
}

export function updateGame(id, fields) {
  const g = store.games.find(x => x.id === id)
  if (!g) return
  if (fields.name !== undefined && fields.name.trim()) g.name = fields.name.trim()
  if (fields.tags) g.tags = fields.tags.filter(t => GAME_TAGS.includes(t))
  if (fields.toyIds) g.toyIds = [...fields.toyIds]
  if (fields.how !== undefined) g.how = fields.how
  saveLocal()
}

export async function setGameImage(id, dataUrl) {
  const g = store.games.find(x => x.id === id)
  if (!g) return
  if (g.imageId) await idbDelCover(g.imageId).catch(() => {})
  const imageId = uid()
  await putMedia({ id: imageId, dataUrl }, '照片')
  g.imageId = imageId
  g.imageUrl = dataUrl
  saveLocal()
}

// 删除游戏：游戏卡片和它的里程碑一起删；玩时拍的照片仍留在相册
export function removeGame(id) {
  const g = store.games.find(x => x.id === id)
  if (!g) return
  for (const p of g.plays) if (p.milestoneId) removeMilestone(p.milestoneId)
  if (g.imageId) idbDelCover(g.imageId).catch(() => {})
  store.games.splice(store.games.indexOf(g), 1)
  saveLocal()
}

// 玩了一次：first=true 表示「第一次完成」，会写一条里程碑；可附一张照片（进相册）
export function addPlay(gameId, { date, note = '', first = false, photo = '' }) {
  const g = store.games.find(x => x.id === gameId)
  if (!g) return null
  const p = { id: uid(), date: date || todayStr(), note: note.trim(), first: !!first }
  if (photo) p.photoId = addPhoto({ dataUrl: photo, date: p.date, note: note.trim() || `玩${g.name}` }).id
  if (p.first) {
    p.milestoneId = addMilestone({ date: p.date, title: `${g.name}：${p.note || '第一次完成'}`, source: '游戏' }).id
  }
  g.plays.unshift(p)
  saveLocal()
  return p
}

// 撤销一次：连同它生成的里程碑；照片留在相册
export function removePlay(gameId, playId) {
  const g = store.games.find(x => x.id === gameId)
  if (!g) return
  const idx = g.plays.findIndex(p => p.id === playId)
  if (idx < 0) return
  const [p] = g.plays.splice(idx, 1)
  if (p.milestoneId) removeMilestone(p.milestoneId)
  saveLocal()
}

export function lastPlayDate(g) {
  return g.plays.reduce((a, p) => (p.date > a ? p.date : a), '')
}

// ---------- 相册 ----------
// 照片原图进 IndexedDB（复用 covers 表），localStorage 只存元数据
export function addPhoto({ dataUrl, date, note = '', milestoneId = '' }) {
  const p = {
    id: uid(),
    date: date || todayStr(),
    note,
    milestoneId: milestoneId || '',
  }
  if (dataUrl) {
    p.imageId = uid()
    p.imageUrl = dataUrl
    putMedia({ id: p.imageId, dataUrl }, '照片')
  }
  store.photos.unshift(p)
  saveLocal()
  return p
}

export function removePhoto(id) {
  const p = store.photos.find(x => x.id === id)
  if (p?.imageId) idbDelCover(p.imageId).catch(() => {})
  const idx = store.photos.findIndex(x => x.id === id)
  if (idx >= 0) { store.photos.splice(idx, 1); saveLocal() }
}

export function linkPhotoMilestone(id, milestoneId) {
  const p = store.photos.find(x => x.id === id)
  if (!p) return
  p.milestoneId = milestoneId || ''
  saveLocal()
}

// ---------- 出行 ----------
export function addTrip({ date, place, title = '', note = '', withWho = '', photo = '' }) {
  const t = { id: uid(), date: date || todayStr(), place, title: title || place, note, withWho }
  if (photo) t.photoId = addPhoto({ dataUrl: photo, date: t.date, note: note || `在${place}` }).id
  store.trips.unshift(t)
  saveLocal()
  return t
}

export function removeTrip(id) {
  const idx = store.trips.findIndex(t => t.id === id)
  if (idx >= 0) { store.trips.splice(idx, 1); saveLocal() }
}

// 地点分类（v0.15 足迹册）：places 里有记录 = 家长改过；没有就按名字猜
export { PLACE_CATS }
export function placeCatOf(name) {
  return store.places.find(p => p.name === name)?.cat || guessPlaceCat(name)
}
export function setPlaceCat(name, cat) {
  if (!PLACE_CATS.includes(cat)) return
  const p = store.places.find(x => x.name === name)
  if (p) p.cat = cat
  else store.places.push({ name, cat })
  saveLocal()
}

// 常去地点 Top N
export function topPlaces(n = 6) {
  const counter = {}
  for (const t of store.trips) {
    if (!t.place) continue
    counter[t.place] = (counter[t.place] || 0) + 1
  }
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([place, count]) => ({ place, count }))
}

// ---------- 日记（v0.13：一天一篇，只存心情 / 想说的话 / 落款；其余内容从各模块按日期聚合） ----------
export const MOODS = [
  { key: '开心', text: '很开心', color: '#f5a742' },
  { key: '好奇', text: '对什么都很好奇', color: '#6aa6d8' },
  { key: '黏人', text: '特别黏人', color: '#e58fae' },
  { key: '闹脾气', text: '有点闹脾气', color: '#e0735a' },
  { key: '犯困', text: '一直犯困', color: '#9b8fd0' },
]

export function getDiary(date) {
  return store.diaries.find(d => d.date === date) || null
}

// 局部更新当天日记（没有就新建）；mood / text / by 任意组合
export function saveDiary(date, fields) {
  let d = getDiary(date)
  if (!d) {
    d = { id: uid(), date, mood: '', text: '', by: '' }
    store.diaries.unshift(d)
  }
  for (const k of ['mood', 'text', 'by']) {
    if (fields[k] !== undefined) d[k] = fields[k]
  }
  d.updatedAt = nowLocal()
  saveLocal()
  return d
}

// 年龄文本：1 岁 8 个月零 7 天 / 8 个月整；onDate 早于生日返回空
export function babyAgeText(onDate) {
  const bd = store.settings.birthday
  if (!bd) return ''
  const b = new Date(bd + 'T00:00:00')
  const d = new Date((onDate || todayStr()) + 'T00:00:00')
  if (d < b) return ''
  let months = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth())
  const anchorOf = m => {
    const a = new Date(b.getFullYear(), b.getMonth() + m, 1)
    const last = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate()
    a.setDate(Math.min(b.getDate(), last))
    return a
  }
  if (anchorOf(months) > d) months--
  const days = Math.round((d - anchorOf(months)) / 86400000)
  const y = Math.floor(months / 12)
  const m = months % 12
  let s = ''
  if (y) s += `${y} 岁`
  if (m) s += `${s ? ' ' : ''}${m} 个月`
  if (!y && !m) return days ? `出生第 ${days + 1} 天` : '出生这天'
  s += days ? `零 ${days} 天` : '整'
  return s
}

// ---------- 家庭成员 ----------
const MEMBER_COLORS = ['#5b8dd9', '#e07a9a', '#7fb069', '#e0a458', '#9b7ed9', '#5bb8b4']

export function addMember({ name, relation = '' }) {
  const m = {
    id: uid(), name,
    relation: relation || name,
    color: MEMBER_COLORS[store.members.length % MEMBER_COLORS.length],
  }
  store.members.push(m)
  saveLocal()
  return m
}

export function removeMember(id) {
  const idx = store.members.findIndex(m => m.id === id)
  if (idx >= 0) { store.members.splice(idx, 1); saveLocal() }
}

// ---------- 小主人档案 ----------
export function setAvatar(dataUrl) {
  if (store.settings.avatarId) idbDelCover(store.settings.avatarId).catch(() => {})
  if (dataUrl) {
    const id = uid()
    store.settings.avatarId = id
    store.settings.avatarUrl = dataUrl
    putMedia({ id, dataUrl }, '头像')
  } else {
    delete store.settings.avatarId
    delete store.settings.avatarUrl
  }
  saveLocal()
}

// 最新一次身高/体重（从体检/生长记录里取）
export function latestGrowth() {
  const pts = store.healths
    .filter(h => (h.height || h.weight) && h.date)
    .sort((a, b) => b.date.localeCompare(a.date))
  return pts[0] || null
}

// ---------- 提醒中心聚合 ----------
// 返回 [{ kind, icon, level, text, view }]；level: danger/warn/ok
export function allReminders() {
  const list = []
  const today = todayStr()
  // 正在生病（排在最前）
  for (const ill of store.illnesses.filter(i => !i.end)) {
    list.push({ kind: '生病', icon: 'heart-pulse', level: 'danger', text: `生病第 ${illnessDays(ill, today)} 天（${ill.symptoms.join('、') || '不舒服'}），好了记得点「好了」`, view: 'illness' })
  }
  // 药品临期/过期/补货
  for (const m of store.medicines) {
    const s = medStatus(m)
    if (s.level === 'danger') list.push({ kind: '药品', icon: 'pill', level: 'danger', text: `「${m.name}」已过期（${m.expiry}）`, view: 'medicine' })
    else if (s.level === 'warn') list.push({ kind: '药品', icon: 'pill', level: 'warn', text: `「${m.name}」${s.text}`, view: 'medicine' })
    if (!m.stock) list.push({ kind: '药品', icon: 'pill', level: 'warn', text: `「${m.name}」用完了，记得补货`, view: 'medicine' })
  }
  // 疫苗该打了（按月龄）
  const months = babyMonths()
  if (months != null) {
    const done = new Set(store.vaccines.map(v => v.id))
    for (const v of dueDoses(months, done).slice(0, 4)) {
      list.push({ kind: '疫苗', icon: 'syringe', level: 'warn', text: `${v.name}（${monthLabel(v.month)}）该打了`, view: 'health' })
    }
  }
  // 健康记录里的"下次日期"
  for (const h of store.healths) {
    if (h.nextDate && h.nextDate >= today) {
      const left = Math.round((new Date(h.nextDate) - new Date(today)) / 86400000)
      if (left <= 14) list.push({ kind: '健康', icon: 'heart-pulse', level: left <= 3 ? 'danger' : 'warn', text: `${h.kind}「${h.title}」预约 ${h.nextDate}（${left === 0 ? '今天' : left + ' 天后'}）`, view: 'health' })
    }
  }
  // 玩具久未玩
  for (const t of staleToys(30)) {
    list.push({ kind: '玩具', icon: 'blocks', level: 'ok', text: `「${t.name}」超过 30 天没玩了`, view: 'toys' })
  }
  const lv = { danger: 0, warn: 1, ok: 2 }
  return list.sort((a, b) => lv[a.level] - lv[b.level])
}

// ---------- 回忆聚合（周报 / 年度回顾共用） ----------
// 宝宝出生第 N 天（1 起算）；未填生日返回 null
export function babyDayOfLife(onDate) {
  if (!store.settings.birthday) return null
  const b = new Date(store.settings.birthday + 'T00:00:00')
  const d = onDate ? new Date(onDate + 'T00:00:00') : new Date()
  const days = Math.floor((d - b) / 86400000) + 1
  return days >= 1 ? days : null
}

// 汇总 [startDate, endDate]（YYYY-MM-DD，闭区间）内各模块发生了什么
export function rangeReport(startDate, endDate) {
  const inRange = d => d && d >= startDate && d <= endDate
  // 阅读
  let readCount = 0, readMinutes = 0
  const readBooks = new Map() // title -> { count, minutes }
  const readDays = new Set()
  for (const b of store.books) {
    for (const r of b.reads || []) {
      const day = (r.time || '').slice(0, 10)
      if (!inRange(day)) continue
      readCount++
      readMinutes += r.minutes || 0
      readDays.add(day)
      const t = readBooks.get(b.title) || { count: 0, minutes: 0 }
      t.count++; t.minutes += r.minutes || 0
      readBooks.set(b.title, t)
    }
  }
  const topBook = [...readBooks.entries()].sort((a, b) => b[1].count - a[1].count)[0] || null
  // 识字
  const newWords = store.words.filter(w => inRange(w.date))
  // 餐桌
  const meals = store.meals.filter(m => inRange(m.date))
  const firstTastes = meals.filter(m => m.firstTaste).map(m => m.food)
  // 里程碑
  const milestones = store.milestones.filter(m => inRange(m.date)).sort((a, b) => a.date.localeCompare(b.date))
  // 玩具
  const toysPlayed = store.toys.filter(t => inRange((t.lastPlayedAt || '').slice(0, 10)))
  // 家庭游戏
  const games = []
  let playCount = 0
  for (const g of store.games) {
    const ps = g.plays.filter(p => inRange(p.date))
    if (!ps.length) continue
    playCount += ps.length
    games.push({ name: g.name, count: ps.length, firsts: ps.filter(p => p.first).map(p => p.note || '第一次完成') })
  }
  games.sort((a, b) => b.count - a.count)
  // 健康 + 用药
  const healths = store.healths.filter(h => inRange(h.date)).sort((a, b) => a.date.localeCompare(b.date))
  // 生病（和这段时间有交集的）
  const illnesses = store.illnesses
    .filter(i => i.start <= endDate && (!i.end || i.end >= startDate))
    .map(i => ({ symptoms: i.symptoms, days: illnessDays(i), ended: !!i.end, maxTemp: i.temps.reduce((a, t) => Math.max(a, t.value), 0) }))
  let medUses = 0
  for (const m of store.medicines) {
    for (const l of m.logs || []) {
      if (l.mode === 'use' && inRange((l.time || '').slice(0, 10))) medUses++
    }
  }
  return {
    readCount, readMinutes, readDays: readDays.size,
    bookTitles: [...readBooks.keys()],
    topBook: topBook ? { title: topBook[0], ...topBook[1] } : null,
    newWords,
    mealCount: meals.length, firstTastes,
    milestones,
    toysPlayed,
    games, playCount,
    healths, medUses, illnesses,
  }
}

// ---------- 清空 ----------
export async function resetAll() {
  localStorage.removeItem(LS_KEY)
  await idbClear().catch(() => {})
  location.reload()
}

// ---------- 备份导出 / 导入（跨设备迁移的唯一通道） ----------
// 导出：完整 JSON，封面内嵌 base64，可直接导入另一台设备/浏览器
export async function exportBackup() {
  return {
    app: 'castle-books', // 存储/备份格式标识，不动（改了会孤儿化老数据与旧备份）
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: (({ avatarUrl, ...s }) => s)(store.settings), // avatarUrl 是运行时缓存，不导出
    books: store.books.map(({ coverUrl, ...b }) => b), // coverUrl 是运行时缓存，不导出
    words: store.words.map(({ imageUrl, audioUrl, ...w }) => w), // imageUrl / audioUrl 同理
    medicines: store.medicines,
    healths: store.healths,
    vaccines: store.vaccines,
    meals: store.meals,
    toys: store.toys.map(({ imageUrl, ...t }) => t), // imageUrl 是运行时缓存，不导出
    milestones: store.milestones,
    photos: store.photos.map(({ imageUrl, ...p }) => p),
    trips: store.trips,
    diaries: store.diaries,
    games: store.games.map(({ imageUrl, ...g }) => g),
    foods: store.foods,
    places: store.places,
    illnesses: store.illnesses,
    members: store.members,
    covers: [
      // 书籍封面 + 词配图 + 相册照片 + 玩具图片 + 头像统一走 covers 数组（都是 {id, dataUrl}）
      ...store.books.filter(b => b.coverId && b.coverUrl).map(b => ({ id: b.coverId, dataUrl: b.coverUrl })),
      ...store.words.filter(w => w.imageId && w.imageUrl).map(w => ({ id: w.imageId, dataUrl: w.imageUrl })),
      ...store.photos.filter(p => p.imageId && p.imageUrl).map(p => ({ id: p.imageId, dataUrl: p.imageUrl })),
      ...store.toys.filter(t => t.imageId && t.imageUrl).map(t => ({ id: t.imageId, dataUrl: t.imageUrl })),
      ...store.words.filter(w => w.audioId && w.audioUrl).map(w => ({ id: w.audioId, dataUrl: w.audioUrl })),
      ...store.games.filter(g => g.imageId && g.imageUrl).map(g => ({ id: g.imageId, dataUrl: g.imageUrl })),
      ...(store.settings.avatarId && store.settings.avatarUrl ? [{ id: store.settings.avatarId, dataUrl: store.settings.avatarUrl }] : []),
    ],
  }
}

// 导入：整体替换当前设备数据（导入前请确认旧数据已备份或不需要）
// 兼容 castle-diary 旧备份：抽书房/词库/药箱/健康记录一起迁移
export async function importBackup(data) {
  let payload
  if (data?.app === 'castle-books') {
    payload = data
  } else if (data?.baby && (data.books || data.words)) {
    // castle-diary 旧格式；封面在 photos 里没有对应关系，不迁移
    payload = {
      settings: { childName: data.baby?.name || '', birthday: data.baby?.birthday || todayStr() },
      books: data.books || [],
      words: (data.words || []).map(w => ({ mastered: false, ...w })),
      // 药箱：diary 的 medicines 结构兼容，logs 兜底补空数组
      medicines: (data.medicines || []).map(m => ({ spec: '', unit: '盒', ...m, logs: m.logs || [] })),
      // 健康档案：diary 存在 events 里（type='health'，meta.kind/height/weight）
      healths: (data.events || [])
        .filter(e => e.type === 'health')
        .map(e => ({
          id: e.id || uid(),
          kind: e.meta?.kind || '体检',
          date: (e.time || '').slice(0, 10) || todayStr(),
          title: e.title || e.meta?.kind || '体检',
          note: e.note || '',
          height: e.meta?.height || null,
          weight: e.meta?.weight || null,
          nextDate: e.meta?.nextDate || '',
          createdAt: e.time || nowLocal(),
        })),
      vaccines: data.vaccines || [],
      // 餐桌：diary 存在 events 里（type='diet'，meta.meal/firstTaste）
      meals: (data.events || [])
        .filter(e => e.type === 'diet')
        .map(e => ({
          id: e.id || uid(),
          date: (e.time || '').slice(0, 10) || todayStr(),
          meal: e.meta?.meal || '加餐',
          food: e.title || '',
          firstTaste: !!e.meta?.firstTaste,
          note: e.note || '',
          createdAt: e.time || nowLocal(),
        })),
      // 玩具屋：diary 的 items 即玩具
      toys: (data.items || []).map(t => ({
        id: t.id || uid(), name: t.name, category: t.category || '其他',
        playCount: t.playCount || 0, lastPlayedAt: t.lastPlayedAt || null,
        archived: !!t.archived, createdAt: t.createdAt || todayStr(),
      })),
      // 里程碑：diary milestones + events 里 type=moment 且 isFirst 的
      milestones: [
        ...(data.milestones || []),
        ...(data.events || [])
          .filter(e => e.type === 'moment' && e.meta?.isFirst)
          .map(e => ({
            id: e.id || uid(),
            date: (e.time || '').slice(0, 10) || todayStr(),
            title: e.title,
            source: '成长瞬间',
          })),
      ],
      // 出行：diary 存在 events 里（type='outing'，meta.place）
      trips: (data.events || [])
        .filter(e => e.type === 'outing')
        .map(e => ({
          id: e.id || uid(),
          date: (e.time || '').slice(0, 10) || todayStr(),
          place: e.meta?.place || e.title || '',
          title: e.title || e.meta?.place || '',
          note: e.note || '',
        })),
      // 相册：diary 备份内嵌 dataUrl，借 covers 通道迁移进 IndexedDB
      photos: (data.photos || []).map(p => ({
        id: p.id || uid(),
        date: (p.time || '').slice(0, 10) || todayStr(),
        note: p.note || '',
        milestoneId: '',
        ...(p.dataUrl ? { imageId: p.id } : {}),
      })),
      // 家庭成员：结构兼容
      members: (data.members || []).map(m => ({ id: m.id || uid(), name: m.name, relation: m.relation || m.name, color: m.color || '#5b8dd9' })),
      covers: (data.photos || []).filter(p => p.dataUrl).map(p => ({ id: p.id, dataUrl: p.dataUrl })),
    }
    payload.__fromDiary = true
  } else {
    throw new Error('备份文件格式不对')
  }

  // 事务化导入：当前数据先存进回滚键；新数据全部写完后才切换，中途失败可回滚
  const rollback = localStorage.getItem(LS_KEY)
  const { covers = [], ...rest } = payload
  const words = (rest.words || []).map(w => ({ mastered: false, ...w })) // 词数据兜底补齐 mastered 字段
  try {
    await idbClear().catch(() => {})
    for (const c of covers) {
      if (c.dataUrl) await putMedia({ id: c.id, dataUrl: c.dataUrl }, '图片')
    }
    applyState({ ...rest, words })
    persistNow() // 导入这种关键操作立即落盘，不走防抖
  } catch (e) {
    // 中途失败：回滚 localStorage，IndexedDB 里旧图还在原 id 下的概率很高，刷新后尽量恢复
    if (rollback) localStorage.setItem(LS_KEY, rollback)
    throw new Error('导入中断，已尽量恢复原数据，请刷新页面确认后再试')
  }
  return { fromDiary: !!payload.__fromDiary }
}
