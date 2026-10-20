# 阶段 1 · 任务拆解（phase-1-task-breakdown）

> 前置：阶段 0 获用户确认。目标见任务书 1.1：可运行、可测试、离线的原生底座 + 迁移能力。**不含**分册/城堡等完整 UI（那是原生一期后半，见 feature-map 分期）。
> 技术栈（任务书第 3 节）：Kotlin、Compose、Room、DataStore、Coroutines、Coil（图片）、MPAndroidChart（二期图表）。minSdk 24（Android 7.0，与 Capacitor 版一致）；targetSdk 36。

## 工单列表（依赖顺序）

| # | 工单 | 内容 | 验收 | 依赖 |
| --- | --- | --- | --- | --- |
| T1 | 工程骨架 | `android-native/`：Kotlin+Compose+Gradle(Version Catalog)、包结构（ui/domain/data/backup/migration/security）、Debug 可构建可启动 | APK 装进模拟器显示空壳页；README 写构建命令 | — |
| T2 | Room 全模型 | 按 data-mapping 建 20+ 实体与 DAO；Schema 导出；Migration 测试框架；禁止 destructive | 单元测试：CRUD+重启保持+migration 用例 | T1 |
| T3 | 媒体存储 | MediaRepository：Photo Picker 导入、录音（MediaRecorder）、缩略图、SHA-256、删除引用检查、孤儿扫描 | 强杀重启后媒体可读；删日记不误删共享媒体；缺文件显示占位不崩溃 | T2 |
| T4 | 日记闭环 | 当天时间线（Compose LazyColumn）、写一页、七种贴纸录入、心情、日期切换 | 全流程离线走通（任务书 1.5 验收） | T2, T3 |
| T5 | v2 导入器 | 解析 v2 JSON→校验 checksum→repair 兜底→媒体落盘→Room 两段提交→完整性报告（条数/孤儿/校验） | 6 项测试（完整/重复/损坏/不兼容版本/空间不足/中途取消） | T2, T3 |
| T6 | v2 导出 | Room→v2 JSON（媒体内嵌 base64）+checksum；流式生成控制内存 | 导出→再导入 roundtrip 条数与 checksum 一致 | T2 |
| T7 | 安全接口 | SecurityPolicy 接口位 + Auto Backup 排除规则（dataExtractionRules）+ 日志脱敏检查 | adb backup 验证不含用户数据；权限清单仅 RECORD_AUDIO | T1 |
| T8 | 应用锁 | PIN（哈希存储）+ BiometricPrompt + 恢复码（对齐 PWA 语义） | 锁定/解锁/恢复码用例 | T1 |
| T9 | CI | GitHub Actions：android-native lint+test+assembleDebug；tag 出签名 release（沿用 CASTLE_* Secrets 与既有 keystore） | 流水线绿；签名指纹与现有一致 | T1 |
| T10 | 阶段 1 报告 | implementation-report / export-format-spec（v2 冻结说明）/ test-report | 按任务书 1.11 清单 | T1-T9 |

## 关键设计决定（阶段 0 已定，阶段 1 遵守）

1. **迁移格式 = v2 备份**（冻结；目录式 zip 不做，任务书 1.6 降级为可选）。
2. 旧字符串 id 直接作 Room String PK（零 id 转换）。
3. 全离线：不用任何联网 SDK；Coil 仅加载本地文件。
4. 与 PWA 双向互通：v2 导出必须能被 PWA dataCheck 校验通过（T6 的 roundtrip 测试用 PWA 端 checkBackup 逻辑做对照——可在 Node 中跑同一份测试数据）。

## 里程碑

- M1（T1-T3）：底座可跑，媒体可存。
- M2（T4-T6）：日记闭环 + 迁移双向通。
- M3（T7-T10）：安全与 CI 齐备，阶段 1 验收。
