# MindLoom · 夜笺

> **MindLoom · 夜笺** — 一款专为睡前冥想设计的极简桌面文本记录器。
> A minimal desktop journal crafted for the quiet moments before sleep.

一款用于辅助睡前冥想的极简文本记录器桌面 App。

- 主页面克制、有高级感的灰暗色调
- UI 默认完全隐藏，光标移近窗口边缘时浮现（顶部 / 左侧 / 底部）
- 6 种可切换背景：星空、雨夜、极光、雾气、纯色渐变、4-7-8 呼吸圆环
- 4 段程序化合成的环境音：雨声、风声、白噪、钵音（无外部资源依赖）
- 笔记 100% 本地：以 Markdown 文件存于本机应用数据目录（800ms 防抖自动保存），可导出 Markdown / JSON、从 JSON 备份导入、每日自动本地备份
- 基于 Tauri 2 + React 19 + TypeScript + Vite，桌面包体约 ~10 MB

## 环境要求

- Node.js 18+（项目使用 22 验证）
- Rust（`stable`，安装后会带 `cargo`）：[https://rustup.rs](https://rustup.rs)
- Windows 10+ 需 Microsoft Edge WebView2 Runtime（Win11 内置）
- 平台依赖参考：[Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

## 开发

```bash
npm install
npm run tauri dev
```

首次启动会编译 Rust 依赖（5–10 分钟），之后增量很快。

## 打包

```bash
npm run tauri build
```

产物位于 `src-tauri/target/release/bundle/`。

## 快捷键

| 键位 | 作用 |
| --- | --- |
| `Esc` | 强制显示 / 隐藏所有 UI |
| `Ctrl/Cmd + N` | 新建一条笔记 |
| `Ctrl/Cmd + S` | 立即落盘 |

## 目录结构

```
src/
├─ App.tsx                # 编排：背景层 + 编辑层 + 浮动 UI
├─ main.tsx
├─ store/                 # Zustand 状态（UI、笔记）
├─ storage/               # 存储层：文件后端（Tauri）/ Dexie 开发降级 / 迁移与备份
├─ db/                    # 旧 IndexedDB（仅迁移读取 + 浏览器开发降级）
├─ audio/                 # 程序化合成环境音
├─ components/
│  ├─ Editor.tsx          # 居中、无边框、纯文本编辑区
│  ├─ EdgeReveal.tsx      # 鼠标接近边缘 → 淡入子节点
│  ├─ TopBar.tsx          # 日期 / 字数 / 窗口控制
│  ├─ SideEntries.tsx     # 历史笔记侧栏
│  ├─ BottomDock.tsx      # 背景 / 音效 / 数据（导出、导入、位置）
│  ├─ BackgroundLayer.tsx # 6 个背景的交叉淡入切换
│  └─ backgrounds/        # 6 种背景实现
├─ utils/exporter.ts      # Markdown / JSON 导出、JSON 导入、打开数据目录
└─ styles/theme.css       # 灰暗色板 + 毛玻璃 token
docs/                     # 本地存储规范等文档
src-tauri/
└─ src/storage.rs         # 文件存储命令：笔记 / 设置 / 备份 / 回收站
```

## 隐私与数据存储

- **所有笔记 100% 本地，永不上云**：应用不发起任何网络请求，无遥测、无账号体系；生产构建启用严格 CSP，从机制上阻断任何外传通道。
- 笔记以 **Markdown 文件**（YAML frontmatter）存于本机应用数据目录（Windows：`%APPDATA%\com.mindloom.app\notes\`），UI 偏好存于同目录 `settings.json`；每日自动滚动备份到 `backups\`（保留 7 份）；删除先进 `.trash\` 保留 30 天。
- 旧版 IndexedDB 数据在首次启动时自动一次性迁移为文件（迁移前自动写 pre-migration 备份）。
- 底部 Dock「数据」组提供：导出 MD / JSON、从 JSON 备份导入、打开数据文件夹。
- 完整规范（目录布局、红线约束、生命周期保障）见 [docs/LOCAL_STORAGE_SPEC.md](docs/LOCAL_STORAGE_SPEC.md)。

## 性能 / 节能

- 所有 canvas 动画限制在 **30 fps**
- 窗口失焦或 Tab 隐藏时自动 `cancelAnimationFrame`，零 CPU
- 想最低能耗写作可切到「渐变」背景（零动画）
