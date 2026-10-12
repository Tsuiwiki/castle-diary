import { describe, it, expect } from 'vitest'
import { cryptoOk, generateSalt, deriveHash, verify, generateRecoveryCode, normalizeRecoveryCode } from './crypto.js'

const ITER = 1000 // 测试用低迭代，生产用 PIN_ITERATIONS

describe('crypto.js', () => {
  it('环境具备 Web Crypto', () => {
    expect(cryptoOk()).toBe(true)
  })
  it('盐是 16 字节随机值，两次不同', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(a).toHaveLength(32)
    expect(a).not.toBe(b)
  })
  it('同输入同盐派生结果确定，不同输入不匹配', async () => {
    const salt = generateSalt()
    const h1 = await deriveHash('123456', salt, ITER)
    const h2 = await deriveHash('123456', salt, ITER)
    expect(h1).toBe(h2)
    expect(await verify('123456', h1, salt, ITER)).toBe(true)
    expect(await verify('654321', h1, salt, ITER)).toBe(false)
    expect(await verify('123456', h1, generateSalt(), ITER)).toBe(false)
  })
  it('异常输入不返回成功', async () => {
    const salt = generateSalt()
    const h = await deriveHash('123456', salt, ITER)
    expect(await verify('123456', '', salt, ITER)).toBe(false)
    expect(await verify('123456', h.slice(2), salt, ITER)).toBe(false)
    await expect(deriveHash('123456', '', ITER)).rejects.toThrow()
  })
  it('恢复码 16 位分组展示，规范化忽略大小写空格连字符', () => {
    const code = generateRecoveryCode()
    expect(code).toMatch(/^([A-Z2-9]{4}-){3}[A-Z2-9]{4}$/)
    expect(normalizeRecoveryCode(code)).toHaveLength(16)
    const norm = normalizeRecoveryCode(code)
    expect(normalizeRecoveryCode(norm.toLowerCase().replace(/(.{4})/g, ' $1 '))).toBe(norm)
  })
})
