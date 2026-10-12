// ========== 周报分享的统一数据出口（v0.22） ==========
// 四项开关 → 一份只读 payload（纯展示 DTO）→ 文本与海报同源。
// 本模块只读 store，绝不写入；筛选用新建数组/对象，不改原始记录。
import { store, rangeReport, babyDayOfLife, dayFoodGroups } from '../store.js'

// 每次新的分享流程都恢复这组默认值：健康与生病信息默认不包含
export const DEFAULT_WEEKLY_SHARE_OPTIONS = Object.freeze({
  photos: true,     // 成长照片
  quotes: true,     // 童言稚语和金句
  booksGames: true, // 绘本与游戏记录
  health: false,    // 健康与生病信息（默认排除）
})

export const SHARE_OPTION_LABELS = [
  { key: 'photos', label: '成长照片', desc: '本周照片（海报最多 4 张，文本只写数量和有备注的说明）' },
  { key: 'quotes', label: '童言稚语和金句', desc: '标了金句的话；关掉后通用新词列表里也不会出现' },
  { key: 'booksGames', label: '绘本与游戏记录', desc: '阅读次数 / 分钟 / 最爱书、游戏次数与名称' },
  { key: 'health', label: '健康与生病信息', desc: '疫苗、体检、就医、生病、体温、用药。默认不包含', health: true },
]

const WEEK_CN = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const p2 = n => String(n).padStart(2, '0')

export function buildWeeklySharePayload(start, end, options) {
  const o = { ...DEFAULT_WEEKLY_SHARE_OPTIONS, ...options }
  const r = rangeReport(start, end)
  const allWords = r.newWords
  // 金句不进通用新词列表：关闭时不会泄漏，开启时也不重复出现
  const quotes = allWords.filter(w => w.funny).map(w => ({ word: w.word, date: w.date }))
  const newWords = allWords.filter(w => !w.funny).map(w => w.word)

  const plates = WEEK_CN.map((week, i) => {
    const d = new Date(start + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
    return { week, groups: dayFoodGroups(date) }
  })

  const weekPhotos = store.photos.filter(p => p.date >= start && p.date <= end && p.imageUrl)
  const diaryDays = store.diaries.filter(d => d.date >= start && d.date <= end && (d.text || d.mood)).length

  return {
    range: { start, end },
    name: store.settings.childName || '宝宝',
    day: babyDayOfLife(end),
    options: o,
    plates,
    base: { newWords, firstTastes: [...r.firstTastes], mealCount: r.mealCount, milestones: [...r.milestones], diaryDays },
    quotes: o.quotes ? quotes : null,
    photos: o.photos
      ? { total: weekPhotos.length, list: weekPhotos.slice(0, 4), noted: weekPhotos.filter(p => p.note).map(p => p.note) }
      : null,
    booksGames: o.booksGames
      ? { readCount: r.readCount, readMinutes: r.readMinutes, readDays: r.readDays, topBook: r.topBook, playCount: r.playCount, games: [...r.games] }
      : null,
    health: o.health
      ? { healths: [...r.healths], illnesses: [...r.illnesses], medUses: r.medUses }
      : null,
  }
}

// 复制文本（预览与"复制周报文本"必须用这个结果）
export function buildWeeklyShareText(p) {
  const lines = [`📜 ${p.name}的成长周报（${p.range.start} ~ ${p.range.end}${p.day ? `，出生第 ${p.day - 6}~${p.day} 天` : ''}）`, '']
  const bg = p.booksGames
  if (bg?.readCount) lines.push(`📚 阅读：${bg.readCount} 次共 ${bg.readMinutes} 分钟，${bg.readDays} 天有阅读${bg.topBook ? `，最爱《${bg.topBook.title}》` : ''}`)
  if (p.quotes?.length) lines.push(`✨ 童言稚语：${p.quotes.map(w => `“${w.word}”`).join('、')}`)
  if (p.base.newWords.length) lines.push(`🗣 新词：${p.base.newWords.length} 个（${p.base.newWords.slice(0, 10).join(' ')}${p.base.newWords.length > 10 ? '…' : ''}）`)
  if (p.base.mealCount) lines.push(`🍚 餐桌：记了 ${p.base.mealCount} 餐${p.base.firstTastes.length ? `，第一次吃 ${p.base.firstTastes.join('、')}` : ''}`)
  if (bg?.playCount) lines.push(`🧩 游戏：玩了 ${bg.playCount} 次（${bg.games.slice(0, 5).map(g => g.name + (g.count > 1 ? '×' + g.count : '')).join('、')}）`)
  for (const m of p.base.milestones) lines.push(`🏁 ${m.date.slice(5)} ${m.title}`)
  if (p.photos?.total) {
    lines.push(`📷 本周共 ${p.photos.total} 张照片${p.photos.total > 4 ? '（分享图最多展示 4 张）' : ''}`)
    const noted = p.photos.noted.slice(0, 4)
    for (const n of noted) lines.push(`   · ${n}`)
    if (p.photos.noted.length > 4) lines.push(`   还有 ${p.photos.noted.length - 4} 张有备注`)
  }
  if (p.health) {
    for (const i of p.health.illnesses) lines.push(`🤒 生病：${i.symptoms.join('、') || '不舒服'}，${i.ended ? `${i.days} 天好了` : `已经第 ${i.days} 天`}${i.maxTemp ? `，最高 ${i.maxTemp.toFixed(1)}℃` : ''}`)
    if (p.health.healths.length) lines.push(`❤️ 健康：${p.health.healths.map(h => h.kind + '·' + h.title).join('；')}`)
    if (p.health.medUses) lines.push(`💊 用药 ${p.health.medUses} 次`)
  }
  if (p.base.diaryDays) lines.push(`✍️ 写了 ${p.base.diaryDays} 篇日记`)
  if (lines.length <= 2) lines.push('这周还没有记录，下周加油～')
  lines.push('', '—— 来自城堡日记')
  return lines.join('\n')
}
