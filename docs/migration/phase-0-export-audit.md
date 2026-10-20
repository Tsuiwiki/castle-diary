# 阶段 0 · 导出能力审计（phase-0-export-audit）

> 结论先行：**现有 v2 备份已是"完整迁移包"**——单文件 JSON 自包含全部结构化数据+全部媒体（base64）+SHA-1 校验和。原生导入器直接解析 v2 即可，无需新建目录式 zip 格式（任务书 1.6 的格式降级为后续可选优化）。

## 1. v2 备份实测（2026-10-20，Node 22 实测，合成的 50 张 1280×960 高噪 JPEG ≈ 真实照片密度）

| 指标 | 数值 |
| --- | --- |
| 媒体总量 | 27.3 MB（50 张） |
| v2 JSON 总体积 | 36.5 MB（base64 膨胀 ~34%） |
| JSON.parse | 68 ms |
| JSON.stringify（重建导出） | 265 ms |
| base64 → 二进制解码 | 36 ms |
| 外推 200 张（~110 MB JSON） | parse 亚秒级；移动端需流式/分块，峰值内存预计 300–500 MB（列入风险） |

## 2. 完整性核对（代码级，已验证）

- **覆盖全部 17 集合 + dayStates + covers**：buildBackup（store.js:1380-1410）逐集合导出，媒体运行时字段（coverUrl/imageUrl/audioUrl）剔除、原始 dataUrl 保留 ✓
- **校验和**：checksumOf 对整包计算（dataCheck.js），导入前强校验 ✓
- **媒体缺失行为**：某 cover 读取失败 → 导出中止且**不更新 lastExportAt**（用户能察觉）✓
- **导入安全**：checkBackup 结构校验 + repairPayload 修补 + **两段提交**（先写 IndexedDB 媒体再写主数据，失败回滚快照并清理新写入媒体，store.js:1400-1440）✓
- **重复导入**：按 id 覆盖合并（repairPayload 规整），不产生重复条目；dayStates 按 date 去重 ✓
- **版本**：`version: 2`，dataCheck 拒绝非 2 版本 ✓

## 3. 需补充/转换项（原生侧）

1. **大包流式解析**：>50MB JSON 在移动端建议分块读取（kotlinx.serialization 流式或先 split 顶层键）；一期先整包 parse（100MB 内可行），二期优化。
2. **媒体落盘**：base64 → 二进制文件写入应用私有目录 + SHA-256 落库（MediaAsset.checksum）。
3. **WebView 存量数据**：Capacitor 版数据在 WebView 沙箱内，原生读不到——路径：Capacitor 版设置页「导出备份」（v0.40 已实现，走系统分享）→ 用户把 JSON 存到手机 → 原生导入。网页版同理。
4. **导出体验补齐（PWA 端，可选）**：设置页加一行说明"换手机到城堡日记 App：导出的备份文件直接在 App 里导入"。

## 4. 无法迁移的数据

- sessionStorage 草稿、应用锁凭据、自动备份目录句柄、SW 缓存——均为运行时数据，设计上不迁移。
- 除此之外**无无法迁移的数据**。

## 5. 结论

| 问题（任务书 0.5） | 答案 |
| --- | --- |
| 当前导出是否完整 | 是（v2 全量含媒体） |
| 可直接迁移 | 全部 17 集合+dayStates+covers |
| 需补充导出 | 无（可选：PWA 设置页加引导文案） |
| 需转换 | dataUrl→二进制文件；嵌套子表拆 Room 关联表 |
| 无法迁移及原因 | 仅运行时临时数据（设计上无需迁移） |
