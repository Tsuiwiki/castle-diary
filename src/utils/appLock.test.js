import { describe, it, expect } from 'vitest'
import { nextThrottleMs, shouldLockOnVisible, getAutoLockPolicy, setAutoLockPolicy } from './appLock.js'

// localStorage 在 vitest node 环境下的简易替代
const store = {}
globalThis.localStorage = {
  getItem: k => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: k => { delete store[k] },
}

describe('appLock 节流推进', () => {
  it('前 4 次失败不延迟，第 5 次 15 秒，之后翻倍，封顶 5 分钟', () => {
    expect(nextThrottleMs(1)).toBe(0)
    expect(nextThrottleMs(4)).toBe(0)
    expect(nextThrottleMs(5)).toBe(15000)
    expect(nextThrottleMs(6)).toBe(30000)
    expect(nextThrottleMs(7)).toBe(60000)
    expect(nextThrottleMs(9)).toBe(240000)
    expect(nextThrottleMs(20)).toBe(300000)
    expect(nextThrottleMs(99)).toBe(300000)
  })
})

describe('自动锁定策略判定', () => {
  it('startup 永不因后台锁定', () => {
    expect(shouldLockOnVisible('startup', 9999999)).toBe(false)
  })
  it('background-1m 以单次连续隐藏时长计算', () => {
    expect(shouldLockOnVisible('background-1m', 59999)).toBe(false)
    expect(shouldLockOnVisible('background-1m', 60000)).toBe(true)
  })
  it('background-5m 同理', () => {
    expect(shouldLockOnVisible('background-5m', 299999)).toBe(false)
    expect(shouldLockOnVisible('background-5m', 300000)).toBe(true)
  })
  it('immediate 只要隐藏过就锁', () => {
    expect(shouldLockOnVisible('immediate', 1)).toBe(true)
  })
})

describe('策略读写与非法值回落', () => {
  it('默认 background-5m，非法值回落', () => {
    expect(getAutoLockPolicy()).toBe('background-5m')
    setAutoLockPolicy('background-1m')
    expect(getAutoLockPolicy()).toBe('background-1m')
    setAutoLockPolicy('nonsense')
    expect(getAutoLockPolicy()).toBe('background-5m')
  })
})

// ---------- P1-1 / P1-2 回归（评审报告用例） ----------
describe('应用锁凭据行为（P1 回归）', () => {
  it('修改 PIN 后恢复码凭据保持不变（文案承诺"恢复码不变"）', async () => {
    const { setupPin, changePin } = await import('./appLock.js')
    localStorage.removeItem('castle-diary-lock-v1')
    await setupPin('123456')
    const before = JSON.parse(localStorage.getItem('castle-diary-lock-v1'))
    await changePin('123456', '654321')
    const after = JSON.parse(localStorage.getItem('castle-diary-lock-v1'))
    expect(after.hash).not.toBe(before.hash)
    expect(after.recoveryHash).toBe(before.recoveryHash)
    expect(after.recoverySalt).toBe(before.recoverySalt)
  }, 20000)

  it('凭据键存在但损坏时 fail-closed：不放行、不静默清除', async () => {
    const { initAppLock, lock } = await import('./appLock.js')
    localStorage.setItem('castle-diary-lock-v1', '{broken json')
    initAppLock()
    expect(lock.enabled).toBe(true)
    expect(lock.locked).toBe(true)
    expect(lock.corrupt).toBe(true)
    expect(localStorage.getItem('castle-diary-lock-v1')).toBe('{broken json') // 不被清掉
  })

  it('没有凭据键 = 未开启', async () => {
    const { initAppLock, lock } = await import('./appLock.js')
    localStorage.removeItem('castle-diary-lock-v1')
    initAppLock()
    expect(lock.enabled).toBe(false)
    expect(lock.locked).toBe(false)
  })
})
