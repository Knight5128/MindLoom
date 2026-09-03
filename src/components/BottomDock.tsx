import { useEffect, useState } from "react";
import { AMBIENTS, BACKGROUNDS, PRESETS, useUiStore } from "../store/useUiStore";
import {
  exportAllAsJson,
  exportTodayAsMarkdown,
  importFromJson,
  openDataDir,
} from "../utils/exporter";
import { isTauri } from "../storage/types";

interface BottomDockProps {
  onGoodnight: () => void;
  goodnightActive: boolean;
}

export function BottomDock({ onGoodnight, goodnightActive }: BottomDockProps) {
  const background = useUiStore((s) => s.background);
  const setBackground = useUiStore((s) => s.setBackground);
  const ambient = useUiStore((s) => s.ambient);
  const setAmbient = useUiStore((s) => s.setAmbient);
  const volume = useUiStore((s) => s.volume);
  const setVolume = useUiStore((s) => s.setVolume);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const lineWidth = useUiStore((s) => s.lineWidth);
  const setLineWidth = useUiStore((s) => s.setLineWidth);
  const sleepMinutes = useUiStore((s) => s.sleepMinutes);
  const sleepEndsAt = useUiStore((s) => s.sleepEndsAt);
  const setSleepTimer = useUiStore((s) => s.setSleepTimer);
  const [now, setNow] = useState(Date.now());
  const applyPreset = useUiStore((s) => s.applyPreset);

  useEffect(() => {
    if (sleepEndsAt === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [sleepEndsAt]);

  const remainingMinutes = sleepEndsAt === null ? 0 : Math.max(1, Math.ceil((sleepEndsAt - now) / 60_000));

  return (
    <div className="flex justify-center px-4 pb-5">
      <div className="glass-panel flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-1 rounded-2xl px-2 py-1.5">
        <Group label="场景">
          {PRESETS.map((preset) => (
            <DockBtn
              key={preset.id}
              active={background === preset.background && ambient === preset.ambient}
              onClick={() => applyPreset(preset)}
              title={`切换到「${preset.label}」场景`}
            >
              {preset.label}
            </DockBtn>
          ))}
        </Group>

        <Divider />

        {/* 背景切换 */}
        <Group label="背景">
          {BACKGROUNDS.map((b) => (
            <DockBtn
              key={b.id}
              active={background === b.id}
              onClick={() => setBackground(b.id)}
              title={`切换到「${b.label}」背景`}
            >
              {b.label}
            </DockBtn>
          ))}
        </Group>

        <Divider />

        {/* 环境音 */}
        <Group label="音">
          {AMBIENTS.map((a) => (
            <DockBtn
              key={a.id}
              active={ambient === a.id}
              onClick={() => setAmbient(ambient === a.id ? null : a.id)}
              title={`${ambient === a.id ? "关闭" : "播放"}「${a.label}」`}
            >
              {a.label}
            </DockBtn>
          ))}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="ml-1 h-1 w-16 shrink-0 cursor-pointer appearance-none rounded-full bg-white/10 accent-[color:var(--accent)]"
            title="音量"
          />
          {([15, 30] as const).map((minutes) => (
            <DockBtn
              key={minutes}
              active={sleepMinutes === minutes}
              disabled={ambient === null}
              onClick={() => setSleepTimer(sleepMinutes === minutes ? 0 : minutes)}
              title={ambient === null ? "请先播放一种环境音" : `${minutes} 分钟后停止环境音`}
            >
              {sleepMinutes === minutes ? `${remainingMinutes}′` : `${minutes}′`}
            </DockBtn>
          ))}
        </Group>

        <Divider />

        <Group label="文字">
          {(["s", "m", "l"] as const).map((size, index) => (
            <DockBtn
              key={size}
              active={fontSize === size}
              onClick={() => setFontSize(size)}
              title={`字号：${["小", "中", "大"][index]}`}
            >
              {`${["小", "中", "大"][index]}字`}
            </DockBtn>
          ))}
          {(["narrow", "medium", "wide"] as const).map((width, index) => (
            <DockBtn
              key={width}
              active={lineWidth === width}
              onClick={() => setLineWidth(width)}
              title={`行宽：${["窄", "中", "宽"][index]}`}
            >
              {`${["窄", "中", "宽"][index]}行`}
            </DockBtn>
          ))}
        </Group>

        <Divider />

        <Group label="色调">
          <DockBtn active={theme === "mist"} onClick={() => setTheme("mist")} title="使用冷雾色调">
            冷雾
          </DockBtn>
          <DockBtn
            active={theme === "candle"}
            onClick={() => setTheme("candle")}
            title="使用低蓝光烛光色调"
          >
            烛光
          </DockBtn>
        </Group>

        <Divider />

        {/* 导出 / 数据 */}
        <Group label="数据">
          <DockBtn active={goodnightActive} onClick={onGoodnight} title="收笔并进入晚安仪式">
            晚安
          </DockBtn>
          <DockBtn onClick={() => void exportTodayAsMarkdown()} title="导出今天全部为 Markdown">
            今日MD
          </DockBtn>
          <DockBtn onClick={() => void exportAllAsJson()} title="导出全部为 JSON">
            JSON
          </DockBtn>
          {isTauri() && (
            <>
              <DockBtn onClick={() => void importFromJson()} title="从 JSON 备份导入">
                导入
              </DockBtn>
              <DockBtn onClick={() => void openDataDir()} title="打开本地数据文件夹">
                位置
              </DockBtn>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1 px-1.5">
      <span className="mr-1 shrink-0 select-none whitespace-nowrap text-[10px] tracking-widest text-[color:var(--fg-3)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-[color:var(--hairline)]" />;
}

function DockBtn({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors",
        disabled
          ? "cursor-not-allowed text-[color:var(--fg-faint)]"
          : active
          ? "bg-white/12 text-[color:var(--fg-1)]"
          : "text-[color:var(--fg-2)] hover:bg-white/6 hover:text-[color:var(--fg-1)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
