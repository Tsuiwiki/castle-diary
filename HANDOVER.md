# 城堡绘本识字（castle-books）交接文档

> 版本：v0.1.0 ｜ 撰写日期：2026-10-09
> 项目路径：`家记-workspace/castle-books/`
> 一句话定位：从「城堡日记」拆分出来的**绘本 + 识字**轻量网站——读绘本、沉淀词语、卡片巩固。

---

## 一、需求背景与设计决策

### 1.1 为什么拆分

母项目 castle-diary（城堡日记 App）是家庭成长档案（Vue3 + PWA + Capacitor APK），功能已膨胀到 7+ 模块（时间线/语言成长/书房/玩具屋/药箱/健康/餐桌/出行/相册/周报/成员权限等）。绘本阅读与识字是其中使用频率最高、且最适合在电脑大屏上操作（家长整理书目、陪孩子翻卡）的一条线，于 **2026-10-08 决策拆分为独立项目**，原 castle-diary 仓库不动。

### 1.2 核心设计决策（用户逐条确认）

| # | 决策点 | 结论 | 理由 |
|---|--------|------|------|
| 1 | 部署形态 | **纯静态托管**，无后端、无账号 | 个人/家庭自用，免去服务器维护；打开即用 |
| 2 | 数据存储 | **浏览器本地**：localStorage（结构化数据）+ IndexedDB（封面原图） | localStorage 约 5MB 放不下图片，故分层；数据 100% 留在本机 |
| 3 | 跨设备迁移 | **导出/导入 JSON 备份**（封面内嵌 base64） | 无后端下的唯一迁移通道 |
| 4 | 内容来源 | **家长拍照上传为主**，OCR.space 前端直连识别书名 | OCR.space 支持 CORS，免后端代理 |
| 5 | 设备优先级 | **电脑大屏优先**，左侧边栏布局（1023/767 断点降级） | 整理书目、翻卡陪学都在电脑上进行 |
| 6 | 识字首发范围 | **只做翻卡**（flashcard），不做听写/评测 | 控制首发范围，先跑通闭环 |
| 7 | 词掌握度模型 | **二元 mastered**（认识/不认识），不做多级分级 | 简单可靠，孩子状态一眼看清 |
| 8 | 数据兼容 | **兼容导入 castle-diary 旧备份**（只抽 books/words） | 老用户的绘本和词库不丢失 |

### 1.3 范围裁剪

从 castle-diary 的 store.js 砍掉约 60%：events（时间线）、members（成员权限）、reminders（提醒）、toys/medicines/health/diet/outings/photos 等全部移除，只保留 **books / words / settings** 三个集合。OCR 模块去掉「在线走后端 /api/ocr」分支，只留前端直连。

---

## 二、功能清单（与实现一一对应）

| 模块 | 功能 | 实现位置 |
|------|------|----------|
| 书房 | 封面宫格书架、新书上架（拍照/传图 + OCR 识别书名回填）、近 14 天阅读趋势 SVG 柱状图 | `views/ShelfView.vue` |
| 书籍详情 | 双栏布局、快速记阅读（时长/日期）、内联录词（sourceBook 自动关联本书）、阅读历史、移出书房 | `views/BookView.vue` |
| 识字 | 词库表格、筛选（类型 5 类 / 来源书 / 掌握状态）、hover 删除、**双击切换 mastered** | `views/WordsView.vue` |
| 翻卡 | 翻卡队列：不熟的词插队尾重出、认识了标 mastered；键盘操作（空格翻面 / ←→ 切换 / Esc 退出） | `components/WordCardSheet.vue` |
| 设置 | 孩子档案（名字/生日）、导出 JSON（封面内嵌）、导入（兼容旧备份）、自定义 OCR key、清空数据 | `views/SettingsView.vue` |
| 框架 | 左侧边栏导航、响应式断点、PWA 离线缓存 | `App.vue` / `styles.css` / `vite.config.js` |

词类型：`发音 / 词语 / 识字 / 句子 / 歌谣`（`WORD_KINDS`）；绘本分类：`动物 / 情感 / 认知 / 自然 / 交通 / 习惯 / 其他`（`BOOK_CATEGORIES`）。

---

## 三、技术架构

```
纯静态 SPA（Vue 3 + Vite 6 + vite-plugin-pwa）
│
├── 数据层 store.js（Vue reactive，视图只读）
│   ├── 结构化数据 → localStorage「castle-books-local-v1」（300ms 防抖落盘）
│   └── 封面原图   → IndexedDB「castle-books / covers 表」（{id, dataUrl}）
│       （运行时把 coverId 映射成 coverUrl 挂到 book 上，仅渲染用，不落 LS）
│
├── OCR utils/ocr.js
│   └── 前端直连 https://api.ocr.space/parse/image（chs + OCREngine 2 + 25s 超时）
│       默认 demo key「helloworld」（有限流）；设置页可填自有 key（免费 25k 次/月）
│
└── PWA vite-plugin-pwa（generateSW，autoUpdate）
    manifest：城堡绘本识字 / theme #f0934b / standalone
```

**关键设计：**
- **无构建时后端依赖**：任何静态托管（GitHub Pages / Cloudflare Pages / WorkBuddy 托管）都能跑。
- **封面双存储**：setBookCover 时旧 coverId 先删后写；导出时封面从 IndexedDB 内嵌 base64 进 JSON，导入时还原。
- **导入兼容**：`importBackup` 识别 `app==='castle-books'` 新格式与 castle-diary 旧格式（有 `baby` 字段）；旧格式只抽 books/words，**words 兜底补 `mastered:false`**；封面不迁移（旧备份 photos 与书无对应关系）。导入是关键操作，**立即落盘不走防抖**。

---

## 四、数据模型

```js
settings: { childName: '', birthday: 'YYYY-MM-DD' }

book: {
  id, title, author, publisher, category, age,
  reads: [{ time: 'YYYY-MM-DDTHH:mm', minutes }],  // 新的在前（unshift）
  coverId,          // 持久化：指向 IndexedDB
  coverUrl,         // 运行时：渲染用，不落盘不导出
}

word: {
  id, word, kind,   // WORD_KINDS 之一
  date,             // 首次录入日期
  sourceBook,       // 来源书名（书籍详情页录词时自动关联）或 null
  mastered: false,  // 二元掌握度，双击/翻卡切换
}
```

备份 JSON：`{ app:'castle-books', version:1, exportedAt, settings, books(去coverUrl), words, covers:[{id,dataUrl}] }`

---

## 五、文件地图（全项目约 1660 行）

```
castle-books/
├── index.html
├── package.json            # vue@3.5 / vite@6 / vite-plugin-pwa@0.21
├── vite.config.js          # PWA 配置 + dev server 0.0.0.0:5174
├── public/                 # icon.svg 等
└── src/
    ├── main.js
    ├── App.vue             (58)  左侧边栏导航骨架
    ├── store.js            (254) 数据层：books/words/settings + 导入导出
    ├── styles.css          (386) 亮橙品牌色 #f0934b，1023/767 断点
    ├── utils/
    │   ├── idb.js          (52)  IndexedDB 极简封装（covers 表）
    │   ├── ocr.js          (40)  OCR.space 直连 + key 管理
    │   ├── image.js        (17)  图片压缩（canvas）
    │   └── longpress.js    (44)  长按指令（600ms，遗留自 castle-diary）
    ├── components/
    │   ├── Icon.vue        (67)  线性 SVG 图标
    │   └── WordCardSheet.vue(134) 翻卡面板
    └── views/
        ├── ShelfView.vue   (191) 书房首页
        ├── BookView.vue    (153) 书籍详情
        ├── WordsView.vue   (141) 词库
        └── SettingsView.vue(124) 设置
```

---

## 六、实现过程（S1-S6）

| 阶段 | 内容 | 状态 |
|------|------|------|
| S1 | 项目骨架：从 castle-diary 复制改造，store.js 裁剪 60% 至 books/words/settings | ✅ |
| S2 | 存储层：idb.js 改 covers 表；ocr.js 去在线分支留直连 + 自定义 key | ✅ |
| S3 | 布局：styles.css 删 .phone 手机壳，改左侧边栏大屏布局（1023/767 断点）；App.vue 边栏导航 | ✅ |
| S4 | 四大视图：ShelfView / BookView / WordsView / SettingsView + WordCardSheet 翻卡 | ✅ |
| S5 | 备份兼容：导入兼容 castle-diary 旧格式，words 兜底 mastered:false | ✅ |
| S6 | 构建验证：vite build 通过（25 模块 915ms，gzip JS 41KB），PWA sw.js 生成，翻卡/OCR/导出/mastered 等语义文案验证进包 | ✅ 2026-10-09 |
| S7 | 部署上线：候选 GitHub Pages / Cloudflare Pages / WorkBuddy 托管链接 | ⏳ 待定 |
| S8 | 可选增强：TTS 听音、看字选图、ReadingMap 阅读地图 | ⏳ 未排期 |

计划文件：`C:\Users\ilino\.workbuddy\plans\quantum-beacon-lovelace-C6sUSkFO.md`

---

## 七、踩坑记录（重要）

1. **沙箱拦 node 子进程 spawn（EBUSY）**：`npm install` 时 esbuild postinstall 的 `spawnSync node.exe` 被沙箱拦截报错。
   **解法**：`npm install --ignore-scripts --registry=https://registry.npmmirror.com`（esbuild 0.25.12 跳过 postinstall 也能正常工作）；跑脚本统一 `NODE_OPTIONS= npm run build`。
2. **WordCardSheet 键盘监听只挂 window**：不要同时挂 div @keydown + window，会双触发。
3. **构建产物 minify 后按语义文案 grep 验证**（如「翻卡」「mastered」），不要按函数名。
4. **导入必须立即落盘**：persistNow() 直接调，不走 300ms 防抖（防抖窗口内关页面会丢导入数据）。
5. **coverUrl 是运行时缓存**：导出时剔除，导入后由 IndexedDB 重建。

---

## 八、运维手册

```bash
cd 家记-workspace/castle-books

# 装依赖（沙箱环境必须加 --ignore-scripts）
NODE_OPTIONS= npm install --ignore-scripts --registry=https://registry.npmmirror.com

# 开发（0.0.0.0:5174，局域网手机可访问）
NODE_OPTIONS= npm run dev

# 构建 → dist/（纯静态，含 PWA）
NODE_OPTIONS= npm run build

# 本地预览构建产物
NODE_OPTIONS= npx vite preview --port 4173 --host 127.0.0.1
```

**部署**：dist/ 是纯静态目录，扔到任意静态托管即可。PWA 需 HTTPS（localhost 除外）才能注册 Service Worker。

**数据安全**：用户数据只存在浏览器里，清浏览器数据 = 丢数据。引导用户定期在「设置 → 导出备份」。

---

## 九、待办与下一步

- [ ] **S7 部署**：确认托管方（WorkBuddy 托管链接最快；GitHub/Cloudflare Pages 适合长期），注意手机蜂窝网络曾遇 21.x 段 IP 路由黑洞，电脑使用无影响
- [ ] **S8 可选增强**：TTS 听音（翻卡念词）、看字选图、ReadingMap 阅读地图（castle-diary 里有现成实现可参考）
- [ ] 真实数据回归：从 castle-diary 导出旧备份 → castle-books 导入，核对 books/words 完整性
