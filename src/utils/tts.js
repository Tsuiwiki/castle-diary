// 朗读工具：浏览器内置 speechSynthesis，无需联网、无后端
// 音质说明：语音由浏览器/系统提供——
//   Edge 在线时会暴露微软神经网络自然音（晓伊=童声、晓晓=女声，最接近真人）；
//   Chrome 有 Google 中文音；离线时退回系统默认音（偏机器）。
// 策略：自动优先挑自然音；用户也可在「设置-陪读偏好」手动指定语音。

const LS_VOICE = 'castle-books-tts-voice'

export function getTtsVoiceName() {
  return (localStorage.getItem(LS_VOICE) || '').trim()
}

export function setTtsVoiceName(name) {
  const n = (name || '').trim()
  if (n) localStorage.setItem(LS_VOICE, n)
  else localStorage.removeItem(LS_VOICE)
}

// 偏好顺序：晓晓(自然女声，用户实测好听) > 晓伊(童声) > 其他微软自然音 > Natural/Online > Google
const PREFERRED = [
  /xiaoxiao/i, /xiaoyi/i, /yunxia/i, /yunxi/i, /xiaohan|xiaomo|xiaoxuan|xiaorui/i,
  /natural/i, /online/i, /google/i,
]

// 当前可用的中文语音列表——白名单制：只放行标准普通话音（名字含 Mainland / Simplified, PRC），
// 东北话/台湾腔/陕西话等方言音（lang 同样是 zh-CN，只能按名字滤）全部排除；
// 按 PREFERRED 好听程度排序，方便在下拉里直接挑
export function listZhVoices() {
  if (typeof speechSynthesis === 'undefined') return []
  const all = speechSynthesis.getVoices()
  let pool = all.filter(v => /chinese \(mainland\)|chinese \(simplified/i.test(v.name))
  if (!pool.length) {
    // 兜底：语言代码 zh-CN 且名字不含方言关键词
    pool = all.filter(v => /^zh([-_]CN)?$/i.test(v.lang)
      && !/northeastern|taiwanese|shaanxi|zhongyuan|cantonese|yue|hong kong|taiwan/i.test(v.name))
  }
  if (!pool.length) pool = all.filter(v => /^zh/i.test(v.lang)) // 极端兜底：放行全部中文音
  const rank = v => {
    const i = PREFERRED.findIndex(re => re.test(v.name))
    return i < 0 ? 99 : i
  }
  return pool.sort((a, b) => rank(a) - rank(b))
}

function pickVoice() {
  const voices = listZhVoices()
  if (!voices.length) return null
  const chosen = getTtsVoiceName()
  if (chosen) {
    const v = voices.find(x => x.name === chosen)
    if (v) return v
  }
  for (const re of PREFERRED) {
    const v = voices.find(x => re.test(x.name))
    if (v) return v
  }
  return voices[0]
}

export function speak(text) {
  if (!text || typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel() // 打断上一次，避免排队叠读
  const u = new SpeechSynthesisUtterance(text)
  const v = pickVoice()
  if (v) { u.voice = v; u.lang = v.lang } else { u.lang = 'zh-CN' }
  u.rate = 0.85
  u.pitch = 1.1
  speechSynthesis.speak(u)
}

export function stopSpeak() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

// 预热语音列表（部分浏览器首次 getVoices 为空）
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.getVoices()
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices()
}
