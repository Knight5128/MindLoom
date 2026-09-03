import { AMBIENTS, BACKGROUNDS, useUiStore } from "../store/useUiStore";
import {
  exportAllAsJson,
  exportCurrentAsMarkdown,
  importFromJson,
  openDataDir,
} from "../utils/exporter";
import { isTauri } from "../storage/types";

export function BottomDock() {
  const background = useUiStore((s) => s.background);
  const setBackground = useUiStore((s) => s.setBackground);
  const ambient = useUiStore((s) => s.ambient);
  const setAmbient = useUiStore((s) => s.setAmbient);
  const volume = useUiStore((s) => s.volume);
  const setVolume = useUiStore((s) => s.setVolume);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <div className="flex justify-center pb-5">
      <div className="glass-panel flex items-center gap-1 rounded-full px-2 py-1.5">
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
            className="ml-1 h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/10 accent-[color:var(--accent)]"
            title="音量"
          />
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
          <DockBtn onClick={() => void exportCurrentAsMarkdown()} title="导出当前为 Markdown">
            MD
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
    <div className="flex items-center gap-1 px-1.5">
      <span className="mr-1 select-none text-[10px] tracking-widest text-[color:var(--fg-3)]">
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
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        "rounded-full px-3 py-1 text-xs transition-colors",
        active
          ? "bg-white/12 text-[color:var(--fg-1)]"
          : "text-[color:var(--fg-2)] hover:bg-white/6 hover:text-[color:var(--fg-1)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
