// 平台适配层：同一套代码跑在浏览器（网页版 / PWA）和安卓 App（Capacitor）里。
// 只把「浏览器能做、App 的 WebView 做不了」的几件事收口到这里，其他代码不用关心平台。
import { Capacitor, registerPlugin } from '@capacitor/core'

export const isApp = () => Capacitor.isNativePlatform()
export const platformLabel = () => (isApp() ? '安卓 App' : '网页版')

// 原生小插件：调安卓系统打印（可另存为 PDF）。实现见 android/app/src/main/java/.../PrintPlugin.java
const NativePrint = registerPlugin('CastlePrint')

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

// 保存文件：网页里直接下载；App 里写进缓存目录，再弹出系统分享面板（可存到「文件」、发微信、存网盘）
// data 可以是 Blob、字符串或 dataURL。返回 'downloaded' | 'shared' | 'cancelled'
export async function saveFile(filename, data, mime = 'application/octet-stream') {
  let blob
  if (data instanceof Blob) blob = data
  else if (typeof data === 'string' && data.startsWith('data:')) blob = await (await fetch(data)).blob()
  else blob = new Blob([data], { type: mime })

  if (!isApp()) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    return 'downloaded'
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])
  const written = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  })
  try {
    await Share.share({ title: filename, files: [written.uri], dialogTitle: '保存或发送' })
    return 'shared'
  } catch (e) {
    // 用户在分享面板点了取消，不算失败
    if (/cancel/i.test(String(e?.message || e))) return 'cancelled'
    throw e
  }
}

// 图片「复制」：浏览器写进剪贴板；App 的 WebView 不支持图片剪贴板，改为分享
export async function copyOrShareImage(filename, blob) {
  if (!isApp() && navigator.clipboard?.write && window.ClipboardItem) {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })])
    return 'copied'
  }
  return saveFile(filename, blob, blob.type || 'image/png')
}

// 打印当前页面（成长书）：浏览器用 window.print()；App 调系统打印服务
export async function printPage(jobName) {
  if (!isApp()) {
    window.print()
    return
  }
  await NativePrint.print({ name: jobName || '城堡日记' })
}

// 安卓返回键：优先交给页面关闭弹层；页面不处理时返回 false
const backHandlers = []
export function onBackButton(fn) {
  backHandlers.push(fn)
  return () => {
    const i = backHandlers.indexOf(fn)
    if (i >= 0) backHandlers.splice(i, 1)
  }
}
export async function initAppShell({ fallback }) {
  if (!isApp()) return
  document.documentElement.classList.add('is-app')
  const { App } = await import('@capacitor/app')
  App.addListener('backButton', () => {
    // 后注册的先处理（最上层的弹层）
    for (let i = backHandlers.length - 1; i >= 0; i--) if (backHandlers[i]()) return
    if (fallback()) return
    App.minimizeApp() // 已经在首页：退到后台，不杀进程、不丢正在写的内容
  })
}
