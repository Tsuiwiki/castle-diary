// OCR 入口：纯静态站直连 OCR.space（支持 CORS，无需后端）
// 默认用免费 demo key（helloworld，有限流）；自用可在 ocr.space 免费申请 key（25k 次/月），
// 在「设置」页填写后存到 localStorage，此处优先读取。
//
// 识别结果带版面信息（isOverlayRequired）：每行返回文字 + 字号高度，
// 供上层按"书名通常是封面上字号最大的中文行"打分挑选，避免把营销标语当书名。

const LS_OCR_KEY = 'castle-books-ocr-key'
const DEFAULT_KEY = 'helloworld'

export function getOcrKey() {
  return (localStorage.getItem(LS_OCR_KEY) || '').trim() || DEFAULT_KEY
}

export function setOcrKey(key) {
  const k = (key || '').trim()
  if (k) localStorage.setItem(LS_OCR_KEY, k)
  else localStorage.removeItem(LS_OCR_KEY)
}

export function hasCustomOcrKey() {
  return !!(localStorage.getItem(LS_OCR_KEY) || '').trim()
}

/**
 * 识别封面文字。
 * @returns {Promise<Array<{text:string, size:number, top:number, left:number}>>}
 *   size 为该行最大字高（px，相对原图），无版面信息时为 0。
 */
export async function ocrRecognize(dataUrl) {
  const params = new URLSearchParams()
  params.append('base64Image', dataUrl)
  params.append('language', 'chs')
  params.append('isOverlayRequired', 'true')
  params.append('OCREngine', '2')
  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', apikey: getOcrKey() },
    body: params.toString(),
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error('OCR 服务不可用')
  const json = await res.json()
  const parsed = json?.ParsedResults?.[0]

  // 优先用版面信息（带字号）
  const overlayLines = parsed?.TextOverlay?.Lines || []
  if (overlayLines.length) {
    const out = overlayLines
      .map(l => {
        const words = l.Words || []
        const text = words.map(w => w.WordText || '').join(' ').replace(/\s+/g, ' ').trim()
        const size = Math.max(0, ...words.map(w => w.Height || 0))
        const top = Math.min(...words.map(w => w.Top ?? Infinity))
        const left = Math.min(...words.map(w => w.Left ?? Infinity))
        return { text, size, top: top === Infinity ? 0 : top, left: left === Infinity ? 0 : left }
      })
      .filter(l => l.text)
    if (out.length) return out
  }

  // 兜底：纯文本行（无字号信息）
  const text = parsed?.ParsedText || ''
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  if (!lines.length) throw new Error(json?.ErrorMessage?.[0] || '没认出文字')
  return lines.map(t => ({ text: t, size: 0, top: 0, left: 0 }))
}
