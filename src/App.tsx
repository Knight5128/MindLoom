import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import { ambientPlayer } from "./audio/AmbientPlayer";
import { isTauri } from "./storage/types";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { BottomDock } from "./components/BottomDock";
import { EdgeReveal } from "./components/EdgeReveal";
import { Editor } from "./components/Editor";
import { NightRitual } from "./components/NightRitual";
import { SideEntries } from "./components/SideEntries";
import { TopBar } from "./components/TopBar";
import { useEntryStore } from "./store/useEntryStore";
import { useUiStore } from "./store/useUiStore";
import { streakDays, tonightChars } from "./utils/streak";
import { greetingForNow } from "./utils/prompts";

const GREETING_MS = 3200;

async function isFullscreen(): Promise<boolean> {
  if (isTauri()) return getCurrentWindow().isFullscreen();
  return document.fullscreenElement !== null;
}

async function setFullscreen(fullscreen: boolean): Promise<void> {
  if (isTauri()) {
    await getCurrentWindow().setFullscreen(fullscreen);
  } else if (fullscreen) {
    await document.documentElement.requestFullscreen();
  } else if (document.fullscreenElement) {
    await document.exitFullscreen();
  }
}

async function toggleFullscreen(): Promise<void> {
  await setFullscreen(!(await isFullscreen()));
}

export default function App() {
  const initEntry = useEntryStore((s) => s.init);
  const ambient = useUiStore((s) => s.ambient);
  const theme = useUiStore((s) => s.theme);
  const volume = useUiStore((s) => s.volume);
  const toggleForceUi = useUiStore((s) => s.toggleForceUi);
  const setTyping = useUiStore((s) => s.setTyping);
  const typing = useUiStore((s) => s.typing);
  const hydrateFromDisk = useUiStore((s) => s.hydrateFromDisk);
  const newEntry = useEntryStore((s) => s.newEntry);
  const flush = useEntryStore((s) => s.flush);
  const [showGreeting, setShowGreeting] = useState(true);
  const [greeting] = useState(() => greetingForNow());
  const [ritualSummary, setRitualSummary] = useState<{ chars: number; days: number } | null>(null);
  const ritualActiveRef = useRef(false);
  const ritualTimerRef = useRef<number | null>(null);

  const runNightRitual = useCallback(async () => {
    if (ritualActiveRef.current) return;
    ritualActiveRef.current = true;
    try {
      await flush();
      const entries = useEntryStore.getState().entries;
      setRitualSummary({ chars: tonightChars(entries), days: streakDays(entries) });
      ritualTimerRef.current = window.setTimeout(async () => {
        try {
          if (isTauri()) await getCurrentWindow().hide();
        } finally {
          setRitualSummary(null);
          ritualActiveRef.current = false;
          ritualTimerRef.current = null;
        }
      }, 4500);
    } catch {
      ritualActiveRef.current = false;
      setRitualSummary(null);
    }
  }, [flush]);

  useEffect(
    () => () => {
      if (ritualTimerRef.current !== null) window.clearTimeout(ritualTimerRef.current);
    },
    []
  );

  useEffect(() => {
    void hydrateFromDisk();
    void initEntry();
    const t = setTimeout(() => setShowGreeting(false), GREETING_MS);
    return () => clearTimeout(t);
  }, [hydrateFromDisk, initEntry]);

  // 关闭 = 落盘后隐藏到托盘（应用继续驻留）；真正退出走托盘菜单
  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    const unlisten = win.onCloseRequested(async (e) => {
      e.preventDefault();
      try {
        await flush();
      } finally {
        await win.hide();
      }
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [flush]);

  // 托盘「退出」：先 flush 再退出进程（Rust 侧另有 2s 兜底强制退出）
  useEffect(() => {
    if (!isTauri()) return;
    const unlisten = listen("mindloom://quit-requested", async () => {
      try {
        await flush();
      } finally {
        await invoke("exit_app");
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
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle("ml-typing", typing);
    return () => document.body.classList.remove("ml-typing");
  }, [typing]);

  useEffect(() => {
    const onMouseMove = () => setTyping(false);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [setTyping]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void (async () => {
          if (await isFullscreen()) {
            await setFullscreen(false);
          } else {
            toggleForceUi();
          }
        })();
      } else if (e.key === "F11") {
        e.preventDefault();
        void toggleFullscreen();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void runNightRitual();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void newEntry();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key !== "F11") {
        setTyping(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleForceUi, newEntry, flush, setTyping, runNightRitual]);

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
          <BottomDock onGoodnight={() => void runNightRitual()} goodnightActive={ritualSummary !== null} />
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
            {greeting}
          </div>
          <style>{`@keyframes ml-greet {
            0%   { opacity: 0; transform: translateY(6px); }
            18%  { opacity: 1; transform: translateY(0); }
            70%  { opacity: 1; }
            100% { opacity: 0; transform: translateY(-4px); }
          }`}</style>
        </div>
      )}

      {ritualSummary && <NightRitual chars={ritualSummary.chars} days={ritualSummary.days} />}
    </div>
  );
}
