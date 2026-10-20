# 阶段 0 · 新旧数据映射（phase-0-data-mapping）

> 旧=PWA v2 备份（17 集合+dayStates+covers）；新=Android Room。规则：旧 id 全保留作主键；未知字段进 `extra` JSON 兜底列；原始时间信息（createdAt/updatedAt/date）全保留。

## 1. 核心实体映射

| 旧 | 新（Room 实体） | 转换规则 | 风险 |
| --- | --- | --- | --- |
| diaries[] | **DiaryEntry**（id PK, date, text, by, moodlegacy, createdAt, updatedAt, schemaVersion） | 直接映射；一天多条天然支持；mood 字段保留为 legacy（读路径走 DayState 回退） | 无 createdAt 的旧条目→sortKey 回退 updatedAt |
| dayStates[] | **DayState**（date 唯一索引, mood） | 直接映射；date 重复保留首条 | 无 |
| covers[]（dataUrl） | **MediaAsset**（id PK, kind=image/audio, relativePath, mimeType, sizeBytes, sha256, createdAt） | base64 解码→私有目录文件；`files/media/yyyy-MM/id.ext` | 大包内存（流式）；损坏文件→导入报错不静默 |
| photos[] | **MediaRelation**（diary 侧弱关联）+ 引用 MediaAsset(imageId) | photo 与 DiaryEntry 不强绑（当天弱关联，与 PWA 一致）；milestoneId→Moment.photoId | 孤立媒体→导入后完整性检查列出 |
| meals/trips/foods/places/toys | **TopicItem**（id, kind=meal/trip/food/place/toy, date, payload JSON 字段列, createdAt） | 专用列放高频查询字段（date/kind/firstTaste），其余进 payload | "不做单一大 JSON 字段"原则：payload 只收低频展示字段 |
| words[] | **MemoryItem**（kind 保留原值含"识字"；funny/pinyin/meaning/mastered 列化；audioId→MediaAsset） | 直接映射 | 无 |
| milestones[] | **Moment**（date, title, source, photoId） | 直接映射 | source='餐桌'/'游戏' 自动条目照旧（视图层过滤） |
| books[] + books[].reads[] | **Book** + **ReadRecord**（bookId FK, time, minutes, note） | 嵌套拆表，read.id 保留 | 旧 read 无 id 的→生成并存 idMap |
| games[] + plays[] | **Game** + **PlayRecord**（FK, date, note, first, photoId） | 同上 | 无 |
| medicines[] + logs[] | **Medicine** + **MedLog** | 同上 | 无 |
| illnesses[]（含 temps/notes/visits 子表） | **Illness** + 三张子表（FK） | 病程专用实体（任务书要求不并入通用表） | 无 |
| healths[] / vaccines[] | **HealthRecord** / **VaccineRecord** | 疫苗表结构随 PWA v2 口径 | 无 |
| settings / members / foods(过敏) | **ChildProfile** / **Member** / **AllergyNote** | settings 拆档案与偏好（DataStore 存偏好） | 无 |

## 2. 关联与完整性

- 全部 FK 建索引；Room Migration 版本化，禁止 destructive migration。
- 导入后完整性检查（阶段 1 任务 G）：条数对比（逐集合）、媒体引用可达性、孤儿媒体清单、checksum 抽验。
- idMap：旧字符串 id 即新主键（String PK），无需映射表——**零 id 转换风险**。

## 3. 空值/异常/重复策略

- applyState 式兜底移植：读入时逐实体补默认值（reads/plays/logs/temps/notes/visits 空数组等，参照 store.js:199-230）。
- 重复 id：后到覆盖先到（与 PWA repairPayload 一致）；dayStates 按 date 去重。
- 损坏 JSON：导入前 checksum 校验失败即拒绝（fail-closed，同 PWA）。
