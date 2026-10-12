// ========== 二十四节气：纯本地计算，不联网 ==========
// 公式：日期 = floor((年份后两位) * 0.2422 + C) - floor((年份后两位 - 1) / 4)
// 适用于 1901–2100；个别年份有 ±1 天例外，用 EXCEPTIONS 修正。
// 提示文案是写给家长的应景灵感，会用在日记的「今日一问」里。

export const SOLAR_TERMS = [
  { name: '小寒', m: 1, c: 6.11, season: '冬', hint: '一年里很冷的日子，适合在家搭积木、躲猫猫', sticker: 'play' },
  { name: '大寒', m: 1, c: 20.84, season: '冬', hint: '最冷的时候到了，给她盛碗热乎乎的粥', sticker: 'food' },
  { name: '立春', m: 2, c: 3.87, season: '春', hint: '春天要来了，带她下楼找一找刚冒头的小芽', sticker: 'trip' },
  { name: '雨水', m: 2, c: 18.73, season: '春', hint: '如果下雨，穿上小雨靴去踩水坑', sticker: 'trip' },
  { name: '惊蛰', m: 3, c: 5.63, season: '春', hint: '小虫子醒了，去楼下找找搬家的蚂蚁', sticker: 'trip' },
  { name: '春分', m: 3, c: 20.646, season: '春', hint: '昼夜一样长，试试"春分立蛋"', sticker: 'play' },
  { name: '清明', m: 4, c: 4.81, season: '春', hint: '踏青的好时候，有风还能放风筝', sticker: 'trip' },
  { name: '谷雨', m: 4, c: 20.1, season: '春', hint: '雨生百谷，看看楼下的花开了没有', sticker: 'trip' },
  { name: '立夏', m: 5, c: 5.52, season: '夏', hint: '夏天开始了，按老讲究吃个立夏蛋', sticker: 'food' },
  { name: '小满', m: 5, c: 21.04, season: '夏', hint: '麦粒渐渐饱满，讲讲粮食是怎么来的', sticker: 'book' },
  { name: '芒种', m: 6, c: 5.678, season: '夏', hint: '收麦种稻的时节，读一首《悯农》', sticker: 'book' },
  { name: '夏至', m: 6, c: 21.37, season: '夏', hint: '一年中白天最长的一天，傍晚去看影子变得好长', sticker: 'trip' },
  { name: '小暑', m: 7, c: 7.108, season: '夏', hint: '热起来了，接一盆水在家玩水', sticker: 'play' },
  { name: '大暑', m: 7, c: 22.83, season: '夏', hint: '一年最热，一起吃块冰西瓜', sticker: 'food' },
  { name: '立秋', m: 8, c: 7.5, season: '秋', hint: '贴秋膘的日子，今天吃点好的', sticker: 'food' },
  { name: '处暑', m: 8, c: 23.13, season: '秋', hint: '暑气渐消，傍晚的风开始舒服了', sticker: 'trip' },
  { name: '白露', m: 9, c: 7.646, season: '秋', hint: '清晨草叶上有露水，带她早起去找找', sticker: 'trip' },
  { name: '秋分', m: 9, c: 23.042, season: '秋', hint: '捡几片好看的落叶，回家做拼贴画', sticker: 'play' },
  { name: '寒露', m: 10, c: 8.318, season: '秋', hint: '天凉了，踩落叶听"咔嚓咔嚓"', sticker: 'trip' },
  { name: '霜降', m: 10, c: 23.438, season: '秋', hint: '吃柿子的时节，尝尝甜不甜', sticker: 'food' },
  { name: '立冬', m: 11, c: 7.438, season: '冬', hint: '立冬吃饺子，让她也捏一个歪歪扭扭的', sticker: 'food' },
  { name: '小雪', m: 11, c: 22.36, season: '冬', hint: '如果下雪，带她伸手接一片雪花', sticker: 'trip' },
  { name: '大雪', m: 12, c: 7.18, season: '冬', hint: '讲讲雪是怎么从天上来的', sticker: 'book' },
  { name: '冬至', m: 12, c: 21.94, season: '冬', hint: '一年中夜晚最长的一天，吃饺子还是汤圆？', sticker: 'food' },
]

// 已知的例外年份修正（2024–2031 范围内只需要 雨水 2026，其余列出以防万年）
const EXCEPTIONS = {
  '小寒-2019': -1, '大寒-2082': 1, '雨水-2026': -1, '清明-2026': -1, '春分-2084': 1,
  '小暑-2016': 1, '立秋-2002': 1, '寒露-2088': 1, '霜降-2089': 1,
  '立冬-2089': 1, '冬至-2021': -1, '冬至-1918': -1,
}

function termDay(year, term) {
  const Y = year % 100
  let d = Math.floor(Y * 0.2422 + term.c) - Math.floor((Y - 1) / 4)
  d += EXCEPTIONS[`${term.name}-${year}`] || 0
  return d
}

// date 为 'YYYY-MM-DD'；当天恰逢节气返回节气对象，否则 null
export function termOf(date) {
  if (!date) return null
  const y = +date.slice(0, 4)
  const m = +date.slice(5, 7)
  const d = +date.slice(8, 10)
  return SOLAR_TERMS.find(t => t.m === m && termDay(y, t) === d) || null
}

// 某天属于哪个季节（按节气划分：立春起春、立夏起夏、立秋起秋、立冬起冬）
export function seasonOf(date) {
  const y = +date.slice(0, 4)
  const days = []
  for (const t of SOLAR_TERMS) days.push({ t, date: `${y}-${String(t.m).padStart(2, '0')}-${String(termDay(y, t)).padStart(2, '0')}` })
  // 上一年的冬至/大雪也要算进来（1 月初属于冬）
  for (const name of ['小雪', '大雪', '冬至', '立冬']) {
    const t = SOLAR_TERMS.find(x => x.name === name)
    days.push({ t, date: `${y - 1}-${String(t.m).padStart(2, '0')}-${String(termDay(y - 1, t)).padStart(2, '0')}` })
  }
  days.sort((a, b) => a.date.localeCompare(b.date))
  let season = '冬'
  for (const { t, date: d } of days) {
    if (d <= date) season = t.season
    else break
  }
  return season
}

// 当前节气时段（如"寒露~霜降之间"算深秋）：返回最近的节气对象
export function currentTerm(date) {
  const y = +date.slice(0, 4)
  const days = SOLAR_TERMS.map(t => ({ t, date: `${y}-${String(t.m).padStart(2, '0')}-${String(termDay(y, t)).padStart(2, '0')}` }))
  days.push({ t: SOLAR_TERMS.find(x => x.name === '冬至'), date: `${y - 1}-12-${String(termDay(y - 1, SOLAR_TERMS.find(x => x.name === '冬至'))).padStart(2, '0')}` })
  days.sort((a, b) => a.date.localeCompare(b.date))
  let cur = days[0].t
  for (const { t, date: d } of days) {
    if (d <= date) cur = t
    else break
  }
  return cur
}
