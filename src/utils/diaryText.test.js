import { describe, it, expect } from 'vitest'
import { buildDayItems } from './diaryText.js'

// buildDayItems 是纯函数：全部集合由参数注入，不碰 store（导入 store 会触发 init，测试里不依赖它）
const D = '2026-10-19'
const empty = { diaries: [], meals: [], trips: [], words: [], books: [], games: [], milestones: [], healths: [], illnesses: [], medicines: [] }
const ctx = over => ({ ...empty, ...over })
const textOf = item => item.tokens.map(t => t.v).join('')

describe('buildDayItems', () => {
  it('空日期返回空数组', () => {
    expect(buildDayItems(D, ctx({}))).toEqual([])
  })
  it('文本记录成为 note 项（不产 tokens，带 entry）', () => {
    const items = buildDayItems(D, ctx({ diaries: [{ id: 'd1', date: D, text: '今天很开心', by: '妈妈', createdAt: D + 'T09:10' }] }))
    expect(items.length).toBe(1)
    expect(items[0].kind).toBe('note')
    expect(items[0].entry.text).toBe('今天很开心')
    expect(items[0].time).toBe('09:10')
    expect(items[0].tokens).toEqual([])
  })
  it('无正文的日记条目不出现', () => {
    const items = buildDayItems(D, ctx({ diaries: [{ id: 'd1', date: D, text: '   ', createdAt: D + 'T09:10' }] }))
    expect(items).toEqual([])
  })
  it('贴纸条目与文本按时间混排，无时间戳的旧条目回退正午', () => {
    const items = buildDayItems(D, ctx({
      diaries: [{ id: 'd1', date: D, text: '晚上写的', createdAt: D + 'T21:00' }],
      meals: [
        { id: 'm1', date: D, meal: '早餐', food: '小米粥', createdAt: D + 'T08:30' },
        { id: 'm2', date: D, meal: '午餐', food: '西兰花' },
      ],
      words: [{ id: 'w1', date: D, word: '月亮', kind: '词语', createdAt: D + 'T15:00' }],
    }))
    expect(items.map(i => i.kind)).toEqual(['food', 'food', 'say', 'note'])
    expect(items[0].time).toBe('08:30')
    expect(items[1].time).toBe('')
    expect(items[2].time).toBe('15:00')
    expect(items[3].time).toBe('21:00')
  })
  it('同是回退时间时保持录入顺序（后录入的先显示）', () => {
    const items = buildDayItems(D, ctx({
      meals: [
        { id: 'old1', date: D, meal: '早餐', food: '粥' },
        { id: 'old2', date: D, meal: '晚餐', food: '面' },
      ],
    }))
    expect(items.map(i => i.key)).toEqual(['meal-old2', 'meal-old1'])
  })
  it('句子生成：吃了/她说过/玩了/去了', () => {
    const items = buildDayItems(D, ctx({
      meals: [{ id: 'm1', date: D, meal: '午餐', food: '西兰花', firstTaste: true, createdAt: D + 'T12:00' }],
      words: [{ id: 'w1', date: D, word: '月亮', kind: '词语', createdAt: D + 'T13:00' }],
      games: [{ id: 'g1', name: '躲猫猫', plays: [{ id: 'p1', date: D, note: '躲到窗帘后', createdAt: D + 'T14:00' }] }],
      trips: [{ id: 't1', date: D, place: '公园', title: '看鸽子', createdAt: D + 'T16:00' }],
    }))
    const t = items.map(textOf)
    expect(t[0]).toBe('午饭吃了西兰花。')
    expect(t[1]).toContain('她说了新词“月亮”')
    expect(t[2]).toBe('玩了躲猫猫，躲到窗帘后。')
    expect(t[3]).toBe('去了公园，看鸽子。')
    expect(items[0].tokens[1].badge).toBe('首尝')
  })
  it('会说的词带全局编号（跨天累计）', () => {
    const items = buildDayItems(D, ctx({
      words: [
        { id: 'w1', date: D, word: '月亮', kind: '词语' },
        { id: 'w0', date: '2026-10-10', word: '妈妈', kind: '词语' },
      ],
    }))
    expect(textOf(items[0])).toBe('她说了新词“月亮”，这是她会说的第 2 个词。')
  })
  it('读了：当天两次读同一本书各一条、次数累计正确', () => {
    const items = buildDayItems(D, ctx({
      books: [{ id: 'b1', title: '毛毛虫', reads: [
        { id: 'r1', time: D + 'T10:00' },
        { id: 'r2', time: D + 'T20:00' },
      ] }],
    }))
    expect(items.length).toBe(2)
    // 时间线按时间正序：早上那次在前
    expect(items[0].time).toBe('10:00')
    expect(textOf(items[0])).toBe('读了《毛毛虫》，第 1 次。')
    expect(textOf(items[1])).toBe('读了《毛毛虫》，第 2 次。')
  })
  it('生病：病程句按天生成，用药关联正确', () => {
    const items = buildDayItems(D, ctx({
      illnesses: [{ id: 'i1', start: D, end: '', symptoms: ['发烧'], temps: [{ time: D + 'T09:00', value: 38.5 }], notes: [], visits: [] }],
      medicines: [{ id: 'md1', name: '美林', logs: [{ mode: 'use', illnessId: 'i1', time: D + 'T09:30' }] }],
    }))
    expect(textOf(items[0])).toBe('开始不舒服：发烧，体温 38.5℃，吃了美林。')
    expect(items[0].kind).toBe('sick')
  })
  it('健康记录：疫苗与体检', () => {
    const items = buildDayItems(D, ctx({
      healths: [
        { id: 'h1', date: D, kind: '疫苗', title: '流感疫苗', createdAt: D + 'T10:00' },
        { id: 'h2', date: D, kind: '体检', title: '18 月龄体检', height: 82, weight: 11.2, createdAt: D + 'T11:00' },
      ],
    }))
    expect(textOf(items[0])).toBe('打了疫苗：流感疫苗。')
    expect(textOf(items[1])).toBe('做了18 月龄体检，身高 82 cm、体重 11.2 kg。')
  })
  it('其他日期的记录不混入', () => {
    const items = buildDayItems(D, ctx({
      meals: [
        { id: 'm1', date: D, meal: '早餐', food: '粥', createdAt: D + 'T08:00' },
        { id: 'm2', date: '2026-10-18', meal: '早餐', food: '面', createdAt: '2026-10-18T08:00' },
      ],
    }))
    expect(items.length).toBe(1)
  })
})
