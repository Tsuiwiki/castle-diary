// ========== 日记造句：把某一天各模块的记录拼成一段像日记的话 ==========
// v0.39 起改为「当天记录时间线」：每条记录（贴纸条目 / 文本日记）一项，带时间、独立可删。
// 只读数据，不写。tokens 结构不变：
//   { t: 'text', v }                       普通文字
//   { t: 'hl', v, kind, del?, badge? }     高亮内容（kind 决定颜色；del 用于在日记里撤销这条记录）
import { store, getDiary, getDiaries, getDayState, illnessDays, her } from '../store.js'

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

// 显示时间 HH:MM；没有时间戳的旧记录返回空串（界面只显示句子不显示时间）
const clockOf = ts => (ts && ts.length >= 16 ? ts.slice(11, 16) : '')
// 排序键：有真实时间戳（createdAt/time，且属于当天）用它；否则回退到当天正午（旧数据聚在一起、保持录入顺序）
function sortKeyOf(ts, date) {
  if (ts && ts.slice(0, 10) === date && ts.length >= 16) return ts
  return date + 'T12:00'
}

// 会说的词按录入先后编号（words 新的在前，同日按数组顺序）
function spokenIndexMapOf(words) {
  const spoken = words.filter(w => SPOKEN_KINDS.includes(w.kind)).slice().reverse()
  spoken.sort((a, b) => a.date.localeCompare(b.date)) // 稳定排序：同日保持录入顺序
  return new Map(spoken.map((w, i) => [w.id, i + 1]))
}

export function childName() {
  return store.settings.childName || '宝宝'
}

// ---------- 纯构造：传入全部集合，返回当天时间线（可单测） ----------
// ctx: { diaries, meals, trips, words, books, games, milestones, healths, illnesses, medicines }
export function buildDayItems(date, ctx) {
  const items = []
  let seq = 0
  const push = (kind, key, ts, tokens, extra = {}) =>
    items.push({ kind, key, seq: seq++, sortKey: sortKeyOf(ts, date), time: clockOf(ts), tokens, ...extra })

  // 文本记录（「写一页」/ 旧日记正文）：不产 tokens，DiaryView 渲染成文本卡
  const dayNotes = ctx.diaries
    .filter(d => d.date === date)
    .sort((a, b) => (a.createdAt || a.updatedAt || '').localeCompare(b.createdAt || b.updatedAt || ''))
  for (const d of dayNotes) {
    if (!(d.text || '').trim()) continue
    push('note', 'note-' + d.id, d.createdAt || d.updatedAt, [], { entry: d })
  }

  // 吃了：每条记录一记
  for (const m of ctx.meals.filter(m => m.date === date).slice().reverse()) {
    const head = m.meal ? `${MEAL_WORD[m.meal] || m.meal}吃了` : '还吃了'
    push('food', 'meal-' + m.id, m.createdAt, [
      txt(head), hl(m.food, 'food', { del: { coll: 'meals', id: m.id }, badge: m.firstTaste ? '首尝' : (m.tag || '') }), txt('。'),
    ])
  }

  // 去了：一次一条
  const seenToday = new Set()
  for (const t of ctx.trips.filter(t => t.date === date).slice().reverse()) {
    const firstEver = !seenToday.has(t.place) && !ctx.trips.some(x => x.place === t.place && x.date < date)
    seenToday.add(t.place)
    const tokens = [txt(t.withWho ? `和${t.withWho}去了` : '去了')]
    tokens.push(hl(t.place, 'trip', { del: { coll: 'trips', id: t.id }, badge: firstEver ? '新足迹' : '' }))
    if (t.title && t.title !== t.place) tokens.push(txt(`，${t.title}`))
    if (t.note) tokens.push(txt(`，${t.note}`))
    tokens.push(txt('。'))
    push('trip', 'trip-' + t.id, t.createdAt, tokens)
  }

  // 读了：每读一次一条
  for (const b of ctx.books) {
    const today = (b.reads || []).filter(r => (r.time || '').slice(0, 10) === date)
    if (!today.length) continue
    const before = (b.reads || []).filter(r => (r.time || '') < today[0].time).length
    today.slice().reverse().forEach((r, ri) => {
      const total = before + today.length - ri // 早于本次（含）的累计次数
      const tokens = [txt('读了'), hl(`《${b.title}》`, 'book', {
        del: { coll: 'reads', bookId: b.id, time: r.time, id: r.id },
        suffix: `第 ${total} 次`,
        badge: total >= 10 && total % 10 === 0 ? '最爱书' : '',
      })]
      if (r.note) tokens.push(txt(`，${r.note}`))
      tokens.push(txt('。'))
      push('read', 'read-' + r.id, r.time, tokens)
    })
  }

  // 她说 / 认字 / 歌谣：每词一条
  const idx = spokenIndexMapOf(ctx.words)
  const words = ctx.words.filter(w => w.date === date).slice().reverse()
  for (const w of words) {
    const wordHl = hl(`“${w.word}”`, 'say', { del: { coll: 'words', id: w.id }, audio: w.audioUrl || '', word: { id: w.id, kind: w.kind } })
    if (SPOKEN_KINDS.includes(w.kind)) {
      const tokens = [txt(her('她说了新词')), wordHl]
      if (idx.get(w.id)) tokens.push(txt(her(`，这是她会说的第 ${idx.get(w.id)} 个词`)))
      tokens.push(txt('。'))
      push('say', 'say-' + w.id, w.createdAt, tokens)
    } else if (w.kind === '句子' && w.funny) {
      push('quote', 'quote-' + w.id, w.createdAt, [txt(her('她说了句让人笑出声的话：')), hl(`“${w.word}”`, 'quote', { del: { coll: 'words', id: w.id }, audio: w.audioUrl || '', word: { id: w.id, kind: w.kind }, badge: '金句' })])
    } else if (w.kind === '句子') {
      push('say', 'sentence-' + w.id, w.createdAt, [txt(her('她说了')), wordHl, txt('。')])
    } else if (w.kind === '歌谣') {
      push('say', 'song-' + w.id, w.createdAt, [txt('会唱'), wordHl, txt('了。')])
    } else if (w.kind === '识字') {
      push('say', 'chars-' + w.id, w.createdAt, [txt('认识了'), wordHl, txt('。')])
    }
  }

  // 玩了：一次一条
  const plays = []
  for (const g of ctx.games) for (const p of g.plays || []) if (p.date === date) plays.push({ g, p })
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
    push('play', 'play-' + p.id, p.createdAt, tokens)
  }

  // 里程碑（首尝、游戏的「第一次」已在对应句子里，这里只放其他来源）
  for (const m of ctx.milestones.filter(m => m.date === date && m.source !== '餐桌' && m.source !== '游戏')) {
    push('milestone', 'ms-' + m.id, m.createdAt, [txt('今天的里程碑：'), hl(m.title, 'milestone'), txt('。')])
  }

  // 生病：整天一条（病程跨多天，不是单次记录）
  const ill = ctx.illnesses.find(i => i.start <= date && (!i.end || i.end >= date))
  const illHealthIds = new Set(ctx.illnesses.flatMap(i => (i.visits || []).map(v => v.healthId)))
  if (ill) {
    const tokens = [txt(date === ill.start ? '开始不舒服：' : `生病第 ${illnessDays(ill, date)} 天：`)]
    tokens.push(hl((ill.symptoms || []).join('、') || '不舒服', 'sick', { jump: 'illness' }))
    const temps = (ill.temps || []).filter(t => t.time.slice(0, 10) === date)
    if (temps.length) {
      const max = Math.max(...temps.map(t => t.value))
      tokens.push(txt(temps.length > 1 ? `，量了 ${temps.length} 次体温，最高 ` : '，体温 '), hl(`${max.toFixed(1)}℃`, 'sick'))
    }
    const meds = {}
    for (const m of ctx.medicines) for (const l of m.logs || []) if (l.mode === 'use' && l.illnessId === ill.id && (l.time || '').slice(0, 10) === date) meds[m.name] = (meds[m.name] || 0) + 1
    const medNames = Object.entries(meds).map(([n, c]) => hl(c > 1 ? `${n} ${c} 次` : n, 'health'))
    if (medNames.length) tokens.push(txt('，吃了'), ...joinTokens(medNames))
    if ((ill.visits || []).some(v => v.date === date)) tokens.push(txt('，去医院看了'))
    const note = (ill.notes || []).find(n => n.date === date)
    if (note) tokens.push(txt(`，${note.text}`))
    tokens.push(txt('。'))
    if (ill.end === date) {
      tokens.push(hl(`病好了，这次一共 ${illnessDays(ill)} 天`, 'sick', { badge: '痊愈' }), txt('。'))
      if (ill.moment) push('quote', 'moment-' + ill.id, '', [hl('最让人心疼的瞬间', 'quote'), txt('：'), hl(ill.moment, 'quote'), txt('。')])
    }
    push('sick', 'ill-' + ill.id, ill.start === date ? (ill.temps || [])[0]?.time : '', tokens)
  }

  // 健康（生病就医已在上面那句里）
  for (const h of ctx.healths.filter(h => h.date === date && !illHealthIds.has(h.id))) {
    const tokens = []
    if (h.kind === '疫苗') tokens.push(txt('打了疫苗：'), hl(h.title, 'health'))
    else if (h.kind === '就医') tokens.push(txt('去看了医生：'), hl(h.title, 'health'))
    else {
      tokens.push(txt('做了'), hl(h.title || h.kind, 'health'))
      const hw = [h.height ? `身高 ${h.height} cm` : '', h.weight ? `体重 ${h.weight} kg` : ''].filter(Boolean)
      if (hw.length) tokens.push(txt(`，${hw.join('、')}`))
    }
    tokens.push(txt('。'))
    push('health', 'h-' + h.id, h.createdAt, tokens)
  }

  // 用药（不属于某次生病的）
  const meds = []
  for (const m of ctx.medicines) {
    const n = (m.logs || []).filter(l => l.mode === 'use' && !l.illnessId && (l.time || '').slice(0, 10) === date).length
    if (n) meds.push(hl(n > 1 ? `${m.name} ${n} 次` : m.name, 'health'))
  }
  if (meds.length) push('meds', 'meds', '', [txt('用了药：'), ...joinTokens(meds), txt('。')])

  items.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.seq - b.seq)
  return items
}

// ---------- 读 store 的包装（应用用） ----------
export function dayItems(date) {
  return buildDayItems(date, {
    diaries: store.diaries, meals: store.meals, trips: store.trips, words: store.words,
    books: store.books, games: store.games, milestones: store.milestones,
    healths: store.healths, illnesses: store.illnesses, medicines: store.medicines,
  })
}

// 兼容旧调用（周报/成长书/日历摘要）：句子行 = 时间线里除文本记录外的 tokens
export function dayLines(date) {
  const items = dayItems(date)
  const lines = items.filter(i => i.kind !== 'note' && i.tokens.length).map(i => ({ key: i.key, tokens: i.tokens }))
  const photos = store.photos.filter(p => p.date === date)
  return { lines, photos, diary: getDiary(date) }
}

// 纯文字版（「一个月前的今天」摘要、复制分享用）
export function linesToText(lines) {
  return lines.map(l => l.tokens.map(t => t.v).join('')).join('')
}

// 当天全部文本（周报/成长书：一天多篇时合并）
export function dayTexts(date) {
  return getDiaries(date).map(d => (d.text || '').trim()).filter(Boolean)
}

// 某月每天的概况：{ 'YYYY-MM-DD': { count, mood, photo, hasText, kinds } }，日历和右栏统计用
export function monthIndex(ym) {
  const map = {}
  const hit = (date, n = 1, kind = '') => {
    if (!date || date.slice(0, 7) !== ym) return null
    map[date] = map[date] || { count: 0, mood: '', photo: null, hasText: false, kinds: {} }
    map[date].count += n
    if (kind) map[date].kinds[kind] = (map[date].kinds[kind] || 0) + n
    return map[date]
  }
  for (const m of store.meals) hit(m.date, 1, 'food')
  for (const t of store.trips) hit(t.date, 1, 'trip')
  for (const w of store.words) hit(w.date, 1, 'word')
  for (const h of store.healths) hit(h.date, 1, 'health')
  for (const i of store.illnesses) {
    for (const t of i.temps) hit(t.time.slice(0, 10), 1, 'sick')
    for (const n of i.notes) hit(n.date, 1, 'sick')
    hit(i.start, 1, 'sick')
    if (i.end) hit(i.end, 1, 'sick')
  }
  for (const m of store.milestones) if (m.source !== '餐桌' && m.source !== '游戏') hit(m.date, 1, 'milestone')
  for (const g of store.games) for (const p of g.plays) hit(p.date, 1, 'play')
  for (const b of store.books) for (const r of b.reads || []) hit((r.time || '').slice(0, 10), 1, 'read')
  for (const p of store.photos) {
    const d = hit(p.date, 1, 'photo')
    if (d && !d.photo && p.imageUrl) d.photo = p.imageUrl
  }
  // 心情状态卡（v0.39）：让"只记了心情"的日子也出现在日历上
  for (const st of store.dayStates) if (st.mood) hit(st.date, 0)
  // 文本日记：一天多篇各计一条；遗留 mood 不再参与（getDayState 统一取）
  for (const d of store.diaries) {
    if (!d.text && !d.mood) continue
    const e = hit(d.date, 0)
    if (!e) continue
    if (d.text) { e.hasText = true; e.count++ }
  }
  for (const date of Object.keys(map)) map[date].mood = getDayState(date)
  return map
}
