// ========== 四季通透背景的唯一真源（v0.26.0） ==========
// 色板只定义在这里；CSS 由运行时注入 CSS 变量，canvas 如需取色也从这里读。
// 设计约束（见需求文档）：
//   - 明度锁定 L≈94–96，只换色相与彩度；正文对比度 ≥ 6.7:1
//   - 四季 bg-2 两两 ΔE 均值 4.3 / 最大 6.2（夏↔冬是蓝色族天花板 1.7，用"光的方向"区分）
//   - 改色板必须重跑 scripts/check-season.mjs 校验
//   - 纸面（日记纸、海报）不用这套色，保持奶油白
import { seasonOf } from './solarTerms.js'

export const SEASON_THEME = {
  spring: { // 晓雾新绿
    name: '春', bg1: '#FAFDF7', bg2: '#E1F6E8', bg3: '#F0F8EA',
    glow: 'rgba(150,214,170,.45)', glowPos: '10% 20%',
    hill1: 'rgba(168,196,178,.15)', hill2: 'rgba(143,179,156,.22)',
  },
  summer: { // 晴空微风：有方向的强光，天窗感
    name: '夏', bg1: '#F7FCFF', bg2: '#DBF1FC', bg3: '#EDF7FB',
    glow: 'rgba(140,200,240,.45)', glowPos: '90% 10%',
    hill1: 'rgba(154,186,207,.15)', hill2: 'rgba(125,165,192,.22)',
  },
  autumn: { // 枫林金辉
    name: '秋', bg1: '#FFFBF5', bg2: '#FEEDD6', bg3: '#FBF2E6',
    glow: 'rgba(232,168,96,.45)', glowPos: '50% 10%',
    hill1: 'rgba(212,180,150,.18)', hill2: 'rgba(191,153,120,.25)',
  },
  winter: { // 雪霁冰蓝：高位平光，光晕最弱（≤ 夏季一半）
    name: '冬', bg1: '#F9FAFE', bg2: '#E5ECFB', bg3: '#F1F4FC',
    glow: 'rgba(150,170,220,.22)', glowPos: '50% 0%',
    hill1: 'rgba(176,196,213,.18)', hill2: 'rgba(150,175,197,.25)',
  },
}

export const SEASON_BG_PREFS = [
  { value: 'auto', label: '跟随节气（推荐）' },
  { value: 'spring', label: '固定为春' },
  { value: 'summer', label: '固定为夏' },
  { value: 'autumn', label: '固定为秋' },
  { value: 'winter', label: '固定为冬' },
  { value: 'off', label: '关闭（经典奶油底）' },
]

const CN2KEY = { 春: 'spring', 夏: 'summer', 秋: 'autumn', 冬: 'winter' }

export function seasonKeyOf(dateStr) {
  return CN2KEY[seasonOf(dateStr)] || 'autumn'
}

// pref: 'auto' | 四季 key | 'off'。'off' 时清掉变量，回退到经典奶油渐变
export function applySeasonTheme(pref, today) {
  const root = document.documentElement
  if (pref === 'off') {
    for (const k of ['--sb1', '--sb2', '--sb3', '--sglow', '--sglow-pos', '--hill1', '--hill2']) root.style.removeProperty(k)
    document.body.dataset.seasonBg = 'off'
    return
  }
  const key = pref === 'auto' || !SEASON_THEME[pref] ? seasonKeyOf(today) : pref
  const t = SEASON_THEME[key]
  root.style.setProperty('--sb1', t.bg1)
  root.style.setProperty('--sb2', t.bg2)
  root.style.setProperty('--sb3', t.bg3)
  root.style.setProperty('--sglow', t.glow)
  root.style.setProperty('--sglow-pos', t.glowPos)
  root.style.setProperty('--hill1', t.hill1)
  root.style.setProperty('--hill2', t.hill2)
  document.body.dataset.seasonBg = key
}
