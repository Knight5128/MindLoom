import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { ambientPlayer } from "./audio/AmbientPlayer";
import { isTauri } from "./storage/types";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { BottomDock } from "./components/BottomDock";
import { EdgeReveal } from "./components/EdgeReveal";
import { Editor } from "./components/Editor";
import { SideEntries } from "./components/SideEntries";
import { TopBar } from "./components/TopBar";
import { useEntryStore } from "./store/useEntryStore";
import { useUiStore } from "./store/useUiStore";

const GREETING_MS = 3200;

export default function App() {
  const initEntry = useEntryStore((s) => s.init);
  const ambient = useUiStore((s) => s.ambient);
  const volume = useUiStore((s) => s.volume);
  const toggleForceUi = useUiStore((s) => s.toggleForceUi);
  const hydrateFromDisk = useUiStore((s) => s.hydrateFromDisk);
  const newEntry = useEntryStore((s) => s.newEntry);
  const flush = useEntryStore((s) => s.flush);
  const [showGreeting, setShowGreeting] = useState(true);

  useEffect(() => {
    void hydrateFromDisk();
    void initEntry();
    const t = setTimeout(() => setShowGreeting(false), GREETING_MS);
    return () => clearTimeout(t);
  }, [hydrateFromDisk, initEntry]);

  // 关窗先落盘：拦截关闭请求，await flush 后再销毁窗口，
  // 消除 beforeunload 异步 flush 造成的「最后 800ms 输入丢失」风险
  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    const unlisten = win.onCloseRequested(async (e) => {
      e.preventDefault();
      try {
        await flush();
      } finally {
        await win.destroy();
      }
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [flush]);

  useEffect(() => {
    void ambientPlayer.play(ambient);
  }, [ambient]);

  useEffect(() => {
    ambientPlayer.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleForceUi();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void newEntry();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleForceUi, newEntry, flush]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <BackgroundLayer />

      {/* 居中编辑器 —— 始终可见 */}
      <main className="absolute inset-0 z-10">
        <Editor />
      </main>

      {/* 顶部：日期 / 字数 / 窗口控制 */}
      <header className="absolute inset-x-0 top-0 z-20">
        <EdgeReveal edge="top" threshold={88}>
          <TopBar />
        </EdgeReveal>
      </header>

      {/* 左侧：历史笔记 */}
      <aside className="absolute inset-y-0 left-0 z-20">
        <EdgeReveal edge="left" threshold={64}>
          <SideEntries />
        </EdgeReveal>
      </aside>

      {/* 底部：背景 / 音效 / 导出 */}
      <footer className="absolute inset-x-0 bottom-0 z-20">
        <EdgeReveal edge="bottom" threshold={96}>
          <BottomDock />
        </EdgeReveal>
      </footer>

      {/* 启动引导语 */}
      {showGreeting && (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          style={{ animation: "ml-fade-in 700ms ease both" }}
        >
          <div
            className="select-none text-center text-[14px] tracking-[0.5em] text-[color:var(--fg-3)]"
            style={{ animation: "ml-greet 3200ms ease forwards" }}
          >
            今晚，写下一个字也好。
          </div>
          <style>{`@keyframes ml-greet {
            0%   { opacity: 0; transform: translateY(6px); }
            18%  { opacity: 1; transform: translateY(0); }
            70%  { opacity: 1; }
            100% { opacity: 0; transform: translateY(-4px); }
          }`}</style>
        </div>
      )}
    </div>
  );
}
