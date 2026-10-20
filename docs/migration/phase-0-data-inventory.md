# 阶段 0 · 持久化数据盘点（phase-0-data-inventory）

> 底稿：DATA-01-数据存储审计报告（2026-10-14，逐行核对）。本版增量覆盖 v0.33→v0.40.1 改动（dayStates、日记一天多篇、createdAt 补齐、platform.js）。
> 主键口径：除 books[].reads、games[].plays、medicines[].logs、illnesses.temps/notes/visits 等嵌套子表外，全部集合条目有独立 `id`（uid() 生成）。

## 1. localStorage（单键 `castle-books-local-v1`，写入 store.js persistNow:145-184）

| Key（集合） | 结构要点 | 写入位置（函数） | 媒体引用 | 迁移方式 |
| --- | --- | --- | --- | --- |
| settings | childName/birthday/pronoun/onboarded/tts/ocrKey/lastExportAt/autoBackupAt/bookPrefaces/foodAllergies(嵌) | updateSettings 等 | 无 | 直接映射 ChildProfile+Settings |
| books | title/category/author/publisher/age/coverId/**reads[]**(time,minutes,note,id) | addBook/addRead:437 | coverId→covers | Book + ReadRecord（嵌套拆表） |
| words | word/kind(5类)/date/**createdAt(v0.39补)**/pinyin/meaning/mastered/funny/sourceBook/audioId | addWord:485 | audioId→covers(word-audio) | MemoryItem(语言类) |
| medicines | name/category/expireTime/openedTime/**logs[]**(mode,illnessId,time) | addMedicine/useMedicine | 无 | Medicine+MedLog |
| healths | date/kind/title/height/weight/doctor/hospital/notes | addHealth | 无 | HealthRecord |
| vaccines | 按 v2 疫苗表龄组记录 status/date/lot | setVaccine | 无 | VaccineRecord |
| meals | date/meal/food/firstTaste/tag/note/createdAt | addMeal:824 | 无 | TopicItem(饮食) |
| toys | name/category/buyDate/how | addToy | 无 | TopicItem(玩具) |
| milestones | date/title/source(日记/餐桌/游戏/相册)/photoId | addMilestone:813 | photoId→photos | Moment |
| photos | date/note/milestoneId/imageId | addPhoto:1050 | imageId→covers | MediaAsset+DiaryMediaRelation |
| trips | date/place/title/note/withWho/photoId/createdAt | addTrip:1087 | photoId | TopicItem(出行) |
| diaries | **一天可多条(v0.39)**：date/text/by/mood(遗留)/createdAt/updatedAt | addDiary/updateDiary:1140-1180 | 无 | DiaryEntry |
| dayStates | date/mood（v0.39 新增，按 date 唯一） | setDayMood:1190 | 无 | DayState |
| games | name/category/how/toyIds/**plays[]**(date,note,first,photoId,createdAt) | addGame/addPlay:1020 | photoId | TopicItem(游戏)+PlayRecord |
| foods | name/allergyNote | setFoodAllergy | 无 | ChildProfile 附属 |
| places | name/category | setPlaceCat | 无 | TopicItem(地点) |
| illnesses | start/end/symptoms[]/temps[]/notes[]/visits[]/moment | startIllness 等 | 无 | Illness（病程专用实体，含子表） |

## 2. IndexedDB（`castle-books` 库，covers 表，keyPath=id）

- 内容：`{ id, dataUrl }`——图片（压缩后 JPEG dataURL）与录音（webm/ogg dataURL，词库语音、她说录音）统一存放。
- 数据库版本 1，无索引（全量主键读取）。
- 关联方式：集合条目持 `coverId/imageId/audioId` 弱引用；**存在孤立风险**（删除条目不删媒体——v0.33 起导入时检测，运行时不清理）。
- 迁移方式：MediaAsset 逐条复制二进制+SHA-256 校验（v2 备份中为 base64 内联）。

## 3. 其他持久化来源

| 来源 | 内容 | 迁移相关性 |
| --- | --- | --- |
| sessionStorage `castle-diary-draft` | 写一页草稿（v0.39） | 不迁移（临时） |
| sessionStorage appLock 系列 | 锁屏凭据/恢复码（hash） | 不迁移（原生存期重建） |
| 备份文件（用户持有） | v2 JSON 自包含（含 covers base64 + checksum） | **迁移主通道**（见 export-audit） |
| File System Access 句柄 | 自动备份目录（仅桌面浏览器） | 不迁移（App 用分享面板替代） |
| PWA Service Worker 缓存 | 静态资源 | 不迁移 |

## 4. 待验证项

1. 真实用户数据中是否存在 v1 时代残留字段（applyState 兜底已兼容读取，映射器同样需兜底）——待用户真实备份文件验证。
2. 录音 dataURL 的 MIME 实际取值（浏览器相关）——待真实样本确认。
