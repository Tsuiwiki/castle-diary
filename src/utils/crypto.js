// ========== 加密工具（PIN 应用锁用） ==========
// 纯函数：盐生成、PBKDF2 派生、等长比较、恢复码生成与规范化。
// 不接触 UI、不读 store、不把 PIN/恢复码打进日志。
// 注意：JS 运行环境无法保证恒定时间比较，verify 只做等长 XOR 累积比较，不作为安全承诺。

export const cryptoOk = () => !!(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues)

const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
const fromHex = hex => Uint8Array.from(hex.match(/../g).map(b => parseInt(b, 16)))

// 16 字节随机盐（hex）
export function generateSalt() {
  if (!cryptoOk()) throw new Error('WEBCRYPTO_UNAVAILABLE')
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return toHex(buf.buffer)
}

// PBKDF2-SHA-256 派生 → hex
export async function deriveHash(input, saltHex, iterations) {
  if (!cryptoOk()) throw new Error('WEBCRYPTO_UNAVAILABLE')
  if (typeof input !== 'string' || !saltHex || !iterations) throw new Error('BAD_PARAMS')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(input), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations }, key, 256)
  return toHex(bits)
}

// 等长 XOR 累积比较；长度不同直接失败，绝不把异常当成功
export async function verify(input, storedHash, saltHex, iterations) {
  if (typeof storedHash !== 'string' || !storedHash) return false
  const hash = await deriveHash(input, saltHex, iterations)
  if (hash.length !== storedHash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  return diff === 0
}

// 恢复码：16 位 Base32（去掉易混的 0/O/1/I/L），4 位一组展示
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function generateRecoveryCode() {
  if (!cryptoOk()) throw new Error('WEBCRYPTO_UNAVAILABLE')
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return [...buf].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('').replace(/(.{4})(?=.)/g, '$1-')
}

// 输入规范化：忽略大小写、空格与连字符
export function normalizeRecoveryCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}
