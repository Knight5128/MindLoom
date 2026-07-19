# MindLoom 沉浸感改进 SPEC（B4–D13 待实现清单）

> 版本：v1（2026-07-19）
> 背景：13 项沉浸感改进中，A 组（A1–A3）与 Phase B 存储收紧已全部落地并提交；本文档承接剩余 **B4–D13 共 10 项**，作为后续会话的实施依据。
> 约定：每完成一项 → 按 CLAUDE.md 提交规范单独 commit；影响用户可见行为的同步更新 README；测试基线 = `npm run build`（tsc + vite）通过 + `cargo check` 通过（涉及 Rust 时）+ 浏览器 `npm run dev` 或 `npm run tauri dev` 行为验证。

## 已完成（留档，勿重复实现）

| 项 | 内容 | Commit |
| --- | --- | --- |
| Phase B | 笔记文件化存储 + 迁移 + 备份 + 回收站 + 导入 + CSP/能力收紧 + 单实例 | `8f69208` |
| A1 | 惰性建笔记（敲第一个字才落盘，杜绝空白条目堆积） | `7eee623` |
| A2 | 关窗拦截 → `await flush()` → 再关（消除丢字风险） | `c092a71` |
| A3 | 关闭 = 隐藏到托盘；托盘退出先 flush（2s 兜底强退） | `5e1758f` |

---

## B. 写作沉浸

### B4 打字机模式（光标行垂直居中）

- **目标**：书写时光标所在行始终保持在屏幕垂直中线附近，视线不随文本增长下移。
- **实现要点**（[src/components/Editor.tsx](../src/components/Editor.tsx)）：
  - 镜像测量法：隐藏 div 复制 textarea 的计算样式（`getComputedStyle`：font、lineHeight、letterSpacing、宽度），内容取 `value.slice(0, selectionStart) + "​"`，其 `scrollHeight` ≈ 光标底部 Y。
  - 目标滚动：外层滚动容器（现有 `overflow-y-auto` div）`scrollTo({ top: caretY + textareaOffsetTop - clientHeight/2, behavior: "smooth" })`，rAF 节流。
  - 容器 padding 改 `pt-[18vh] pb-[50vh]`，保证末行也能居中。
  - 触发：input / keyup / click（选区移动）+ content 变化 effect；注意 B7 字号可变，样式须每次实时读取。
- **验收**：连续输入 30+ 行，光标始终在屏幕中部区域；点击文中任意位置后继续输入同样居中。
- **建议 commit**：`feat: typewriter mode keeps caret line vertically centered while writing`

### B5 打字即静默（隐藏鼠标指针与全部 UI）

- **目标**：敲键瞬间隐藏鼠标指针并收起所有边缘 UI；动鼠标即恢复。
- **实现要点**：
  - [useUiStore](../src/store/useUiStore.ts) 增加非持久化 `typing: boolean` + `setTyping`。
  - [App.tsx](../src/App.tsx)：全局 keydown（排除 Esc / 快捷键组合）→ `setTyping(true)`；全局 mousemove → `setTyping(false)`。
  - [EdgeReveal.tsx](../src/components/EdgeReveal.tsx)：`visible = force || (!typing && (near || hovering))`。
  - [theme.css](../src/styles/theme.css)：`.ml-typing, .ml-typing * { cursor: none !important; }`，App 根据 typing 给 `document.body` 挂/摘该 class。
- **验收**：输入时指针消失、顶栏/侧栏/底栏全部淡出；移动鼠标后恢复；Esc 强制显示不受影响。
- **建议 commit**：`feat: hide mouse cursor and edge ui while typing, restore on mouse move`

### B6 「烛光」暖色主题

- **目标**：提供琥珀暖色变体（睡前减蓝光），与现有冷灰蓝「冷雾」二选一，持久化。
- **实现要点**：
  - settings 增加 `theme: "mist" | "candle"`（[useUiStore](../src/store/useUiStore.ts) `Settings` + `normalize` + persist）。
  - [theme.css](../src/styles/theme.css)：`:root[data-theme="candle"]` 覆盖 token（参考值：`--bg-base: oklch(0.17 0.02 70)`、`--fg-1: oklch(0.92 0.02 85)`、`--fg-2/3/faint` 同色相降亮度、`--accent: oklch(0.78 0.09 70)`）。
  - App effect：`document.documentElement.dataset.theme = theme`。
  - [BottomDock](../src/components/BottomDock.tsx) 新增「色调」组：冷雾 / 烛光。
  - 背景 canvas 色不随主题变（可接受，仅 UI/文字/毛玻璃变暖）。
- **验收**：切换立即生效、重启保留；README 功能列表补充。
- **建议 commit**：`feat: add warm candlelight theme variant persisted in settings`

### B7 全屏 + 字号 / 行宽调节

- **目标**：F11 全屏沉浸；字号 小/中/大（16/18/20px）、行宽 窄/中/宽（560/640/760px）。
- **实现要点**：
  - settings 增加 `fontSize: "s"|"m"|"l"`、`lineWidth: "narrow"|"medium"|"wide"`。
  - [Editor.tsx](../src/components/Editor.tsx)：从 store 读值映射到 `fontSize` 与 `maxWidth`。
  - App keydown：F11 → Tauri `getCurrentWindow().setFullscreen(!await isFullscreen())`，浏览器降级 `requestFullscreen/exitFullscreen`；Esc 在全屏时优先退出全屏（异步查 isFullscreen 后分支），否则维持原「强制显示 UI」语义。
  - capabilities 增加 `core:window:allow-set-fullscreen`、`core:window:allow-is-fullscreen`。
  - BottomDock 新增「文字」组（两组三态按钮）。
  - README 快捷键表补 F11。
- **验收**：F11 进出全屏；字号/行宽即时生效且重启保留。
- **建议 commit**：`feat: fullscreen toggle on f11, adjustable font size and line width persisted in settings`

---

## C. 仪式感

### C8 「晚安」收笔仪式

- **目标**：Ctrl+Enter（或 Dock「晚安」按钮）→ 落盘 → 全屏浮层显示「晚安 · 今晚 N 字 · 连续 X 天」→ 缓慢淡出 → 隐藏到托盘。
- **实现要点**：
  - 新建 `src/components/NightRitual.tsx` 浮层（z-40，风格参照启动引导语动画）。
  - 新建 `src/utils/streak.ts`：`tonightChars(entries)` = 今日所有非空笔记字数和；`streakDays(entries)` = 以今天为终点的连续有记录天数（按 `createdAtMs` 本地日期去重）。
  - App keydown 增 Ctrl/Cmd+Enter：`await flush()` → 显示浮层 ~4.5s → `isTauri()` 时 `getCurrentWindow().hide()`，浮层状态复位。
  - BottomDock 增「晚安」按钮（可并入「数据」组左侧或独立组）。
  - README 快捷键表补 Ctrl+Enter。
- **验收**：浮层数字正确（含今晚多条笔记求和）；隐藏后从托盘唤回不再显示浮层。
- **建议 commit**：`feat: goodnight ritual on ctrl+enter showing tonight chars and streak, then hide to tray`

### C9 时间感知问候语 + 轮换 placeholder

- **目标**：启动引导语随时段变化；编辑器 placeholder 从温和引导语池中随机。
- **实现要点**：
  - 新建 `src/utils/prompts.ts`：`greetingForNow()` 按小时分段（5–11 / 11–18 / 18–23 / 23–5）各备 2–3 句随机；`pickPlaceholder()` 引导语池 ≥6 句（如「今天有什么想放下的？」「此刻心里最重的一件事是？」）。
  - [App.tsx](../src/App.tsx) 启动引导语与 [Editor.tsx](../src/components/Editor.tsx) placeholder 分别取用（`useState(() => pick…)` 每次启动/新草稿随机一次）。
- **验收**：不同时段启动文案不同；placeholder 每次启动可能不同。
- **建议 commit**：`feat: time-aware greeting lines and rotating gentle editor placeholders`

### C10 助眠定时器（环境音渐弱停止）

- **目标**：15 / 30 分钟后环境音自动渐弱至停止（最后 60s 线性收音量），供睡着后自动收尾。
- **实现要点**：
  - [useUiStore](../src/store/useUiStore.ts) 增加非持久化 `sleepMinutes: 0 | 15 | 30` 与 `sleepEndsAt: number | null`。
  - [AmbientPlayer](../src/audio/AmbientPlayer.ts) 增加 `fadeToSilence(seconds)`：cancelScheduledValues 后 linearRamp 主增益至 0.0001，不改 `targetVolume`（下次 play 仍恢复用户音量）。
  - App effect：定时器激活且 ambient 非空 → setTimeout 到 `endsAt - 60s` 调 `fadeToSilence(60)`，到 `endsAt` 调 `setAmbient(null)` 并复位定时器；用户手动切换 ambient/关音 → 取消定时器。
  - BottomDock「音」组尾部加 `15′` / `30′` 切换钮（激活态显示剩余分钟数，30s 粒度刷新即可）。
- **验收**：设 15′ 后音量在第 14 分钟起渐弱、第 15 分钟静音且按钮复位；中途换音效定时器取消。
- **建议 commit**：`feat: sleep timer fades ambient audio out over final 60s and stops at 15 or 30 minutes`

---

## D. 声画联动与细节

### D11 场景预设（一键背景 + 音效）

- **目标**：一键切整套氛围，免去分别点选。
- **实现要点**：
  - [useUiStore](../src/store/useUiStore.ts) 导出 `PRESETS`：雨夜（rain/rain）、星夜（starry/wind）、入定（breath/bowl）、云雾（fog/white）。
  - BottomDock 最左新增「场景」组，4 按钮；激活态 = 当前 background 与 ambient 同时匹配。
- **验收**：单击同时切换背景与音效；再点其他预设正确交叉淡入淡出。
- **建议 commit**：`feat: one-click scene presets combining background and ambient sound`

### D12 呼吸环与钵音对齐 + 秒数倒计时

- **目标**：呼吸背景激活且选钵音时，钵声改在每轮「吸气」起点敲击（4-7-8 周期 19s），替代固定 14s 间隔；相位下方加细小秒数倒计时。
- **实现要点**：
  - [AmbientPlayer](../src/audio/AmbientPlayer.ts)：增加 `setBowlSync(on: boolean)`（同步模式下不起内部 `bowlTimer`）与公开 `strikeBowl()`（内部校验 `currentId === "bowl"`）。
  - App effect：`ambientPlayer.setBowlSync(background === "breath")`。
  - [BreathRing.tsx](../src/components/backgrounds/BreathRing.tsx)：相位切换到 0（吸气）时调 `ambientPlayer.strikeBowl()`；增加 1s interval 的剩余秒数小字（`text-[10px] fg-3`）。
- **验收**：呼吸 + 钵音时敲击与「吸气」同步；切离呼吸背景后恢复 14s 间隔；倒计时与相位时长一致。
- **建议 commit**：`feat: sync bowl strikes to breath cycle inhale and show per-phase countdown`

### D13 减弱动态 + 侧栏搜索 + 导出命名修正

- **目标**：尊重系统「减弱动态」；历史笔记可搜索；「MD」按钮名实相符。
- **实现要点**：
  - [useCanvasFrame.ts](../src/components/backgrounds/useCanvasFrame.ts)：`matchMedia("(prefers-reduced-motion: reduce)")` 命中时只绘制一帧后停循环（监听 change 事件切换）；BreathRing 属功能性动效，豁免。
  - [SideEntries.tsx](../src/components/SideEntries.tsx)：头部加搜索输入框，按内容不区分大小写子串过滤 entries。
  - [exporter.ts](../src/utils/exporter.ts) / BottomDock：`exportCurrentAsMarkdown` 更名 `exportTodayAsMarkdown`，按钮文案「今日MD」，title「导出今天全部为 Markdown」。
- **验收**：系统开启减弱动态后星空/雨夜/雾气静止为单帧；搜索即时过滤；按钮文案与行为一致。README 同步。
- **建议 commit**：`feat: respect prefers-reduced-motion for canvas backgrounds, add sidebar search, rename today markdown export`

---

## 实施顺序建议

按编号顺序 B4 → D13 即可；B5 依赖 B4 无耦合但同文件（Editor/App），连续做可减少上下文切换。C8 依赖 A3 的隐藏到托盘（已就绪）。全部完成后在本文档表格中补记 commit 哈希。
