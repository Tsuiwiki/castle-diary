// ========== 录音 + 播放（「她说」录下她的声音） ==========
// 录音用浏览器 MediaRecorder，结果转成 dataUrl，和图片一样存进 IndexedDB covers 表。
// 需要 https 或 localhost 才能拿到麦克风。
import { ref } from 'vue'

export const MAX_RECORD_MS = 15000
// 整段录音的最大音量低于这个值，基本可以判断没录到声音（选错了麦克风 / 麦克风被静音）
const SILENT_PEAK = 0.03

export function canRecord() {
  return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
}

function pickMime() {
  const list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return list.find(t => MediaRecorder.isTypeSupported?.(t)) || ''
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

// 实时音量：0~1，录音时给界面画音量条，结束时用峰值判断是否录到了声音
function watchLevel(stream, onLevel) {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return { peak: () => 1, close() {} }
  const ac = new AC()
  ac.resume?.().catch(() => {})
  const analyser = ac.createAnalyser()
  analyser.fftSize = 1024
  ac.createMediaStreamSource(stream).connect(analyser)
  const buf = new Uint8Array(analyser.fftSize)
  let peak = 0
  const timer = setInterval(() => {
    analyser.getByteTimeDomainData(buf)
    let max = 0
    for (const v of buf) max = Math.max(max, Math.abs(v - 128) / 128)
    peak = Math.max(peak, max)
    onLevel?.(max)
  }, 100)
  return {
    peak: () => peak,
    close() { clearInterval(timer); ac.close().catch(() => {}) },
  }
}

// 开始录音；返回 { stop() → Promise<{ dataUrl, ms, silent }>, cancel() }
// 到达 maxMs 自动停止，并通过 onAutoStop 把结果交出去
export async function startRecording({ maxMs = MAX_RECORD_MS, onTick, onLevel, onAutoStop } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const level = watchLevel(stream, onLevel)
  const chunks = []
  const t0 = Date.now()
  let finished = null

  rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data) }
  const done = new Promise(resolve => {
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      level.close()
      clearInterval(timer)
      clearTimeout(limit)
      const ms = Date.now() - t0
      if (finished === 'cancel' || !chunks.length) return resolve(null)
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })
      resolve({ dataUrl: await blobToDataUrl(blob), ms, silent: level.peak() < SILENT_PEAK })
    }
  })

  const timer = setInterval(() => onTick?.(Date.now() - t0), 200)
  const limit = setTimeout(async () => {
    if (rec.state !== 'recording') return
    finished = 'auto'
    rec.stop()
    onAutoStop?.(await done)
  }, maxMs)

  rec.start()

  return {
    stop() {
      if (rec.state === 'recording') { finished = 'stop'; rec.stop() }
      return done
    },
    cancel() {
      finished = 'cancel'
      if (rec.state === 'recording') rec.stop()
    },
  }
}

// ---------- 播放 ----------
// 全局只放一段声音：再点同一段 = 停止；点另一段会打断上一段。
// playingUrl 给界面显示"正在播放"，audioError 给界面弹出失败原因（之前失败时没有任何反应）
export const playingUrl = ref('')
export const audioError = ref('')

let player = null
const blobUrls = new Map() // dataUrl → blob: 地址，播放用 blob 地址比超长 data: 地址更稳

function toPlayable(url) {
  if (!url.startsWith('data:')) return url
  let src = blobUrls.get(url)
  if (src) return src
  const i = url.indexOf(',')
  const mime = url.slice(5, i).split(';')[0] || 'audio/webm'
  const bin = atob(url.slice(i + 1))
  const bytes = new Uint8Array(bin.length)
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
  src = URL.createObjectURL(new Blob([bytes], { type: mime }))
  blobUrls.set(url, src)
  // 最多留 50 个，最旧的释放掉，长时间使用内存不膨胀
  if (blobUrls.size > 50) {
    const oldest = blobUrls.keys().next().value
    URL.revokeObjectURL(blobUrls.get(oldest))
    blobUrls.delete(oldest)
  }
  return src
}

function explain(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError') return '浏览器拦下了播放，请再点一次播放按钮'
  if (name === 'NotSupportedError' || err?.code === 4) return '这个浏览器放不了这段录音的格式，换 Chrome 或 Edge 试试'
  return `没能播放（${name || (err?.code ? '错误码 ' + err.code : '未知原因')}），检查一下电脑音量和扬声器`
}

let errTimer = null
function reportError(err) {
  console.warn('[audio]', err)
  audioError.value = explain(err)
  clearTimeout(errTimer)
  errTimer = setTimeout(() => (audioError.value = ''), 5000)
}

export function playAudio(url) {
  if (!url) return
  if (playingUrl.value === url) { stopAudio(); return }
  stopAudio()
  let a
  try {
    a = new Audio(toPlayable(url))
  } catch (e) {
    reportError(e)
    return
  }
  player = a
  playingUrl.value = url
  const end = () => { if (player === a) { player = null; playingUrl.value = '' } }
  a.onended = end
  a.onerror = () => { end(); reportError(a.error) }
  a.play().catch(e => { end(); reportError(e) })
}

export function stopAudio() {
  if (player) {
    player.pause()
    player = null
  }
  playingUrl.value = ''
}
