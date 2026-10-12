// 极简 IndexedDB 封装：绘本封面原图存这里（localStorage 只有 ~5MB 放不下图片）
// 库 castle-books / 表 covers / 记录 { id, dataUrl }
const DB_NAME = 'castle-books'
const STORE = 'covers'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    fn(t.objectStore(STORE))
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function idbPutCover(cover) {
  const db = await open()
  await tx(db, 'readwrite', s => { s.put(cover) })
  db.close()
}

export async function idbGet(id) {
  const db = await open()
  const out = await new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly')
    const req = t.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return out
}

export async function idbAllCovers() {
  const db = await open()
  const out = await new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly')
    const req = t.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return out
}

export async function idbDelCover(id) {
  const db = await open()
  await tx(db, 'readwrite', s => { s.delete(id) })
  db.close()
}

export async function idbClear() {
  const db = await open()
  await tx(db, 'readwrite', s => { s.clear() })
  db.close()
}
