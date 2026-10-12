// 长按指令：v-longpress="handler"
// 按住 600ms 触发；移动超过 10px 或松手则取消；触屏/鼠标双兼容
export const vLongpress = {
  mounted(el, binding) {
    if (typeof binding.value !== 'function') return
    let timer = null, sx = 0, sy = 0
    const point = e => (e.touches ? e.touches[0] : e)
    const start = e => {
      const p = point(e)
      sx = p.clientX; sy = p.clientY
      clearTimeout(timer)
      timer = setTimeout(() => { timer = null; binding.value(e) }, 600)
    }
    const move = e => {
      if (!timer) return
      const p = point(e)
      if (Math.abs(p.clientX - sx) > 10 || Math.abs(p.clientY - sy) > 10) cancel()
    }
    const cancel = () => { clearTimeout(timer); timer = null }
    const killMenu = e => e.preventDefault() // 屏蔽长按弹出的系统菜单/文本选择
    el.__lp = { start, move, cancel, killMenu }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: true })
    el.addEventListener('touchend', cancel)
    el.addEventListener('touchcancel', cancel)
    el.addEventListener('mousedown', start)
    el.addEventListener('mouseup', cancel)
    el.addEventListener('mouseleave', cancel)
    el.addEventListener('contextmenu', killMenu)
  },
  unmounted(el) {
    const h = el.__lp
    if (!h) return
    el.removeEventListener('touchstart', h.start)
    el.removeEventListener('touchmove', h.move)
    el.removeEventListener('touchend', h.cancel)
    el.removeEventListener('touchcancel', h.cancel)
    el.removeEventListener('mousedown', h.start)
    el.removeEventListener('mouseup', h.cancel)
    el.removeEventListener('mouseleave', h.cancel)
    el.removeEventListener('contextmenu', h.killMenu)
    delete el.__lp
  },
}
