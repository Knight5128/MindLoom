# MindLoom 本地存储规范（Local Storage Specification）

> 版本：v1.1（2026-07-19）——Phase 0 / A / B 已全部落地，第 1、2 节描述的即为当前实际状态。
> 适用范围：MindLoom 桌面端全部用户数据。
> 核心承诺：**所有笔记 100% 只存在用户本机，永不上云。**

---

## 0. 总原则

1. **零网络**：应用不发起任何网络请求。无遥测、无崩溃上报、无自动更新检查、无远程字体 / CDN 资源。所有背景与音效均为程序化生成，不依赖外部资源。
2. **避开云同步目录**：任何默认写入路径都不得落在 `Documents`、`Desktop`、`Downloads`、OneDrive、iCloud Drive 等目录。Windows 的「已知文件夹重定向」会把 Documents / Desktop 静默同步进 OneDrive——因此这两个目录被明确列为禁区。
3. **用户主权**：数据位置对用户可见、可打开、可整体拷走；提供导出与导入（恢复）；卸载应用不静默删除数据。
4. **正文零泄漏**：任何日志、错误信息、调试输出不得包含笔记正文，只允许出现长度、条数等统计量。
5. **明文优先，加密可选**：默认明文存储（便于用户自行备份与迁移）；端到端本地加密（口令派生密钥 + AES-GCM）作为未来的可选功能，不默认开启。

---

## 1. 数据清单与实际位置（现状 As-Is）

| 数据 | 载体 | Windows 实际磁盘位置 | 云同步风险 |
| --- | --- | --- | --- |
| 笔记正文 | Markdown 文件（YAML frontmatter） | `%APPDATA%\com.mindloom.app\notes\<YYYY>\` | 无（AppData 不被 OneDrive 同步）✅ |
| UI 偏好（背景 / 音效 / 音量 / 色板） | `settings.json` | `%APPDATA%\com.mindloom.app\settings.json` | 无 ✅ |
| 自动备份 | 每日全量 JSON，滚动 7 份 | `%APPDATA%\com.mindloom.app\backups\` | 无 ✅ |
| 软删除笔记 | 原文件加时间戳前缀，30 天后清除 | `%APPDATA%\com.mindloom.app\.trash\` | 无 ✅ |
| 迁移状态 | `meta.json`（schema 版本、迁移标记） | `%APPDATA%\com.mindloom.app\meta.json` | 无 ✅ |
| 旧数据（只读遗留） | IndexedDB `mindloom`（迁移来源，已停用） | `%LOCALAPPDATA%\com.mindloom.app\EBWebView\Default\IndexedDB\` | 无 ✅ |
| 导出文件（.md / .json） | 用户经系统「另存为」对话框自选路径 | 用户自选 | 用户若选到 OneDrive 目录会上云——属用户自主行为，应用不拦截 |

macOS / Linux 数据根目录对应：

- macOS：`~/Library/Application Support/com.mindloom.app/`
- Linux：`~/.local/share/com.mindloom.app/`

首次启动时旧 IndexedDB 数据自动一次性迁移为文件（空白笔记跳过），迁移前先写 `backups/pre-migration-*.json` 全量备份，完成后在 `meta.json` 记录标记，IndexedDB 即不再读写（浏览器 `npm run dev` 开发模式除外——无 Tauri 环境时降级用 Dexie，仅供开发预览）。

---

## 2. 目录布局

全部用户数据集中在 Tauri `appDataDir()`（Windows 即 `%APPDATA%\com.mindloom.app\`，Roaming 但**不经任何云服务**，仅域环境漫游，个人电脑等同本地）：

```
%APPDATA%\com.mindloom.app\
├─ notes\                      # 笔记正文：一条一个 Markdown 文件
│   └─ 2026\
│       └─ 2026-07-19_2310_a1b2.md
├─ backups\                    # 自动滚动备份：每日一份全量 JSON，保留 7 份
│   └─ mindloom-backup-20260719.json
├─ .trash\                     # 软删除区：删除的笔记移入此处，保留 30 天
├─ settings.json               # UI 偏好（替代 localStorage）
└─ meta.json                   # schema 版本、迁移状态标记
```

笔记文件格式（YAML frontmatter + 正文）：

```markdown
---
id: a1b2
createdAt: 2026-07-19T23:10:00+08:00
updatedAt: 2026-07-19T23:42:00+08:00
mood:
tags: []
---

（正文）
```

选型说明：

- **首选纯 Markdown 文件**而非 SQLite：人类可读、可被任何编辑器打开、可整目录拷走、天然抗数据库损坏。当前产品形态（单人、低频写入、条目量小）没有 SQLite 的必要。
- IndexedDB 在迁移完成后**彻底退役**（不做双写镜像，避免两份真相）。

---

## 3. 红线（MUST NOT）——均已落地

1. 不得将 `Documents` / `Desktop` / `Downloads` / 任何云同步目录作为**默认**存储或备份路径。
2. 不得新增任何发起网络请求的依赖或代码路径。若未来引入 updater，必须显式征得用户同意，且只传输版本号。
3. 生产构建启用严格 CSP（`devCsp` 为空以保留 Vite HMR）：
   `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src ipc: http://ipc.localhost; media-src 'self'`
   ——从机制上保证即使前端被注入代码也无法外传笔记内容。
4. 文件读写不暴露给 WebView 通用能力：`tauri-plugin-fs` 已移除，所有磁盘 IO 集中在应用自有 Rust 命令（`src-tauri/src/storage.rs`），仅覆盖 appdata 目录与用户经对话框显式选择的导入 / 导出路径。
5. 日志与错误上下文不得包含笔记正文。
6. `tauri-plugin-single-instance` 已启用，防止双实例并发写同一份数据。

---

## 4. 数据生命周期保障

| 环节 | 规范 | 状态 |
| --- | --- | --- |
| 自动保存 | 输入 800ms 防抖落盘 | ✅ |
| 关窗落盘 | 关窗走 Tauri `onCloseRequested` → `await flush()` → 再关闭 | 随「沉浸感改进 A2」落地 |
| 备份 | 每日首次启动时向 `backups\` 生成全量 JSON 快照，滚动保留 7 份 | ✅ |
| 导入 / 恢复 | 支持从备份 / 导出 JSON 一键导入，按（创建时间, 内容）去重 | ✅ |
| 删除 | 删除 = 移入 `.trash\`，保留 30 天后启动时自动清除 | ✅ |
| 卸载 | 不静默删除用户数据；Dock「数据 → 位置」可打开数据文件夹，便于卸载前自行带走 | ✅ |

---

## 5. 迁移路线（已全部完成，留档）

- **Phase 0**：收紧 CSP 与文件能力；补充本文档。✅
- **Phase A**：偏好迁到 `settings.json`；每日自动备份与 JSON 导入。✅
- **Phase B**：笔记文件化——启动时检测 IndexedDB 旧数据，一次性迁移到 `notes\`（前置 pre-migration 备份），成功后在 `meta.json` 写标记并停用 Dexie（浏览器开发模式降级除外）。✅
