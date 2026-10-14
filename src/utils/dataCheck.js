// 数据完整性校验（DATA-04）：备份导入前的只读检查。
// 三档：fatal（拒绝导入）/ fixable（导入时自动修，出修复报告）/ warnings（导入但提示）。
// 只读：绝不修改传入对象。

// 17 个业务集合（与 store.js persistNow 的字段清单保持一致）
export const COLLECTIONS = [
  'books', 'words', 'medicines', 'healths', 'vaccines', 'meals', 'toys',
  'milestones', 'photos', 'trips', 'diaries', 'games', 'foods', 'places',
  'illnesses', 'members',
]

// 媒体引用字段 → 所属集合
const MEDIA_REFS = [
  { coll: 'books', field: 'coverId' },
  { coll: 'words', field: 'imageId' },
  { coll: 'words', field: 'audioId' },
  { coll: 'photos', field: 'imageId' },
  { coll: 'toys', field: 'imageId' },
  { coll: 'games', field: 'imageId' },
  { coll: 'settings', field: 'avatarId' },
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// 备份数据的轻量校验和（防传输损坏，不防篡改；djb2 变体，同步无依赖）
export function checksumOf(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0')
}

export function checkBackup(data) {
  const fatal = []
  const fixable = []
  const warnings = []

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { fatal: ['不是有效的备份文件（需要 JSON 对象）'], fixable, warnings }
  }

  // 校验和（v2 备份带；旧 v1 没有则跳过）
  if (data.version >= 2 && data.checksum) {
    const { checksum, ...rest } = data
    if (checksumOf(JSON.stringify(rest)) !== checksum) {
      fatal.push('校验和不一致，文件可能被损坏或不完整')
    }
  }

  const hasAny = COLLECTIONS.some(k => Array.isArray(data[k])) || (data.settings && typeof data.settings === 'object')
  if (!hasAny) {
    fatal.push('文件里没有找到任何城堡日记的数据（不是本应用的备份）')
    return { fatal, fixable, warnings }
  }

  // 集合类型
  for (const k of COLLECTIONS) {
    if (k in data && !Array.isArray(data[k])) fatal.push(`「${k}」应是数组`)
  }

  // 逐集合检查：缺 id（可修复补发）、重复 id（可修复改发）
  for (const k of COLLECTIONS) {
    const arr = data[k]
    if (!Array.isArray(arr)) continue
    let missingId = 0
    const seen = new Set()
    let dupId = 0
    for (const rec of arr) {
      if (!rec || typeof rec !== 'object') { fatal.push(`「${k}」里有不是对象的记录`); continue }
      if (!rec.id) missingId++
      else if (seen.has(rec.id)) dupId++
      else seen.add(rec.id)
    }
    if (missingId) fixable.push(`「${k}」有 ${missingId} 条记录缺少 id，导入时会补发`)
    if (dupId) fixable.push(`「${k}」有 ${dupId} 个重复 id，导入时会改发新 id`)
  }

  // 媒体引用是否都在 covers 里
  const coverIds = new Set((Array.isArray(data.covers) ? data.covers : []).map(c => c?.id).filter(Boolean))
  let missingMedia = 0
  for (const { coll, field } of MEDIA_REFS) {
    if (coll === 'settings') {
      const id = data.settings?.[field]
      if (id && !coverIds.has(id)) missingMedia++
      continue
    }
    if (!Array.isArray(data[coll])) continue
    for (const rec of data[coll]) {
      if (rec?.[field] && !coverIds.has(rec[field])) missingMedia++
    }
  }
  if (missingMedia) warnings.push(`有 ${missingMedia} 个图片/录音引用不在备份里，恢复后对应位置会留空`)

  // 日期格式抽查
  let badDates = 0
  for (const k of ['meals', 'trips', 'diaries', 'photos', 'healths']) {
    if (!Array.isArray(data[k])) continue
    for (const rec of data[k]) if (rec?.date && !DATE_RE.test(rec.date)) badDates++
  }
  if (badDates) warnings.push(`有 ${badDates} 条记录的日期格式异常，显示时可能排在最后`)

  return { fatal, fixable, warnings }
}

// 导入写入阶段的自动修复：补空数组、补发/改发 id、words 补 mastered。
// 返回 { payload, fixes } —— payload 是修复后的副本（不改传入对象）。
export function repairPayload(data, uid) {
  const payload = {}
  const fixes = []
  for (const k of COLLECTIONS) {
    const arr = Array.isArray(data[k]) ? data[k] : []
    const seen = new Set()
    payload[k] = arr.map(rec => {
      const r = { ...rec }
      if (!r.id) { r.id = uid(); fixes.push(`${k} 补发 id`) }
      else if (seen.has(r.id)) { r.id = uid(); fixes.push(`${k} 重复 id 改发`) }
      seen.add(r.id)
      if (k === 'words') r.mastered = false || r.mastered // mastered 缺省 false
      return r
    })
  }
  payload.settings = data.settings && typeof data.settings === 'object' ? { ...data.settings } : {}
  payload.covers = Array.isArray(data.covers) ? data.covers.filter(c => c?.id && c?.dataUrl) : []
  return { payload, fixes }
}
