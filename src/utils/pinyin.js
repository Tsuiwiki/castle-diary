// 拼音生成：pinyin-pro 纯前端离线库
// 多音字取最常见读音（如「长大」→ zhǎng dà），生成后可在词库表格里手改
import { pinyin } from 'pinyin-pro'

/**
 * 生成带声调拼音。非汉字部分（字母/数字/标点）原样保留。
 * @param {string} text
 * @returns {string} 如 "小熊" → "xiǎo xióng"
 */
export function genPinyin(text) {
  const t = (text || '').trim()
  if (!t) return ''
  try {
    return pinyin(t, { toneType: 'mark', type: 'string', nonZh: 'consecutive' })
  } catch {
    return ''
  }
}
