import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { useEntryStore } from "../store/useEntryStore";

function fmtTime(ts: number | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function todayLabel() {
  const d = new Date();
  const w = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d
    .getDate()
    .toString()
    .padStart(2, "0")} 周${w}`;
}

export function TopBar() {
  const content = useEntryStore((s) => s.content);
  const lastSavedAt = useEntryStore((s) => s.lastSavedAt);
  const saving = useEntryStore((s) => s.saving);
  const [tauriReady, setTauriReady] = useState(false);

  useEffect(() => {
    setTauriReady(typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined");
  }, []);

  const wordCount = content.trim().length;

  const onMin = async () => {
    if (tauriReady) await getCurrentWindow().minimize();
  };
  const onMax = async () => {
    if (tauriReady) await getCurrentWindow().toggleMaximize();
  };
  const onClose = async () => {
    if (tauriReady) await getCurrentWindow().close();
  };

  return (
    <div className="flex items-center justify-between px-4 pt-3">
      {/* 左：日期 */}
      <div className="glass-pill drag select-none px-4 py-1.5 text-xs tracking-wider text-[color:var(--fg-2)]">
        {todayLabel()}
      </div>

      {/* 中：可拖拽留白 */}
      <div className="drag h-8 flex-1" />

      {/* 右：字数 + 保存状态 + 窗口控制 */}
      <div className="flex items-center gap-2">
        <div className="glass-pill no-drag px-4 py-1.5 text-xs text-[color:var(--fg-2)]">
          {saving ? "正在保存…" : `${wordCount} 字 · ${fmtTime(lastSavedAt)}`}
        </div>
        {tauriReady && (
          <div className="glass-pill no-drag flex items-center gap-1 px-2 py-1.5">
            <WinBtn onClick={onMin} title="最小化">
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1" />
              </svg>
            </WinBtn>
            <WinBtn onClick={onMax} title="最大化">
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="2" y="2" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </WinBtn>
            <WinBtn onClick={onClose} title="关闭">
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1" />
                <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1" />
              </svg>
            </WinBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function WinBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--fg-3)] transition-colors hover:bg-white/8 hover:text-[color:var(--fg-1)]"
    >
      {children}
    </button>
  );
}
