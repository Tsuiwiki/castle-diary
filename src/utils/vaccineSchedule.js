// ========== 国家免疫规划疫苗儿童免疫程序（2026 年版，免费一类苗） ==========
// 纯静态数据：month = 接种月龄（0 = 出生时），family = 疫苗类别（接种记录分组展示用）。
// 只做日程参考与勾选存证，不做任何医学建议；二类自费苗（轮状/手足口/流感等）不包含。
//
// 【内容维护机制】官方发布新版程序时，对照原文修订本表并做旧记录迁移：
//   1. 更新下方 SCHEDULE_META（版本、文号、印发日期、来源链接）
//   2. 调整 VACCINE_SCHEDULE（尽量沿用旧 key，剂次月份变化不影响已接种存证）
//   3. 结构变化的疫苗在 store.js 的 migrateVaccineKeys 里做旧 key → 新 key 映射
// 历史：2021 年版（国卫办疾控发〔2021〕10 号）→ 2026 年版（百白破 3 月龄起始改为
// 2 月龄、共 5 剂次；6 周岁白破改为百白破；新增双价 HPV 疫苗 13 周岁女孩 2 剂次）

export const SCHEDULE_META = {
  version: '2026 年版',
  doc: '国家免疫规划疫苗儿童免疫程序及说明（2026 年版）',
  docNo: '国疾控卫免发〔2026〕16 号',
  issuer: '国家疾控局、国家卫生健康委',
  published: '2026-06-17',
  source: 'https://www.gov.cn/lianbo/202607/content_7074538.htm',
}

export const VACCINE_SCHEDULE = [
  { key: 'bcg',     name: '卡介苗',                   month: 0,  family: '卡介苗类' },
  { key: 'hepb1',   name: '乙肝疫苗 第 1 针',          month: 0,  family: '乙肝类' },
  { key: 'hepb2',   name: '乙肝疫苗 第 2 针',          month: 1,  family: '乙肝类' },
  { key: 'ipv1',    name: '脊灰灭活疫苗 第 1 针',      month: 2,  family: '脊灰类' },
  { key: 'dtap1',   name: '百白破疫苗 第 1 针',        month: 2,  family: '百白破类' },
  { key: 'ipv2',    name: '脊灰灭活疫苗 第 2 针',      month: 3,  family: '脊灰类' },
  { key: 'bopv1',   name: '脊灰减毒活疫苗 第 1 剂',    month: 4,  family: '脊灰类' },
  { key: 'dtap2',   name: '百白破疫苗 第 2 针',        month: 4,  family: '百白破类' },
  { key: 'dtap3',   name: '百白破疫苗 第 3 针',        month: 6,  family: '百白破类' },
  { key: 'hepb3',   name: '乙肝疫苗 第 3 针',          month: 6,  family: '乙肝类' },
  { key: 'mpsva1',  name: 'A 群流脑疫苗 第 1 针',      month: 6,  family: '流脑类' },
  { key: 'mmr1',    name: '麻腮风疫苗 第 1 针',        month: 8,  family: '麻腮风类' },
  { key: 'jel1',    name: '乙脑减毒活疫苗 第 1 针',    month: 8,  family: '乙脑类' },
  { key: 'mpsva2',  name: 'A 群流脑疫苗 第 2 针',      month: 9,  family: '流脑类' },
  { key: 'dtap4',   name: '百白破疫苗 第 4 针',        month: 18, family: '百白破类' },
  { key: 'mmr2',    name: '麻腮风疫苗 第 2 针',        month: 18, family: '麻腮风类' },
  { key: 'hepa1',   name: '甲肝减毒活疫苗 第 1 针',    month: 18, family: '甲肝类' },
  { key: 'jel2',    name: '乙脑减毒活疫苗 第 2 针',    month: 24, family: '乙脑类' },
  { key: 'mpsvac1', name: 'A 群 C 群流脑疫苗 第 1 针', month: 36, family: '流脑类' },
  { key: 'bopv2',   name: '脊灰减毒活疫苗 第 2 剂',    month: 48, family: '脊灰类' },
  { key: 'dtap5',   name: '百白破疫苗 第 5 针',        month: 72, family: '百白破类' },
  { key: 'mpsvac2', name: 'A 群 C 群流脑疫苗 第 2 针', month: 72, family: '流脑类' },
  // 2026 年版新增：双价 HPV 疫苗纳入免疫规划，对象为满 13 周岁女孩，2 剂次间隔 6 个月
  { key: 'hpv1',    name: '双价 HPV 疫苗 第 1 针（13 周岁女孩）', month: 156, family: 'HPV 类', label: '13 周岁' },
  { key: 'hpv2',    name: '双价 HPV 疫苗 第 2 针（13 周岁女孩）', month: 162, family: 'HPV 类', label: '第 1 针后 6 个月' },
]

// 月龄标签：0 → 出生时，24 → 2 岁，以此类推；剂次可自带 label 覆盖
export function monthLabel(m, dose) {
  if (dose?.label) return dose.label
  if (m === 0) return '出生时'
  if (m < 24) return `${m} 月龄`
  const y = m / 12
  return `${y} 岁`
}

// 到龄未打的剂次（doneKeys = 已接种 key 集合）
export function dueDoses(currentMonths, doneKeys) {
  if (currentMonths == null) return []
  return VACCINE_SCHEDULE.filter(d => d.month <= currentMonths && !doneKeys.has(d.key))
}

// 按月龄分组（保持程序表顺序），每组 { month, label, doses }
export function scheduleByMonth() {
  const groups = []
  for (const dose of VACCINE_SCHEDULE) {
    let g = groups[groups.length - 1]
    if (!g || g.month !== dose.month) {
      g = { month: dose.month, label: monthLabel(dose.month, dose), doses: [] }
      groups.push(g)
    }
    g.doses.push(dose)
  }
  return groups
}

// 按疫苗类别分组（参考官方接种记录样式：类别 → 剂次 → 日期）。
// 返回 [{ family, doses: [{ ...dose, shortName, ordinal, fullName, monthText }] }]
// - family 按首次出现顺序排列（卡介苗类 → 乙肝类 → 脊灰类 → …）
// - ordinal 为同名疫苗在该类别内的剂次序号（乙肝 ①②③、脊灰灭活 ①② / 减毒 ①② 分开编号）
// - fullName 直接沿用程序表里的 name，与历史写入健康档案的标题完全一致
export function scheduleByFamily() {
  const groups = []
  const byFamily = {}
  const counters = {}
  for (const d of VACCINE_SCHEDULE) {
    const shortName = d.name.replace(/\s*第\s*\d+\s*[针剂]\s*(（.*?）)?\s*$/, '')
    const ck = d.family + '|' + shortName
    counters[ck] = (counters[ck] || 0) + 1
    const dose = {
      ...d,
      shortName,
      ordinal: counters[ck],
      fullName: d.name,
      monthText: monthLabel(d.month, d),
    }
    if (!byFamily[d.family]) {
      byFamily[d.family] = { family: d.family, doses: [] }
      groups.push(byFamily[d.family])
    }
    byFamily[d.family].doses.push(dose)
  }
  return groups
}
