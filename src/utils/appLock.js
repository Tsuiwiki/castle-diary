// ========== 本地 PIN 应用锁（v0.25.0） ==========
// 定位：界面访问锁，防止随手翻阅与误触；**不是数据加密**——数据仍以可读形式存在本机浏览器与备份文件里。
// 安全红线（任何版本都不得违反）：
//   1. 不存在"保留业务数据 + 重置/关闭锁"的路径，唯一例外是有效恢复码
//   2. 锁屏页与恢复页不提供任何业务数据的查看/导出入口
//   3. 输错多少次都不清除用户数据
//   4. 明文 PIN / 明文恢复码不进 store、localStorage 主数据、IndexedDB、日志、剪贴板、备份
//   5. Web Crypto 不可用就拒绝开启，不降级为明文或弱哈希
// 存储说明：锁相关字段全部是设备本地字段，放在独立的 localStorage 键里，
// 不进入主数据 store —— 因此天然满足"导出不含、导入不覆盖"（等价于需求文档 §4.2 清单）。
import { reactive } from 'vue'
import { cryptoOk, generateSalt, deriveHash, verify, generateRecoveryCode, normalizeRecoveryCode } from './crypto.js'

const CRED_KEY = 'castle-diary-lock-v1'       // { salt, iter, hash, recoveryHash, recoverySalt, paramsVersion, createdAt }
const THROTTLE_KEY = 'castle-diary-lock-throttle' // { pinFails, pinNextAt, recFails, recNextAt } 节流只提高猜测成本，不构成安全边界
const SETTINGS_KEY = 'castle-diary-lock-settings' // { autoLockPolicy }
const SIGNAL_KEY = 'castle-diary-lock-signal'  // 多标签锁定广播：只放时间戳，不含任何敏感信息
// 本页（本次加载）解锁的时间；刷新等于新页面 → 重新锁定。不用 sessionStorage（它在刷新后仍存活）
const pageLoadAt = Date.now()
let pageUnlockedAt = 0

export const PARAMS_VERSION = 1
export const PIN_ITERATIONS = 600000 // 目标单次 100–400ms；实测值见交付说明

export const AUTO_LOCK_POLICIES = [
  { value: 'startup', label: '仅启动或刷新时锁定' },
  { value: 'background-1m', label: '后台 1 分钟后锁定' },
  { value: 'background-5m', label: '后台 5 分钟后锁定' },
  { value: 'immediate', label: '切到后台立即锁定' },
]
const POLICY_VALUES = AUTO_LOCK_POLICIES.map(p => p.value)

export const lock = reactive({
  ready: false,
  enabled: false,
  locked: false,
  recoverySet: false,
  corrupt: false, // 开关开着但凭据缺失/损坏：不放行、不静默关闭，引导走恢复流程
})

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

// ---------- 初始化：先读锁状态，再决定渲染业务还是锁屏 ----------
export function initAppLock() {
  const raw = localStorage.getItem(CRED_KEY)
  if (raw === null) {
    // 没有凭据键 = 未开启
    lock.enabled = false
    lock.corrupt = false
  } else {
    const cred = readJSON(CRED_KEY)
    const valid = !!cred
      && typeof cred.hash === 'string' && /^[0-9a-f]{64}$/.test(cred.hash)
      && typeof cred.salt === 'string' && /^[0-9a-f]{32}$/.test(cred.salt)
      && Number.isInteger(cred.iter) && cred.iter >= 1000
    // 键存在但损坏：fail-closed，进入安全配置异常（不放行、不静默清除）
    lock.enabled = true
    lock.corrupt = !valid
    lock.recoverySet = !!cred?.recoveryHash && /^[0-9a-f]{64}$/.test(cred?.recoveryHash)
  }
  lock.locked = lock.enabled
  lock.ready = true
}

// ---------- 凭据操作 ----------
export async function setupPin(pin, { keepRecovery = false } = {}) {
  if (!cryptoOk()) throw new Error('当前浏览器环境不支持安全 PIN 校验')
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN 必须是 6 位数字')
  const salt = generateSalt()
  const hash = await deriveHash(pin, salt, PIN_ITERATIONS)
  const prev = readJSON(CRED_KEY)
  let code = null
  let recoveryHash, recoverySalt
  if (keepRecovery && prev?.recoveryHash) {
    // 修改 PIN：恢复码原样保留（文案承诺"恢复码不变"就必须不变）
    recoveryHash = prev.recoveryHash
    recoverySalt = prev.recoverySalt
  } else {
    code = generateRecoveryCode()
    recoverySalt = generateSalt()
    recoveryHash = await deriveHash(normalizeRecoveryCode(code), recoverySalt, PIN_ITERATIONS)
  }
  localStorage.setItem(CRED_KEY, JSON.stringify({
    salt, iter: PIN_ITERATIONS, hash,
    recoveryHash, recoverySalt,
    paramsVersion: PARAMS_VERSION, createdAt: prev?.createdAt || Date.now(),
  }))
  localStorage.removeItem(THROTTLE_KEY)
  markUnlocked()
  lock.enabled = true
  lock.corrupt = false
  lock.recoverySet = true
  return code
}

export async function changePin(oldPin, newPin) {
  const ok = await verifyPin(oldPin)
  if (ok !== true) return false
  await setupPin(newPin, { keepRecovery: true })
  return true
}

export async function disableAppLock(pin) {
  const ok = await verifyPin(pin)
  if (ok !== true) return false
  clearAppLock()
  return true
}

export async function regenerateRecoveryCode() {
  const cred = readJSON(CRED_KEY)
  if (!cred?.hash) throw new Error('未开启应用锁')
  const code = generateRecoveryCode()
  cred.recoverySalt = generateSalt()
  cred.recoveryHash = await deriveHash(normalizeRecoveryCode(code), cred.recoverySalt, cred.iter)
  localStorage.setItem(CRED_KEY, JSON.stringify(cred))
  lock.recoverySet = true
  return code
}

export function skipRecoveryCode() {
  const cred = readJSON(CRED_KEY)
  if (!cred) return
  delete cred.recoveryHash
  delete cred.recoverySalt
  localStorage.setItem(CRED_KEY, JSON.stringify(cred))
  lock.recoverySet = false
}

// ---------- 验证 ----------
function markUnlocked() {
  pageUnlockedAt = Date.now()
  lock.locked = false
}

// 返回 true / false / { throttled, waitMs }
export async function verifyPin(pin) {
  const cred = readJSON(CRED_KEY)
  if (!cred?.hash) return false
  const wait = throttleWaitMs('pin')
  if (wait > 0) return { throttled: true, waitMs: wait }
  const ok = await verify(pin, cred.hash, cred.salt, cred.iter)
  if (ok) {
    const t = readThrottle()
    t.pinFails = 0
    t.pinNextAt = 0
    writeThrottle(t)
    // 参数代次升级：下一次成功解锁时用新参数重算（不改变用户 PIN）
    if (cred.paramsVersion !== PARAMS_VERSION || cred.iter !== PIN_ITERATIONS) {
      cred.iter = PIN_ITERATIONS
      cred.paramsVersion = PARAMS_VERSION
      cred.salt = generateSalt()
      cred.hash = await deriveHash(pin, cred.salt, PIN_ITERATIONS)
      localStorage.setItem(CRED_KEY, JSON.stringify(cred))
    }
    markUnlocked()
    return true
  }
  recordFail('pin')
  return false
}

// 恢复码解锁（非破坏性）：校验恢复码 → 设置新 PIN；旧恢复码立即失效（setupPin 会换新码）
export async function unlockByRecovery(code, newPin) {
  const cred = readJSON(CRED_KEY)
  if (!cred?.hash) return { ok: false }
  if (!cred.recoveryHash) return { ok: false, noRecovery: true }
  const wait = throttleWaitMs('rec')
  if (wait > 0) return { ok: false, throttled: true, waitMs: wait }
  const ok = await verify(normalizeRecoveryCode(code), cred.recoveryHash, cred.recoverySalt, cred.iter)
  if (!ok) {
    recordFail('rec')
    return { ok: false }
  }
  await setupPin(newPin)
  return { ok: true }
}

// ---------- 节流（PIN 与恢复码独立计数） ----------
function readThrottle() {
  return readJSON(THROTTLE_KEY) || { pinFails: 0, pinNextAt: 0, recFails: 0, recNextAt: 0 }
}
function writeThrottle(t) { localStorage.setItem(THROTTLE_KEY, JSON.stringify(t)) }

// 第 1–4 次失败立即可重试；第 5 次 15 秒；之后翻倍，封顶 5 分钟
export function nextThrottleMs(fails) {
  if (fails < 5) return 0
  return Math.min(15 * 1000 * Math.pow(2, fails - 5), 5 * 60 * 1000)
}

function recordFail(kind) {
  const t = readThrottle()
  if (kind === 'pin') {
    t.pinFails += 1
    const w = nextThrottleMs(t.pinFails)
    if (w) t.pinNextAt = Date.now() + w
  } else {
    t.recFails += 1
    const w = nextThrottleMs(t.recFails)
    if (w) t.recNextAt = Date.now() + w
  }
  writeThrottle(t)
}

// 时间健壮性：负值或异常大值（系统时间被改）按 0 处理，不让用户永远解不开
export function throttleWaitMs(kind) {
  const t = readThrottle()
  const wait = (kind === 'pin' ? t.pinNextAt : t.recNextAt) - Date.now()
  if (wait < 0 || wait > 5 * 60 * 1000) return 0
  return wait
}

export function failCount(kind = 'pin') {
  const t = readThrottle()
  return kind === 'pin' ? t.pinFails : t.recFails
}

// ---------- 锁定 ----------
export function lockNow() {
  if (!lock.enabled) return
  pageUnlockedAt = 0
  // 广播给其他标签页（只放时间戳，不含敏感信息）；解锁不广播
  localStorage.setItem(SIGNAL_KEY, String(Date.now()))
  lock.locked = true
}

// 其他标签页收到锁定信号时同步（storage 事件在写入方之外的标签触发）
export function onStorageSignal(e) {
  if (e.key !== SIGNAL_KEY || !lock.enabled || lock.locked) return
  const at = Number(localStorage.getItem(SIGNAL_KEY) || 0)
  // 信号晚于本页加载或本页解锁 → 本页也锁
  if (at > Math.max(pageLoadAt, pageUnlockedAt)) {
    pageUnlockedAt = 0
    lock.locked = true
  }
}

// ---------- 自动锁定策略 ----------
export function getAutoLockPolicy() {
  const v = readJSON(SETTINGS_KEY)?.autoLockPolicy
  if (POLICY_VALUES.includes(v)) return v
  return 'background-5m' // 非法值回落默认
}
export function setAutoLockPolicy(v) {
  if (!POLICY_VALUES.includes(v)) v = 'background-5m'
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ autoLockPolicy: v }))
}

// 纯判定函数（方便测试）：hiddenMs = 单次连续隐藏时长
export function shouldLockOnVisible(policy, hiddenMs) {
  if (policy === 'immediate') return hiddenMs > 0
  if (policy === 'background-1m') return hiddenMs >= 60 * 1000
  if (policy === 'background-5m') return hiddenMs >= 5 * 60 * 1000
  return false // startup：不因后台切换锁定
}

let hiddenAt = 0
export function onHidden() {
  if (!lock.enabled || lock.locked) return
  const policy = getAutoLockPolicy()
  if (policy === 'immediate') { lockNow(); return }
  if (policy !== 'startup') hiddenAt = Date.now()
}
export function onVisible() {
  if (!lock.enabled || lock.locked || !hiddenAt) return
  if (shouldLockOnVisible(getAutoLockPolicy(), Date.now() - hiddenAt)) lockNow()
  hiddenAt = 0
}

// ---------- 清空（resetAll 由已解锁用户主动触发时调用） ----------
export function clearAppLock() {
  localStorage.removeItem(CRED_KEY)
  localStorage.removeItem(THROTTLE_KEY)
  localStorage.removeItem(SIGNAL_KEY)
  lock.enabled = false
  lock.locked = false
  lock.recoverySet = false
  lock.corrupt = false
}
