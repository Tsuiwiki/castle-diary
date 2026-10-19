import { describe, it, expect } from 'vitest'
import { checkBackup, repairPayload, checksumOf } from './dataCheck.js'

const good = () => ({
  app: 'castle-books', version: 2, exportedAt: '2026-10-14T00:00:00Z',
  settings: { childName: '小宝' },
  books: [{ id: 'b1', title: '书', coverId: 'c1' }],
  words: [], medicines: [], healths: [], vaccines: [], meals: [], toys: [],
  milestones: [], photos: [], trips: [], diaries: [], dayStates: [], games: [], foods: [], places: [],
  illnesses: [], members: [],
  covers: [{ id: 'c1', dataUrl: 'data:image/png;base64,xx' }],
})

describe('checkBackup', () => {
  it('非对象直接拒绝', () => {
    expect(checkBackup(null).fatal.length).toBe(1)
    expect(checkBackup('str').fatal.length).toBe(1)
    expect(checkBackup([1]).fatal.length).toBe(1)
  })
  it('没有任何数据字段拒绝', () => {
    expect(checkBackup({ hello: 1 }).fatal[0]).toContain('不是本应用的备份')
  })
  it('正常备份零误报', () => {
    const r = checkBackup(good())
    expect(r.fatal).toEqual([])
    expect(r.fixable).toEqual([])
    expect(r.warnings).toEqual([])
  })
  it('缺 id 可修复，重复 id 可修复', () => {
    const d = good()
    d.books.push({ title: '无id' }, { id: 'b1', title: '重复' })
    const r = checkBackup(d)
    expect(r.fatal).toEqual([])
    expect(r.fixable.join()).toContain('缺少 id')
    expect(r.fixable.join()).toContain('重复 id')
  })
  it('媒体引用缺失给出警告', () => {
    const d = good()
    d.covers = [] // 封面引用 c1 但备份里没带
    const r = checkBackup(d)
    expect(r.fatal).toEqual([])
    expect(r.warnings.join()).toContain('1 个图片/录音')
  })
  it('v2 校验和不一致拒绝', () => {
    const d = good()
    d.checksum = checksumOf(JSON.stringify(d))
    d.books[0].title = '被改动'
    expect(checkBackup(d).fatal[0]).toContain('校验和')
  })
  it('v2 校验和一致通过', () => {
    const d = good()
    d.checksum = checksumOf(JSON.stringify(d))
    expect(checkBackup(d).fatal).toEqual([])
  })
  it('v1 旧备份（无 version）不校验 checksum 也能过', () => {
    const d = good()
    delete d.version
    expect(checkBackup(d).fatal).toEqual([])
  })
  it('集合类型错误拒绝', () => {
    const d = good()
    d.books = 'oops'
    expect(checkBackup(d).fatal.join()).toContain('books')
  })
})

describe('repairPayload', () => {
  let n = 0
  const uid = () => 'u' + (++n)
  it('补空数组、补发 id、不改原对象', () => {
    const d = { books: [{ title: '无id' }] } // 其他集合缺失
    const { payload, fixes } = repairPayload(d, uid)
    expect(payload.words).toEqual([])
    expect(payload.books[0].id).toBe('u1')
    expect(fixes.join()).toContain('补发 id')
    expect(d.books[0].id).toBeUndefined() // 原对象不被修改
  })
  it('重复 id 改发新 id，首条保留', () => {
    const { payload } = repairPayload({ books: [{ id: 'x' }, { id: 'x' }] }, uid)
    expect(payload.books[0].id).toBe('x')
    expect(payload.books[1].id).not.toBe('x')
  })
  it('dayStates 重复日期被剔除（保留首条）', () => {
    const { payload } = repairPayload({ dayStates: [{ id: 'a', date: '2026-10-19', mood: '开心' }, { id: 'b', date: '2026-10-19', mood: '犯困' }] }, uid)
    expect(payload.dayStates.length).toBe(1)
    expect(payload.dayStates[0].id).toBe('a')
  })
  it('dayStates 重复日期提示可修复', () => {
    const d = good()
    d.dayStates = [{ id: 'a', date: '2026-10-19' }, { id: 'b', date: '2026-10-19' }]
    expect(checkBackup(d).fixable.join()).toContain('重复日期')
  })
  it('没有 id/dataUrl 的 cover 被剔除', () => {
    const { payload } = repairPayload({ settings: {}, covers: [{ id: 'a' }, { dataUrl: 'b' }, { id: 'c', dataUrl: 'd' }] }, uid)
    expect(payload.covers.length).toBe(1)
  })
})
