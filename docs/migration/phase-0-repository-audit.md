# 阶段 0 · 仓库与开发环境审计（phase-0-repository-audit）

> 审计日期：2026-10-20　审计人：CodeBuddy（主开发会话）　分支：android（= main）
> 结论均来自实际代码；无法验证项标注"待确认"。

## 1. 技术栈（实测）

- Vue 3.5（Composition API，无路由库——自研 `view` ref + NAV 切换，App.vue:263-286）
- Vite 7 + vite-plugin-pwa（Service Worker 自动更新）
- 状态：单 `reactive` store（src/store.js:66-85），localStorage 单键 `castle-books-local-v1` 持久化（store.js:145-184，300ms 防抖）
- 媒体：IndexedDB `castle-books` 库 covers 表（id → dataUrl），图片经 compressImage 压缩后落库
- 测试：Vitest 39 条（dataCheck / appLock / diaryText 时间线纯函数）
- 版本：v0.40.1（2026-10-20）

## 2. 项目结构（实测）

```
src/
  store.js（~1450 行：状态、持久化、备份 v2、导入两段提交、17 集合 CRUD、生病/疫苗/提醒逻辑）
  utils/（diaryText 时间线、dataCheck 校验、appLock 应用锁、recorder 录音、image 压缩、
         monthCard/weeklyShare 海报生成、solarTerms 节气、vaccineSchedule 疫苗表、platform 平台层）
  views/（18 个视图）+ components/（CastleSvg 城堡、GrowthBook 成长书、Onboarding 引导等）
docs/migration/（本审计）
android/（Capacitor 8 工程，v0.40 冻结）
```

## 3. 构建与测试（实测命令）

| 命令 | 作用 | 结果 |
| --- | --- | --- |
| `npm test` | Vitest 39 条 | 全绿（2026-10-20） |
| `npm run build` | 网页版（含 SW） | ~2s |
| `npm run build:app` | App 版（无 SW） | ~2s |
| `npx cap sync android` | 同步 web 资产到 Capacitor | 正常 |
| GitHub Actions | deploy.yml（main→gh-pages）、android.yml（android 分支/v* 标签→签名 APK+模拟器冒烟） | 均通过（v0.40.0 标签实测） |

## 4. Android 相关现状

- **Capacitor 8 套壳版（android/）**：已完成并真机验收，**决策冻结**（2026-10-20 用户拍板转纯原生，理由：WebView 形态"不是纯正 Android"、真机布局 bug、长期体验）。云端打包流水线（android.yml）保留可用。
- **纯原生工程**：尚不存在。建议目录 `android-native/`（与 `android/` 并存，Gradle 工程互不干扰；原生一期验收后删除 `android/`）。待确认：是否拆独立仓库（建议不拆——迁移文档与导出代码需要同仓协作）。

## 5. 开发环境（实测）

- Node 22.22 / npm；无本地 JDK/Android SDK（云端打包路线）；Git Credential Manager 已存 PAT（2026-10-20）。
- 原生开发需：Android Studio（Koala+）或命令行 JDK 21 + SDK 36；CI 沿用 GitHub Actions（ubuntu runner 自带 SDK）。

## 6. 发现的问题

1. 网页版手机端 tabbar 平板样式穿透 bug——**已修**（v0.40.1，2026-10-20）。
2. store.js 单文件 1450 行，迁移映射时需按集合分块阅读（本次已全部读完并登记）。
3. Capacitor 版 WebView 内数据（localStorage/IndexedDB）原生无法直接读取——迁移路径依赖其设置页导出 v2 备份（见 export-audit）。

## 7. 后续建议

见 `phase-1-task-breakdown.md`。
