// ========== 日记造句：把某一天各模块的记录拼成一段像日记的话 ==========
// 只读 store，不写数据。每行是一组 token：
//   { t: 'text', v }                       普通文字
//   { t: 'hl', v, kind, del?, badge? }     高亮内容（kind 决定颜色；del 用于在日记里撤销这条记录）
import { store, MEALS, MOODS, getDiary, illnessOn, illnessDays, illnessMeds } from '../store.js'

const MEAL_WORD = { 早餐: '早饭', 午餐: '午饭', 晚餐: '晚饭', 加餐: '加餐' }
const SPOKEN_KINDS = ['词语', '发音']

const txt = v => ({ t: 'text', v })
const hl = (v, kind, extra = {}) => ({ t: 'hl', v, kind, ...extra })

// 把多个 token 用顿号连起来
function joinTokens(list) {
  const out = []
  list.forEach((tk, i) => {
    if (i) out.push(txt('、'))
    out.push(tk)
  })
  return out
}

// 会说的词按录入先后编号（store.words 是新的在前）
function spokenIndexMap() {
  const spoken = store.words.filter(w => SPOKEN_KINDS.includes(w.kind)).reverse()
  spoken.sort((a, b) => a.date.localeCompare(b.date)) // 稳定排序：同日保持录入顺序
  return new Map(spoken.map((w, i) => [w.id, i + 1]))
}

export function childName() {
  return store.settings.childName || '宝宝'
}

export function dayLines(date) {
  const lines = []
  const diary = getDiary(date)

  // 心情
  const mood = MOODS.find(m => m.key === diary?.mood)
  if (mood) lines.push({ key: 'mood', tokens: [txt(`今天${childName()}`), hl(mood.text, 'mood'), txt('。')] })

  // 吃了：按餐次分句
  const meals = store.meals.filter(m => m.date === date)
  const mealOrder = [...MEALS, '']
  for (const meal of mealOrder) {
    const list = meals.filter(m => (m.meal || '') === meal).reverse() // 录入先后
    if (!list.length) continue
    const foods = list.map(m => hl(m.food, 'food', {
      del: { coll: 'meals', id: m.id },
      badge: m.firstTaste ? '首尝' : (m.tag || ''),
    }))
    const head = meal ? `${MEAL_WORD[meal] || meal}吃了` : '还吃了'
    lines.push({ key: 'meal-' + (meal || 'other'), tokens: [txt(head), ...joinTokens(foods), txt('。')] })
  }

  // 去了
  const trips = store.trips.filter(t => t.date === date).reverse()
  const seenToday = new Set()
  for (const t of trips) {
    const firstEver = !seenToday.has(t.place) && !store.trips.some(x => x.place === t.place && x.date < date)
    seenToday.add(t.place)
    const tokens = []
    tokens.push(txt(t.withWho ? `和${t.withWho}去了` : '去了'))
    tokens.push(hl(t.place, 'trip', { del: { coll: 'trips', id: t.id }, badge: firstEver ? '新足迹' : '' }))
    if (t.title && t.title !== t.place) tokens.push(txt(`，${t.title}`))
    if (t.note) tokens.push(txt(`，${t.note}`))
    tokens.push(txt('。'))
    lines.push({ key: 'trip-' + t.id, tokens })
  }

  // 读了：同一本书当天读多次合并
  const reads = []
  for (const b of store.books) {
    const today = (b.reads || []).filter(r => (r.time || '').slice(0, 10) === date)
    if (!today.length) continue
    const latest = today.reduce((a, r) => (r.time > a.time ? r : a), today[0])
    const total = b.reads.filter(r => r.time <= latest.time).length
    const notes = today.map(r => r.note).filter(Boolean)
    reads.push({ b, latest, total, times: today.length, notes })
  }
  if (reads.length) {
    const toks = reads.map(r => hl(`《${r.b.title}》`, 'book', {
      del: { coll: 'reads', bookId: r.b.id, time: r.latest.time, id: r.latest.id },
      badge: r.total >= 10 && r.total % 10 === 0 ? '最爱书' : '',
      suffix: r.times > 1 ? `读了 ${r.times} 遍，累计第 ${r.total} 次` : `第 ${r.total} 次`,
    }))
    const tokens = [txt('读了'), ...joinTokens(toks)]
    const notes = reads.flatMap(r => r.notes)
    if (notes.length) tokens.push(txt(`，${notes.join('；')}`))
    tokens.push(txt('。'))
    lines.push({ key: 'reads', tokens })
  }

  // 她说 / 认字 / 歌谣
  const words = store.words.filter(w => w.date === date).reverse()
  const idx = spokenIndexMap()
  const spoken = words.filter(w => SPOKEN_KINDS.includes(w.kind))
  if (spoken.length) {
    const last = spoken[spoken.length - 1]
    const toks = spoken.map(w => hl(`“${w.word}”`, 'say', { del: { coll: 'words', id: w.id }, audio: w.audioUrl || '', word: { id: w.id, kind: w.kind } }))
    const tokens = [txt('她说了新词'), ...joinTokens(toks)]
    if (idx.get(last.id)) tokens.push(txt(`，这是她会说的第 ${idx.get(last.id)} 个词`))
    tokens.push(txt('。'))
    lines.push({ key: 'say', tokens })
  }
  const quotes = words.filter(w => w.kind === '句子' && w.funny)
  for (const w of quotes) {
    lines.push({
      key: 'quote-' + w.id,
      tokens: [txt('她说了句让人笑出声的话：'), hl(`“${w.word}”`, 'quote', { del: { coll: 'words', id: w.id }, audio: w.audioUrl || '', word: { id: w.id, kind: w.kind }, badge: '金句' })],
    })
  }
  const sentences = words.filter(w => w.kind === '句子' && !w.funny)
  if (sentences.length) {
    const toks = sentences.map(w => hl(`“${w.word}”`, 'say', { del: { coll: 'words', id: w.id }, audio: w.audioUrl || '', word: { id: w.id, kind: w.kind } }))
    lines.push({ key: 'sentence', tokens: [txt(spoken.length || quotes.length ? '还说了' : '她说了'), ...joinTokens(toks), txt('。')] })
  }
  const songs = words.filter(w => w.kind === '歌谣')
  if (songs.length) {
    const toks = songs.map(w => hl(`“${w.word}”`, 'say', { del: { coll: 'words', id: w.id }, audio: w.audioUrl || '', word: { id: w.id, kind: w.kind } }))
    lines.push({ key: 'song', tokens: [txt('会唱'), ...joinTokens(toks), txt('了。')] })
  }
  const chars = words.filter(w => w.kind === '识字')
  if (chars.length) {
    const toks = chars.map(w => hl(`“${w.word}”`, 'say', { del: { coll: 'words', id: w.id }, audio: w.audioUrl || '', word: { id: w.id, kind: w.kind } }))
    lines.push({ key: 'chars', tokens: [txt('认识了'), ...joinTokens(toks), txt('。')] })
  }

  // 玩了：一次一句，带上她的表现
  const plays = []
  for (const g of store.games) {
    for (const p of g.plays) if (p.date === date) plays.push({ g, p })
  }
  plays.reverse()
  for (const { g, p } of plays) {
    const nth = g.plays.filter(x => x.date < p.date || (x.date === p.date && g.plays.indexOf(x) >= g.plays.indexOf(p))).length
    const tokens = [txt('玩了'), hl(g.name, 'game', {
      del: { coll: 'plays', gameId: g.id, playId: p.id },
      suffix: `第 ${nth} 次`,
      badge: p.first ? '第一次' : '',
    })]
    if (p.note) tokens.push(txt(`，${p.note}`))
    tokens.push(txt('。'))
    lines.push({ key: 'play-' + p.id, tokens })
  }

  // 里程碑（首尝、游戏的「第一次」已经在对应句子里体现，这里只放其他来源）
  for (const m of store.milestones.filter(m => m.date === date && m.source !== '餐桌' && m.source !== '游戏')) {
    lines.push({ key: 'ms-' + m.id, tokens: [txt('今天的里程碑：'), hl(m.title, 'milestone'), txt('。')] })
  }

  // 生病：这一天属于哪次生病，就写一句"第 N 天 + 体温 + 吃药 + 看医生 + 一句话"
  const ill = illnessOn(date)
  const illHealthIds = new Set(store.illnesses.flatMap(i => i.visits.map(v => v.healthId)))
  if (ill) {
    const tokens = [txt(date === ill.start ? '开始不舒服：' : `生病第 ${illnessDays(ill, date)} 天：`)]
    tokens.push(hl(ill.symptoms.join('、') || '不舒服', 'sick', { jump: 'illness' }))
    const temps = ill.temps.filter(t => t.time.slice(0, 10) === date)
    if (temps.length) {
      const max = Math.max(...temps.map(t => t.value))
      tokens.push(txt(temps.length > 1 ? `，量了 ${temps.length} 次体温，最高 ` : '，体温 '), hl(`${max.toFixed(1)}℃`, 'sick'))
    }
    const meds = {}
    for (const m of illnessMeds(ill.id)) if (m.time.slice(0, 10) === date) meds[m.name] = (meds[m.name] || 0) + 1
    const medNames = Object.entries(meds).map(([n, c]) => hl(c > 1 ? `${n} ${c} 次` : n, 'health'))
    if (medNames.length) tokens.push(txt('，吃了'), ...joinTokens(medNames))
    if (ill.visits.some(v => v.date === date)) tokens.push(txt('，去医院看了'))
    const note = ill.notes.find(n => n.date === date)
    if (note) tokens.push(txt(`，${note.text}`))
    tokens.push(txt('。'))
    if (ill.end === date) {
      tokens.push(hl(`病好了，这次一共 ${illnessDays(ill)} 天`, 'sick', { badge: '痊愈' }), txt('。'))
      if (ill.moment) lines.push({ key: 'moment-' + ill.id, tokens: [hl('最让人心疼的瞬间', 'quote'), txt('：'), hl(ill.moment, 'quote'), txt('。')] })
    }
    lines.push({ key: 'ill-' + ill.id, tokens })
  }

  // 健康（生病时去医院的就医记录已经写在上面那句里）
  for (const h of store.healths.filter(h => h.date === date && !illHealthIds.has(h.id))) {
    const tokens = []
    if (h.kind === '疫苗') tokens.push(txt('打了疫苗：'), hl(h.title, 'health'))
    else if (h.kind === '就医') tokens.push(txt('去看了医生：'), hl(h.title, 'health'))
    else {
      tokens.push(txt('做了'), hl(h.title || h.kind, 'health'))
      const hw = [h.height ? `身高 ${h.height} cm` : '', h.weight ? `体重 ${h.weight} kg` : ''].filter(Boolean)
      if (hw.length) tokens.push(txt(`，${hw.join('、')}`))
    }
    tokens.push(txt('。'))
    lines.push({ key: 'h-' + h.id, tokens })
  }

  // 用药（不属于某次生病的，比如在药箱页直接点「用药」）
  const meds = []
  for (const m of store.medicines) {
    const n = (m.logs || []).filter(l => l.mode === 'use' && !l.illnessId && (l.time || '').slice(0, 10) === date).length
    if (n) meds.push(hl(n > 1 ? `${m.name} ${n} 次` : m.name, 'health'))
  }
  if (meds.length) lines.push({ key: 'meds', tokens: [txt('用了药：'), ...joinTokens(meds), txt('。')] })

  const photos = store.photos.filter(p => p.date === date)
  return { lines, photos, diary }
}

// 纯文字版（「一个月前的今天」摘要、复制分享用）
export function linesToText(lines) {
  return lines.map(l => l.tokens.map(t => t.v).join('')).join('')
}

// 某月每天的概况：{ 'YYYY-MM-DD': { count, mood, photo } }，日历和右栏统计用
export function monthIndex(ym) {
  const map = {}
  const hit = (date, n = 1) => {
    if (!date || date.slice(0, 7) !== ym) return null
    map[date] = map[date] || { count: 0, mood: '', photo: null, hasText: false }
    map[date].count += n
    return map[date]
  }
  for (const m of store.meals) hit(m.date)
  for (const t of store.trips) hit(t.date)
  for (const w of store.words) hit(w.date)
  for (const h of store.healths) hit(h.date)
  for (const i of store.illnesses) {
    for (const t of i.temps) hit(t.time.slice(0, 10))
    for (const n of i.notes) hit(n.date)
    hit(i.start)
    if (i.end) hit(i.end)
  }
  for (const m of store.milestones) if (m.source !== '餐桌' && m.source !== '游戏') hit(m.date)
  for (const g of store.games) for (const p of g.plays) hit(p.date)
  for (const b of store.books) for (const r of b.reads || []) hit((r.time || '').slice(0, 10))
  for (const p of store.photos) {
    const d = hit(p.date)
    if (d && !d.photo && p.imageUrl) d.photo = p.imageUrl
  }
  for (const d of store.diaries) {
    if (!d.mood && !d.text) continue
    const e = hit(d.date, 0)
    if (!e) continue
    e.mood = d.mood
    if (d.text) { e.hasText = true; e.count++ }
  }
  return map
}
