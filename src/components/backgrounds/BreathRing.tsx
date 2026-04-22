import { useEffect, useState } from "react";

/**
 * 4-7-8 呼吸：吸气 4s、屏息 7s、呼气 8s。
 * 中央圆环按节律缩放 + 文字提示。
 */
const PHASES = [
  { name: "吸气", dur: 4000, scale: 1.35 },
  { name: "屏息", dur: 7000, scale: 1.35 },
  { name: "呼气", dur: 8000, scale: 0.7 },
] as const;

export function BreathRing() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].dur);
    return () => clearTimeout(t);
  }, [phase]);

  const cur = PHASES[phase];
  const prev = PHASES[(phase + PHASES.length - 1) % PHASES.length];
  const transition = `transform ${cur.dur}ms cubic-bezier(0.45, 0.1, 0.55, 0.9), opacity 1200ms ease`;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 80% at 50% 60%, #0d1118 0%, #06080d 60%, #04060a 100%)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="rounded-full"
          style={{
            width: "min(40vmin, 320px)",
            height: "min(40vmin, 320px)",
            transform: `scale(${cur.scale})`,
            transition,
            background: "radial-gradient(circle, rgba(120,160,190,0.18) 0%, rgba(120,160,190,0.04) 60%, transparent 80%)",
            border: "1px solid rgba(180,210,230,0.12)",
            boxShadow: "0 0 80px rgba(120,160,190,0.12) inset, 0 0 60px rgba(120,160,190,0.06)",
          }}
        />
      </div>
      <div className="absolute bottom-[14vh] left-1/2 -translate-x-1/2 select-none text-center">
        <div className="text-[11px] tracking-[0.4em] text-[color:var(--fg-3)]">
          {prev.name}
        </div>
        <div className="mt-1 text-[18px] tracking-[0.6em] text-[color:var(--fg-1)]">
          {cur.name}
        </div>
      </div>
    </div>
  );
}
