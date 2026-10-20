# DATA-01 只读数据存储审计报告 —— castle-books（v0.32.0）

> 审计对象：`C:/Users/ilino/WorkBuddy/2026-09-24-16-55-43/家记-workspace/castle-books`
> 审计性质：只读（未修改任何被审计文件），为「v0.33 数据守护」迭代前置
> 审计日期：2026-10-14 ｜ APP_VERSION = `0.32.0`（src/store.js:11）

---

## 0. 总览：三层存储

| 层 | 位置 | 键 / 库表 | 内容 |
|---|---|---|---|
| 主数据 | localStorage | `castle-books-local-v1`（src/store.js:12） | 全部结构化数据（17 个集合 + settings），JSON 单键 |
| 媒体 | IndexedDB | 库 `castle-books` v1 / 表 `covers`（src/utils/idb.js:3-9） | `{id, dataUrl}` 图片与录音原图；另含特殊记录 `{id:'backup-dir', handle}`（自动备份目录句柄） |
| 独立键 | localStorage | `castle-diary-lock-v1` / `-throttle` / `-settings` / `-signal`（src/utils/appLock.js:14-17）；`castle-books-ocr-key`（src/utils/ocr.js:8）；`castle-books-tts-voice`（src/utils/tts.js:7） | 应用锁凭据/节流/策略/多标签信号、OCR key、TTS 音色。均不进主数据、不进备份 |

---

## 1. localStorage 主数据 `castle-books-local-v1`

### 1.1 顶层结构

`persistNow()`（src/store.js:148-181）写入的固定 17 个集合（src/store.js:150-168）：

```
{ settings, books, words, medicines, healths, vaccines, meals, toys,
  milestones, photos, trips, diaries, games, foods, places, illnesses, members }
```

写入时用 replacer `dropRuntime`（src/store.js:105-106）剔除运行时缓存键 `coverUrl / imageUrl / avatarUrl / audioUrl`（RUNTIME_KEYS，src/store.js:105），保证媒体 base64 不落 localStorage。

`applyState(s)`（src/store.js:189-207）逐集合 `s.xxx || []` 兜底；settings 默认 `{ childName:'', birthday: todayStr(), tts:true, ... }`（src/store.js:190）——注意 birthday 缺省值是**当天日期**，与 `buildSeed()` 的 `birthday:''`（src/store.js:40）不一致（见风险 R8）。

### 1.2 各集合记录字段（含媒体引用 id）

| 集合 | 字段（创建处） | 媒体/跨集合引用 |
|---|---|---|
| settings | childName, birthday, tts（种子 src/store.js:40）；seasonBg（src/App.vue:160）；lastExportAt（src/store.js:278）；autoBackupAt（src/store.js:339） | **avatarId**（src/store.js:1180） |
| books | id, title, author, publisher, category, age, reads[]（src/store.js:381）；reads 项 {id, time, minutes, scene, withWho, note}（src/store.js:423 + DiaryView.vue:657） | **coverId**（src/store.js:414） |
| words | id, word, kind, date, sourceBook, pinyin, meaning, mastered, funny（src/store.js:469-477）；audioMs（src/store.js:487） | **imageId**（:480）、**audioId**（:486） |
| medicines | id, name, spec, stock, unit, expiry, createdAt, logs[]（src/store.js:549-553）；logs 项 {mode:'in'或'use', time, note, illnessId?}（src/store.js:571-572） | illnessId（关联生病记） |
| healths | id, kind, date, title, note, height, weight, nextDate, createdAt（src/store.js:601-609） | 被 vaccines.healthId、illnesses.visits[].healthId 反引 |
| vaccines | id（=程序 key，如 dtap5）, name, date, healthId（src/store.js:653） | healthId |
| illnesses | id, start, end, symptoms[], temps[{time,value}], notes[{date,text}], visits[{date,healthId}], moment?（src/store.js:684, 704-735, 765） | visits[].healthId |
| milestones | id, date, title, source（src/store.js:788） | 被 games.plays[].milestoneId、photos.milestoneId 反引 |
| meals | id, date, meal, food, firstTaste, note, tag, createdAt（src/store.js:806-811） | — |
| foods | **无 id**：{name, groups, allergy, allergyNote, allergyDate}（src/store.js:848） | — |
| toys | id, name, category, link, playCount, lastPlayedAt, archived, createdAt（src/store.js:887-891） | **imageId**（src/store.js:912） |
| games | id, name, tags[], toyIds[], how, plays[], createdAt（src/store.js:957-963）；plays 项 {id, date, note, first, photoId?, milestoneId?}（src/store.js:1004-1008） | **imageId**（src/store.js:985）；plays[].photoId → photos.id；plays[].milestoneId → milestones.id |
| photos | id, date, note, milestoneId（src/store.js:1032-1036） | **imageId**（src/store.js:1039）；milestoneId |
| trips | id, date, place, title, note, withWho（src/store.js:1064） | **photoId** → photos.id（src/store.js:1065） |
| diaries | id, date, mood, text, by, updatedAt（src/store.js:1119-1125） | — |
| members | id, name, relation, color（src/store.js:1160-1164） | — |

### 1.3 保存链路

```
业务操作 → saveLocal()（src/store.js:183-187）
           ├─ clearTimeout + setTimeout(persistNow, 300)   ← 300ms 防抖
           └─ scheduleAutoBackup()（src/store.js:186, 348-352）← 8s 防抖触发自动备份
persistNow()（src/store.js:148-181）
  成功：清 storageError、更新 lastSavedAt（:173）、返回 true
  失败（QuotaExceeded 等）：console.warn + storageError 横幅提示（:176-178）、lastPersistFailed=true、返回 false
```

关键路径例外：**importBackup 与 markExported / runAutoBackup 直接调 persistNow() 不走防抖**（src/store.js:1460, 279, 341），这是 HANDOVER.md「导入必须立即落盘」踩坑记录的落实。

---

## 2. IndexedDB（src/utils/idb.js，全文 67 行）

- 库名 `castle-books`（:3），版本 `1`（:8），唯一对象仓库 `covers`，keyPath `id`（:9）。
- 每次操作独立 `open()` + `db.close()`，无连接复用（:6-13, 24-67）。

| 函数 | 签名 | 语义 |
|---|---|---|
| idbPutCover | `(cover:{id, dataUrl})` → Promise（:24-28） | put（同 key 覆盖），通用媒体写入，名字带 Cover 是历史遗留 |
| idbGet | `(id)` → 记录或 null（:30-40） | 单条读 |
| idbAllCovers | `()` → 全部记录数组（:42-52） | 启动时一次性加载全部媒体建 id→dataUrl 映射（含 'backup-dir' 记录，其 dataUrl 为 undefined，无害） |
| idbDelCover | `(id)`（:54-58） | 单条删除，删不存在 id 不报错 |
| idbClear | `()`（:61-67） | 清空前先捞出 `backup-dir` 句柄记录，clear 后放回——**自动备份句柄在清空/重置后存活** |

### putMedia 失败路径（src/store.js:129-145）

1. 首次 `idbPutCover` 失败且 `e.name==='QuotaExceededError'` 且 `dataUrl` 以 `data:image` 开头 → `compressDataUrl(dataUrl, 640, 0.55)`（src/utils/image.js:20-34）重压后重试一次，成功则提示"已自动压缩"；
2. 重压仍失败或**非图片（录音 data:audio/... 不享受重试）** → storageError 提示导出备份 + 删旧照片腾空间，返回 false。
3. **返回值仅 importBackup 检查（src/store.js:1456）；setBookCover / setWordImage / setToyImage / setGameImage / setAvatar / addWord / addPhoto 均忽略返回值**——见风险 R3/R4。

---

## 3. 媒体 ↔ 业务关联与删除清理

| 模块 | 引用字段 | 写入（换图模式） | 业务删除时媒体清理 |
|---|---|---|---|
| 书房封面 | books.coverId | setBookCover src/store.js:406-417：先删旧(:410) → putMedia(:413) → 赋新 id(:414) | removeBook :391 删 coverId |
| 词配图 | words.imageId | addWord :479-483（fire-and-forget）；setWordImage :534-543（先删旧:537） | removeWord :513 删 imageId |
| 词录音 | words.audioId | addWord :485-490（fire-and-forget）；setWordAudio :497-507（先删旧:500） | removeWord :514 删 audioId |
| 玩具图 | toys.imageId | setToyImage :906-915（先删旧:909） | removeToy :921 删 imageId |
| 游戏图 | games.imageId | setGameImage :979-988（先删旧:982） | removeGame :995 删 imageId（plays 的里程碑一起删 :994，**玩时照片留相册**，注释 :990） |
| 相册照片 | photos.imageId | addPhoto :1031-1046（fire-and-forget putMedia :1041） | removePhoto :1050 删 imageId |
| 头像 | settings.avatarId | setAvatar :1176-1188（先删旧:1177；传空则 delete 字段 :1184-1185） | 换头像时删旧 |
| 出行照片 | trips.photoId → photos.id | addTrip :1065 顺带 addPhoto | **removeTrip :1071-1074 不删照片**（照片留相册，有意设计） |
| 游戏玩次照片 | games.plays[].photoId → photos.id | addPlay :1005 顺带 addPhoto | **removePlay :1015-1023 不删照片**（注释 :1014 明示） |

### 悬空/孤立路径小结

- **误删方向**：removePhoto（:1048-1053）不检查 trips.photoId / games.plays[].photoId 引用 → 删除被引用的照片后，足迹册 `photoOf` 静默返回 ''（src/views/TripsView.vue:158-159），游戏玩次的 photoId 悬空。
- **孤立方向**：换图类函数"先删旧、后写新、忽略 putMedia 返回值"→ 写新失败时旧媒体已删且记录指向不存在的新 id（双向丢失）；addWord / addPhoto 不 await putMedia，记录已 saveLocal 而媒体未落盘即关页面 → 刷新后 imageId 悬空（imageUrl=null）。

---

## 4. 备份 / 导入 / 恢复全链路

### 4.1 导出 exportBackup（src/store.js:1327-1360）

```js
{ app:'castle-books', version:1, exportedAt,
  settings(去 avatarUrl, :1332), books(去 coverUrl, :1333), words(去 imageUrl/audioUrl, :1334),
  medicines, healths, vaccines, meals, toys(去 imageUrl, :1339), milestones,
  photos(去 imageUrl, :1341), trips, diaries, games(去 imageUrl, :1344),
  foods, places, illnesses, members,
  covers: [...] }
```

**covers 收集口径（:1349-1358）**：不从 IndexedDB 直读，而是从各集合的**运行时缓存字段**（coverUrl / imageUrl / audioUrl / avatarUrl）过滤 `id && url` 后拼装。这些缓存由 loadLocal 的 idbAllCovers 映射填充（:246-268）。手动导出入口 SettingsView.vue:238-247，导出后 markExported 记 lastExportAt（store.js:277-280）。

### 4.2 导入 importBackup（src/store.js:1364-1467，v0.27 事务化版本现状）

1. 格式判定：`data.app==='castle-books'` 新格式；或 castle-diary 旧格式（有 `baby` 字段）走字段映射（:1368-1443，照片借 covers 通道迁移 :1432-1441，photo.imageId 复用旧 p.id）；否则抛"备份文件格式不对"（:1445）。
2. 事务化（:1448-1465）：
   - `rollback = localStorage.getItem(LS_KEY)`（:1449）
   - `idbClear()` 清空媒体（:1453，保留 backup-dir）
   - 逐条 `putMedia(covers)`，失败计数，**任一失败即 throw**（:1455-1458）
   - `applyState` + `persistNow()` 立即落盘，失败 throw（:1459-1460）
   - catch：**仅回滚 localStorage**（:1463），抛"已恢复原数据"。
3. 词记录兜底补 `mastered:false`（:1451）。

> **重要缺陷**：回滚只恢复 localStorage 文本，IndexedDB 在 :1453 已被清空且**不恢复**。导入中途失败 = 旧封面/照片/录音永久丢失，与报错文案"已恢复原数据"不符。详见风险 R1。

### 4.3 自动备份（v0.18，File System Access API）

- 状态：`autoBackup = reactive({ supported: !!window.showDirectoryPicker, enabled, dirName, status, lastAt })`（src/store.js:285）；目录句柄以结构化克隆存 IndexedDB `backup-dir` 记录（:292, :308）。
- `enableAutoBackup()`（:306-314）：showDirectoryPicker → idbPutCover({id:'backup-dir', handle}) → 立即 runAutoBackup(true)。
- `initAutoBackup()`（:289-304）：启动时读句柄 → queryPermission → status='on' 或 'need-auth'。
- `resumeAutoBackup()`（:316-321）：requestPermission，恢复后立即补一次。
- `disableAutoBackup()`（:323-327）：idbDelCover('backup-dir')。
- `runAutoBackup(force)`（:329-346）：每天第一次有改动后写 `城堡日记-自动备份.json`（同一天跳过 :332-333）；成功后记 settings.autoBackupAt 并 persistNow；**失败仅 console.warn + status='need-auth'（:342-345），无界面提示**。
- `scheduleAutoBackup()`（:348-352）：由 saveLocal 调用（:186），8s 防抖。runAutoBackup 内部调 persistNow（:341）而非 saveLocal，无递归。
- `backupDaysAgo()`（:93-98）：取 max(lastExportAt, autoBackupAt)，日记页据此提醒（>14 天）。

### 4.4 主数据损坏恢复页

- loadLocal JSON.parse 失败 → `dataCorrupt.value = true`，**原文不动**（src/store.js:227-233）。
- 恢复页 src/App.vue:5-21：① downloadCorruptRaw 下载损坏原文副本（store.js:116-125）；② onCorruptImport 导入备份 → importBackup（失败自动回滚 localStorage，损坏原文仍在）→ reload（App.vue:185-196）；③ corruptReset → resetAll（App.vue:197-200）。

### 4.5 应用锁重建流程

- initAppLock（src/utils/appLock.js:46-65）：读 `castle-diary-lock-v1`；键缺失=未开启；键存在但校验不过 → `lock.corrupt=true`，fail-closed 进入"安全配置异常"。
- 锁屏页"用备份重建" AppLockOverlay.vue:252-268（doRebuild）：校验文件 → importBackup（原子化）→ 成功后 clearAppLock → reload；失败时数据与锁都原样保留。
- "重置本机数据" doReset（AppLockOverlay.vue:270-274）：resetAll(true) + clearAppLock + reload。
- 恢复码路径 unlockByRecovery（appLock.js:166-179）：非破坏性，校验通过后 setupPin 换新 PIN，旧恢复码即失效。
- resetAll（src/store.js:1317-1323）：removeItem(LS_KEY) → idbClear()（**保留 backup-dir 句柄**）→ clearAppLock → reload。

---

## 5. 初始化加载顺序

`init()`（src/store.js:354-365，模块顶层 :365 直接调用）：

```
1. await loadLocal()（:223-274）
   ├─ 读 LS_KEY；JSON 解析失败 → dataCorrupt=true，直接 return
   │   （注意：dataCorrupt 时 loadLocal 提前 return，但 init() 仍继续 initAutoBackup / 锁初始化 / ready=true，
   │    App.vue:2 与 :5 在 ready && lock.ready 后渲染恢复页）
   ├─ 无数据 → buildSeed + applyState + persistNow（:235-238，立即落盘）
   ├─ idbAllCovers → id→dataUrl 映射，填充 coverUrl / imageUrl / audioUrl / avatarUrl（:246-268；
   │   失败仅 console.warn :267，全部运行时 Url 留 null）
   └─ members 为空 → 补默认爸爸/妈妈 + persistNow（:270-273）
2. await initAutoBackup()（:356）
3. navigator.storage.persist() 申请持久化（:358-360，被拒仅 console.warn）
4. 动态 import appLock.js → initAppLock()（:361-362）
5. ready.value = true（:363）
```

- **关于 refreshToday / mergeDiaryIntoPhotos：当前代码库不存在这两个函数**（全仓 grep 0 命中）。日记页"今天的内容"是纯计算聚合：`diaryText.js` 的 dayContent（:200-201 按日期过滤 store.photos 等）与 monthIndex（:210-236），无持久化副作用；初始化阶段唯一的写副作用是种子落盘（store.js:238）与成员补齐（:272）。
- 版本迁移先例：`migrateVaccineKeys()`（src/store.js:211-221，2021 版"白破 dt" → 2026 版"百白破 dtap5"）**已定义但从未被调用**（:242-243 注释明示暂不自动执行），属死代码/备用迁移样例。

---

## 6. 已知风险清单

| # | 级别 | 位置 | 问题 | 复现条件 | 影响 |
|---|---|---|---|---|---|
| R1 | **高** | src/store.js:1453, 1463 | 导入回滚不完整：idbClear 清空媒体在先，失败时只回滚 localStorage，IndexedDB 旧媒体不恢复，但报错称"已恢复原数据" | 导入大备份时配额不足 / putMedia 任一失败 | 旧封面、照片、录音**永久丢失**，且用户被文案误导 |
| R2 | **高** | src/store.js:1349-1358 ← :246-268 | 导出 covers 口径依赖运行时缓存：loadLocal 的 idbAllCovers 失败（:267 仅 console.warn）→ 全部 Url=null → 备份静默不含任何媒体；lastExportAt 仍更新（:277-280） | IndexedDB 被禁用/损坏/隐私模式下导出 | 备份文件看着正常实则**丢全部图片录音**，14 天提醒也被重置 |
| R3 | **高** | src/store.js:409-416, 500-506, 537-542, 909-914, 982-987, 1177-1187 | 换图/换录音"先删旧 → putMedia(忽略返回值) → 赋新 id"：写新失败时旧媒体已删、记录指向不存在的 id | 配额不足时换封面/词图/玩具图/游戏图/头像/录音 | 媒体双向丢失 + 悬空引用，刷新后图片消失 |
| R4 | 中高 | src/store.js:482, 489, 1041 | addWord / addPhoto 不 await putMedia（fire-and-forget），记录已 saveLocal；媒体异步落盘完成前关页面 → imageId 悬空 | 上传大照片/长录音后立即关标签页 | 记录存在但图片/录音永远缺失，之后导出也不含（连锁 R2） |
| R5 | 中 | src/store.js:1048-1053 ← TripsView.vue:158-159, store.js:1005 | removePhoto 不检查 trips.photoId / games.plays[].photoId 引用 | 在相册/日记删除一张被出行或游戏玩次引用的照片 | 足迹册照片位静默空白，玩次 photoId 悬空（反向 removeTrip / removePlay 留照片是有意设计 :990, :1014） |
| R6 | 中 | src/store.js:1319 + idb.js:60-66 + store.js:186, 348-352 | resetAll 后 backup-dir 句柄存活；重建空数据后第一次 saveLocal 触发自动备份，用**空白数据覆盖**旧自动备份文件 | 清空重来后继续在同一浏览器使用且之前开过自动备份 | 清空前的最后一份自动备份被无声覆盖，找回数据的最后通道消失 |
| R7 | 中 | src/store.js:342-345, 330 | 自动备份失败静默：catch 仅 console.warn + status='need-auth'；status!=='on' 后每天 scheduleAutoBackup 触发 runAutoBackup 直接 return | 目录权限被系统/浏览器收回、磁盘写失败 | 长期无备份且主界面无任何提示（仅设置页可见 need-auth；backupDaysAgo 14 天后才在日记页间接暴露） |
| R8 | 中 | src/store.js:190 vs :40 | applyState 缺省 birthday=todayStr()，与 buildSeed 的 '' 不一致 | 导入缺 birthday 字段的备份（含 castle-diary 旧格式 baby.birthday 为空时 :1371） | 孩子生日被静默写成导入当天，污染 babyMonths(:630)、疫苗到龄提醒(:1219-1224)、babyAgeText |
| R9 | 中 | 全 store.js 无多标签同步；appLock.js:230-238 仅同步锁信号 | 两个标签页各自持有 store 副本，saveLocal 互相覆盖（后写赢） | 同浏览器开两个标签同时记录 | 先写标签的改动被无声覆盖丢失 |
| R10 | 低中 | src/store.js:35 | uid() = 'x'+base36(ms)+4 位随机（每毫秒约 168 万种）；castle-diary 导入复用旧 id（:1437 用 p.id 当 imageId） | 同毫秒批量生成 + 极端运气；或导入的旧 id 撞本机 uid | IDB 同 key put 覆盖 → 两条记录共享/互踩同一份媒体 |
| R11 | 低中 | src/store.js:1450-1458 | importBackup 不校验 covers 与业务记录 id 引用的匹配性 | 手工编辑过的备份 / R4 产生的缺媒体记录被导出后再导入 | 导入后 imageId 悬空（loadLocal map 查不到 → imageUrl=null，静默） |
| R12 | 低 | src/store.js:134 | putMedia 压缩重试仅限 data:image；录音（data:audio）配额失败直接丢失 | 配额接近满时录长音 | 录音丢失（有 storageError 提示，但记录已带 audioId 保存） |
| R13 | 低 | src/store.js:183-187 | saveLocal 300ms 防抖窗口内关页面丢最后一次改动（导入等关键路径已绕开，普通编辑未绕开） | 编辑后 300ms 内关标签 | 最后一次编辑丢失 |
| R14 | 低 | src/views/YearView.vue:122 | 读 `m.photoId`，但 milestone 记录无此字段（src/store.js:788）；照片挂里程碑是反向的 photo.milestoneId | 年度回顾"里程碑照片优先" | 该优先逻辑永不生效（展示 bug，非数据问题） |
| R15 | 低 | src/views/SettingsView.vue:239-241 | doExport 先 exportBackup 再 markExported → 本次备份文件里的 lastExportAt 是**上一次**的时间 | 每次手动导出 | 备份内时间戳口径偏差一格（轻微） |
| R16 | 观察项 | src/utils/idb.js:6-13, 24-67 | 每次操作独立 open/close，无连接复用；无 blocked/versionchange 处理 | 高频连续媒体操作；多版本并存（当前仅 v1） | 性能与极端并发下的健壮性 |
| R17 | 观察项 | src/store.js:211-221 | migrateVaccineKeys 为死代码（定义未调用）；未来启用时需注意只改 vaccines.id/name、不动 healthId 联动 | — | 迁移先例模板，v0.33 若加迁移可参照 |

### 与 v0.33「数据守护」直接相关的建议切入点（按优先级）

1. **R1**：importBackup 失败时媒体层快照/恢复（先把旧 covers 读到内存或延迟 idbClear 到全部校验通过后）。
2. **R2 / R11**：导出与导入前后做"引用完整性校验"（业务记录 id 引用 ↔ covers 实际存在的双向对账，启动时与导出前各跑一次）。
3. **R3 / R4**：putMedia 返回值纳入所有调用方；换图改"先写新成功后再删旧"；add 路径 await 或失败回滚记录字段。
4. **R6 / R7**：自动备份失败冒泡到 storageError 横幅；resetAll 时提示或同步清除 backup-dir。
5. **R5**：removePhoto 前检查 trips / games.plays 引用并提示。

---

## 附：审计覆盖的文件

| 文件 | 行数 | 覆盖内容 |
|---|---|---|
| src/store.js | 1467 | 全量逐行（主数据、媒体写入、备份导入导出、自动备份、init） |
| src/utils/idb.js | 67 | 全量逐行 |
| src/utils/appLock.js | 281 | 全量逐行（锁存储键、初始化、重建/清空） |
| src/App.vue | 300 | 全量逐行（损坏恢复页、锁挂载、init 消费） |
| src/components/AppLockOverlay.vue | 289 | 重建/重置/恢复码流程 |
| src/views/SettingsView.vue | 185-285 | 导出/导入/重置/自动备份开关入口 |
| src/views/DiaryView.vue | 640-730, 875-920 | 记词去重换录音、照片上传/删除入口 |
| src/views/YearView.vue | 110-131 | 里程碑照片口径（R14） |
| src/views/TripsView.vue | 158-159 | photoId 消费侧（R5） |
| src/views/AlbumView.vue | 88-155 | addPhoto / removePhoto 入口 |
| src/utils/image.js | 35 | compressImage / compressDataUrl |
| src/utils/diaryText.js | 200-236 | 日记聚合无副作用确认 |
| src/utils/ocr.js / tts.js | 局部 | 独立 localStorage 键 |
| HANDOVER.md | 全文 | 历史决策与踩坑（v0.27 导入立即落盘等） |

`dist/`（构建产物）、`node_modules/`、`scripts/check-season.mjs`（节气演示脚本）不含数据逻辑，未纳入逐行范围。
