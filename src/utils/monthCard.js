// ========== 月龄卡：每月生日那天，把上个月画成一张可以保存的图 ==========
import { store, todayStr, babyAgeText } from '../store.js'

const CW = 620
const CH = 820
const M = 40 // 留白

const p2 = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

// 找到该出卡的月龄生日（不晚于今天的最近一个生日日），返回对应的上一个完整月龄区间
// 例：生日 2025-02-04 → 1 岁 8 个月：2026-09-04 ~ 2026-10-03
export function latestCardPeriod() {
  const bd = store.settings.birthday
  if (!bd) return null
  const b = new Date(bd + 'T00:00:00')
  const today = new Date(todayStr() + 'T00:00:00')
  if (today < b) return null
  const day = b.getDate()
  const months = Math.max(1, (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth()) + (today.getDate() >= day ? 1 : 0))
  const start = new Date(b.getFullYear(), b.getMonth() + months - 1, 1)
  start.setDate(Math.min(day, new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()))
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1)
  const endSafe = end > today ? today : end
  return { start: fmt(start), end: fmt(endSafe), months }
}

const inRange = (d, a, b) => d && d >= a && d <= b

export function cardData(period) {
  const { start, end, months } = period
  const lines = []
  const words = store.words.filter(w => inRange(w.date, start, end) && ['词语', '发音'].includes(w.kind))
  if (words.length) lines.push(`会说的新词：${words.map(w => w.word).slice(0, 8).join('、')}${words.length > 8 ? ' 等' : ''}`)
  const sentences = store.words.filter(w => inRange(w.date, start, end) && w.kind === '句子')
  for (const w of sentences.slice(0, 2)) lines.push(`说了一句话：“${w.word}”`)
  const bookRead = {}
  for (const b of store.books) {
    const n = (b.reads || []).filter(r => inRange((r.time || '').slice(0, 10), start, end)).length
    if (n) bookRead[b.title] = n
  }
  const topBook = Object.entries(bookRead).sort((a, b) => b[1] - a[1])[0]
  if (topBook) lines.push(`最爱的书：《${topBook[0]}》，读了 ${topBook[1]} 次`)
  const games = store.games.filter(g => g.plays.some(p => inRange(p.date, start, end)))
  if (games.length) lines.push(`一起玩过 ${games.length} 种游戏：${games.map(g => g.name).slice(0, 5).join('、')}${games.length > 5 ? ' 等' : ''}`)
  const firsts = store.games.flatMap(g => g.plays.filter(p => p.first && inRange(p.date, start, end)).map(p => `${g.name}：${p.note || '第一次完成'}`))
  for (const f of firsts.slice(0, 2)) lines.push(`🏅 ${f}`)
  const foods = store.meals.filter(m => m.firstTaste && inRange(m.date, start, end)).map(m => m.food)
  if (foods.length) lines.push(`第一次吃了：${foods.slice(0, 6).join('、')}${foods.length > 6 ? ' 等' : ''}`)
  const places = [...new Set(store.trips.filter(t => inRange(t.date, start, end)).map(t => t.place))]
  if (places.length) lines.push(`去了：${places.slice(0, 5).join('、')}${places.length > 5 ? ' 等' : ''}`)
  const healths = store.healths.filter(h => inRange(h.date, start, end))
  const hw = healths.filter(h => h.height || h.weight).sort((a, b) => a.date.localeCompare(b.date)).pop()
  if (hw) lines.push(`量了身体：${[hw.height ? `身高 ${hw.height} cm` : '', hw.weight ? `体重 ${hw.weight} kg` : ''].filter(Boolean).join('、')}`)
  const vac = healths.filter(h => h.kind === '疫苗')
  if (vac.length) lines.push(`打了疫苗：${vac.map(h => h.title).join('、')}`)
  const ills = store.illnesses.filter(i => i.start <= end && (!i.end || i.end >= start))
  for (const i of ills) lines.push(`生了一次病：${i.symptoms.join('、') || '不舒服'}，${i.end ? '好了' : '在好起来'}，抱抱她`)
  const milestones = store.milestones.filter(m => inRange(m.date, start, end) && m.source !== '餐桌')
  for (const m of milestones.slice(0, 2)) lines.push(`🏁 ${m.title}`)
  const photoCount = store.photos.filter(p => inRange(p.date, start, end)).length
  const diaryCount = store.diaries.filter(d => inRange(d.date, start, end) && (d.text || d.mood)).length
  if (!lines.length && !photoCount) lines.push('这个月还没有记录，用日记记下一点点就很好')
  else lines.push(`这个月写了 ${diaryCount} 篇日记，贴了 ${photoCount} 张照片`)

  // 挑一张代表照片：有里程牌照片的优先，其次这个月的最早一张
  const photo = store.photos
    .filter(p => inRange(p.date, start, end) && p.imageUrl)
    .sort((a, b) => (b.milestoneId ? 1 : 0) - (a.milestoneId ? 1 : 0) || a.date.localeCompare(b.date))[0] || null
  return {
    title: `${store.settings.childName || '宝宝'}的 ${months} 个月`,
    range: `${start} ~ ${end}`,
    ageText: babyAgeText(end),
    lines, photo,
  }
}

// ---------- 周报海报（v0.18：一键生成给家人的长图） ----------
// 小彩虹餐盘：5 格扇形
function drawPlate(c, x, y, r, hit) {
  const colors = { 主食: '#e8b04b', 蔬菜: '#6baa3c', 水果: '#e5675a', 肉蛋鱼: '#c9825b', 奶豆: '#6f9fd4' }
  const keys = ['主食', '蔬菜', '水果', '肉蛋鱼', '奶豆']
  c.save()
  c.beginPath(); c.arc(x + r, y + r, r + 3, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill()
  keys.forEach((k, i) => {
    const a0 = (i * 72 - 90) * Math.PI / 180
    const a1 = ((i + 1) * 72 - 90) * Math.PI / 180
    c.beginPath()
    c.moveTo(x + r, y + r)
    c.arc(x + r, y + r, r, a0, a1)
    c.closePath()
    c.fillStyle = hit.has(k) ? colors[k] : '#f3ece1'
    c.fill()
  })
  c.beginPath(); c.arc(x + r, y + r, r * 0.28, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill()
  c.restore()
}

export async function renderWeeklyPoster(p) {
  // 只消费 weeklyShare 的 payload（只读 DTO），不再独立读 store
  const PW = 680
  const c0 = document.createElement('canvas')
  c0.getContext('2d')
  const kai = '"KaiTi", "STKaiti", "Kaiti SC", serif'
  const pad = 44

  const statLines = []
  if (p.booksGames?.readCount) statLines.push(`📚 阅读 ${p.booksGames.readCount} 次 ${p.booksGames.readMinutes} 分钟${p.booksGames.topBook ? `，最爱《${p.booksGames.topBook.title}》` : ''}`)
  if (p.base.newWords.length) statLines.push(`🗣 新词 ${p.base.newWords.length} 个（${p.base.newWords.slice(0, 8).join('、')}${p.base.newWords.length > 8 ? '…' : ''}）`)
  if (p.base.mealCount) statLines.push(`🍚 记了 ${p.base.mealCount} 餐${p.base.firstTastes.length ? `，第一次吃 ${p.base.firstTastes.join('、')}` : ''}`)
  if (p.booksGames?.playCount) statLines.push(`🧩 一起玩 ${p.booksGames.playCount} 次游戏（${p.booksGames.games.slice(0, 4).map(g => g.name).join('、')}）`)
  if (p.health) {
    for (const i of p.health.illnesses) statLines.push(`🤒 生病：${i.symptoms.join('、') || '不舒服'}，${i.ended ? `${i.days} 天好了` : `第 ${i.days} 天`}${i.maxTemp ? `，最高 ${i.maxTemp.toFixed(1)}℃` : ''}`)
    if (p.health.healths.length) statLines.push(`❤️ ${p.health.healths.map(h => h.title).join('；')}`)
    if (p.health.medUses) statLines.push(`💊 用药 ${p.health.medUses} 次`)
  }
  if (p.photos?.total) statLines.push(`📷 本周共 ${p.photos.total} 张照片${p.photos.total > 4 ? '，这里展示 4 张' : ''}`)
  if (p.base.diaryDays) statLines.push(`✍️ 写了 ${p.base.diaryDays} 篇日记`)

  let estH = 250 // 头 + 餐盘
  estH += statLines.length * 34 + 30
  if (p.quotes?.length) estH += p.quotes.slice(0, 3).length * 66 + 60
  if (p.photos?.list.length) estH += 180
  estH += 90 // 尾

  const canvas = document.createElement('canvas')
  canvas.width = PW
  canvas.height = Math.max(680, estH)
  const c = canvas.getContext('2d')
  // 纸面
  c.fillStyle = '#fff8ec'
  c.fillRect(0, 0, PW, canvas.height)
  c.strokeStyle = '#e3b870'; c.lineWidth = 2
  c.strokeRect(12, 12, PW - 24, canvas.height - 24)

  c.textBaseline = 'top'
  c.fillStyle = '#b4743a'; c.font = `600 16px ${kai}`
  c.fillText('成长周报 · WEEKLY', pad, 34)
  c.fillStyle = '#4a3520'; c.font = `700 30px ${kai}`
  c.fillText(`${p.name}的这一周`, pad, 60)
  c.fillStyle = '#a5774a'; c.font = `400 14px ${kai}`
  c.fillText(`${p.range.start} ~ ${p.range.end}`, pad, 100)

  // 7 只小餐盘
  const pr = 17
  p.plates.forEach((d, i) => {
    const x = pad + i * ((PW - pad * 2 - pr * 2) / 6)
    drawPlate(c, x, 130, pr, d.groups)
    c.fillStyle = '#a89880'; c.font = '400 11px sans-serif'
    c.textAlign = 'center'
    c.fillText(d.week.replace('周', ''), x + pr, 130 + pr * 2 + 6)
    c.textAlign = 'left'
  })

  let y = 130 + pr * 2 + 34
  // 统计
  c.font = `400 17px ${kai}`
  for (const line of statLines) {
    c.fillStyle = '#f0934b'
    c.beginPath(); c.arc(pad + 5, y + 10, 3, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#4a3520'
    c.fillText(line, pad + 16, y)
    y += 34
  }
  // 童言稚语
  if (p.quotes?.length) {
    y += 16
    c.fillStyle = '#c8860d'; c.font = `700 18px ${kai}`
    c.fillText('✨ 童言稚语', pad, y)
    y += 34
    for (const w of p.quotes.slice(0, 3)) {
      c.font = `italic 400 19px ${kai}`
      const lines = wrapText(c, `“${w.word}”`, PW - pad * 2 - 30)
      for (const seg of lines) {
        c.fillStyle = '#6b4a00'
        c.fillText(seg, pad + 14, y)
        y += 28
      }
      c.fillStyle = '#b79b79'; c.font = `400 12px ${kai}`
      c.fillText(`—— ${w.date}`, pad + 14, y)
      y += 32
    }
  }
  // 照片条
  if (p.photos?.list.length) {
    y += 14
    const imgs = await Promise.all(p.photos.list.map(ph => loadImage(ph.imageUrl)))
    const th = 130, gap = 12
    let x = pad
    for (const img of imgs) {
      if (!img) continue
      const s = Math.max(th / img.width, th / img.height)
      c.save()
      c.beginPath(); c.roundRect(x, y, th, th, 8); c.clip()
      c.drawImage(img, x - (img.width * s - th) / 2, y - (img.height * s - th) / 2, img.width * s, img.height * s)
      c.restore()
      x += th + gap
    }
    y += th + 20
  }
  // 尾
  c.fillStyle = '#b79b79'; c.font = `400 13px ${kai}`
  c.fillText('城堡日记 · 记录只存在家里这台设备', pad, canvas.height - 44)
  c.textAlign = 'right'
  c.fillText(todayStr(), PW - pad, canvas.height - 44)
  return canvas.toDataURL('image/png')
}

function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function wrapText(ctx, text, width) {
  const lines = []
  let cur = ''
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > width) { lines.push(cur); cur = ch }
    else cur += ch
  }
  if (cur) lines.push(cur)
  return lines
}

// 画出月龄卡；返回 Promise<dataUrl>
export async function renderMonthCard(period) {
  const d = cardData(period)
  const canvas = document.createElement('canvas')
  canvas.width = CW
  canvas.height = CH
  const c = canvas.getContext('2d')

  // 纸面
  c.fillStyle = '#fff8ec'
  c.fillRect(0, 0, CW, CH)
  c.strokeStyle = '#e3b870'
  c.lineWidth = 2
  c.strokeRect(14, 14, CW - 28, CH - 28)
  c.strokeStyle = '#efd9ae'
  c.lineWidth = 1
  c.strokeRect(20, 20, CW - 40, CH - 40)
  // 四角装饰
  c.fillStyle = '#e3b870'
  for (const [x, y] of [[14, 14], [CW - 14, 14], [14, CH - 14], [CW - 14, CH - 14]]) {
    c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill()
  }
  // 小城堡：塔 + 旗
  c.fillStyle = '#f0b06e'
  c.fillRect(CW - 120, 34, 22, 46)
  c.fillStyle = '#d97f5a'
  c.beginPath(); c.moveTo(CW - 124, 34); c.lineTo(CW - 109, 18); c.lineTo(CW - 94, 34); c.closePath(); c.fill()
  c.strokeStyle = '#c98d5f'
  c.beginPath(); c.moveTo(CW - 109, 18); c.lineTo(CW - 109, 8); c.stroke()
  c.fillStyle = '#d4537e'
  c.beginPath(); c.moveTo(CW - 109, 8); c.lineTo(CW - 95, 12); c.lineTo(CW - 109, 16); c.closePath(); c.fill()

  c.textBaseline = 'top'
  const kai = '"KaiTi", "STKaiti", "Kaiti SC", serif'
  // 标题
  c.fillStyle = '#b4743a'
  c.font = `600 17px ${kai}`
  c.fillText('月龄卡 · MONTHLY', M, 40)
  c.fillStyle = '#4a3520'
  c.font = `700 34px ${kai}`
  c.fillText(d.title, M, 66)
  c.fillStyle = '#a5774a'
  c.font = `400 15px ${kai}`
  c.fillText(`${d.ageText}　·　${d.range}`, M, 110)

  let y = 150
  // 照片（拍立得）
  if (d.photo) {
    const img = await loadImage(d.photo.imageUrl)
    if (img) {
      const boxW = CW - M * 2 - 60, boxH = 220
      const x = CW / 2 - boxW / 2
      // 白框
      c.save()
      c.translate(CW / 2, y + boxH / 2)
      c.rotate(-0.02)
      c.translate(-CW / 2, -(y + boxH / 2))
      c.fillStyle = '#ffffff'
      c.shadowColor = 'rgba(150, 100, 40, .25)'
      c.shadowBlur = 12
      c.shadowOffsetY = 4
      c.fillRect(x - 8, y - 8, boxW + 16, boxH + 32)
      c.shadowColor = 'transparent'
      const s = Math.max(boxW / img.width, boxH / img.height)
      const iw = img.width * s, ih = img.height * s
      c.save()
      c.beginPath(); c.rect(x, y, boxW, boxH); c.clip()
      c.drawImage(img, x - (iw - boxW) / 2, y - (ih - boxH) / 2, iw, ih)
      c.restore()
      if (d.photo.note) {
        c.fillStyle = '#7a664e'
        c.font = `400 13px ${kai}`
        c.textAlign = 'center'
        c.fillText(d.photo.note.slice(0, 24), CW / 2, y + boxH + 12)
        c.textAlign = 'left'
      }
      c.restore()
      y += boxH + 42
    }
  }
  // 正文
  c.font = `400 18px ${kai}`
  for (const line of d.lines.slice(0, 9)) {
    for (const seg of wrapText(c, line, CW - M * 2 - 10)) {
      if (y > CH - 92) break
      // 每行前面一个小圆点
      c.fillStyle = '#f0934b'
      c.beginPath(); c.arc(M + 5, y + 11, 3, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#4a3520'
      c.fillText(seg, M + 16, y)
      y += 32
    }
    y += 4
  }
  // 落款
  c.fillStyle = '#b79b79'
  c.font = `400 13px ${kai}`
  c.fillText('城堡日记 · 数据只存在家里这台设备', M, CH - 52)
  c.textAlign = 'right'
  c.fillText(todayStr(), CW - M, CH - 52)
  return canvas.toDataURL('image/png')
}
