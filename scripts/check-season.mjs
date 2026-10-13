// 四季色板门槛校验（改色板必跑）：node scripts/check-season.mjs
// 1) 四季主色 bg-2 两两 OKLab 感知差：均值 ≥ 3.5、最大 ≥ 5（夏↔冬是已知蓝色族天花板，门槛 ≥ 1.5）
// 2) 正文色在四个主色上的 WCAG 对比度 ≥ 4.5:1
import { SEASON_THEME } from '../src/utils/seasonTheme.js'

const INK = '#4a3520'

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255)
}
function linearize(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
function rgbToOklab(hex) {
  const [r, g, b] = hexToRgb(hex).map(linearize)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const l3 = Math.cbrt(l), m3 = Math.cbrt(m), s3 = Math.cbrt(s)
  return [
    0.2104542553 * l3 + 0.7936177850 * m3 - 0.0040720468 * s3,
    1.9779984951 * l3 - 2.4285922050 * m3 + 0.4505937099 * s3,
    0.0259040371 * l3 + 0.7827717662 * m3 - 0.8086757660 * s3,
  ]
}
function deltaE(a, b) {
  const [l1, a1, b1] = rgbToOklab(a)
  const [l2, a2, b2] = rgbToOklab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(linearize)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const keys = ['spring', 'summer', 'autumn', 'winter']
let fail = false
console.log('主色两两 ΔE（OKLab ×100）：')
const des = []
for (let i = 0; i < keys.length; i++) {
  for (let j = i + 1; j < keys.length; j++) {
    const d = deltaE(SEASON_THEME[keys[i]].bg2, SEASON_THEME[keys[j]].bg2)
    des.push([keys[i], keys[j], d])
    const isSummerWinter = [keys[i], keys[j]].sort().join() === 'summer,winter'
    const threshold = isSummerWinter ? 1.5 : 2.5
    const ok = d >= threshold
    if (!ok) fail = true
    console.log(`  ${keys[i]} ↔ ${keys[j]}: ${d.toFixed(1)} ${ok ? '✓' : '✗ 低于门槛 ' + threshold}`)
  }
}
const mean = des.reduce((s, d) => s + d[2], 0) / des.length
const max = Math.max(...des.map(d => d[2]))
console.log(`  均值 ${mean.toFixed(1)}（≥3.5 ${mean >= 3.5 ? '✓' : '✗'}）、最大 ${max.toFixed(1)}（≥5 ${max >= 5 ? '✓' : '✗'}）`)
if (mean < 3.5 || max < 5) fail = true

console.log('正文对比度（--ink 在各主色上，需 ≥ 4.5:1）：')
for (const k of keys) {
  const c = contrast(INK, SEASON_THEME[k].bg2)
  console.log(`  ${k}: ${c.toFixed(2)}:1 ${c >= 4.5 ? '✓' : '✗'}`)
  if (c < 4.5) fail = true
}
if (fail) { console.error('\n色板校验未通过'); process.exit(1) }
console.log('\n色板校验通过')
