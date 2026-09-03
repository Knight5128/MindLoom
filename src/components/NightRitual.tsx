interface NightRitualProps {
  chars: number;
  days: number;
}

export function NightRitual({ chars, days }: NightRitualProps) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center backdrop-blur-2xl"
      style={{
        background: "color-mix(in oklch, var(--bg-base) 92%, transparent)",
        animation: "ml-night-ritual 4500ms ease forwards",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="select-none text-center">
        <div className="text-[22px] tracking-[0.65em] text-[color:var(--fg-1)]">晚安</div>
        <div className="mt-5 text-[12px] tracking-[0.25em] text-[color:var(--fg-3)]">
          今晚 {chars} 字 · 连续 {days} 天
        </div>
      </div>
      <style>{`@keyframes ml-night-ritual {
        0%   { opacity: 0; }
        14%  { opacity: 1; }
        74%  { opacity: 1; }
        100% { opacity: 0; }
      }`}</style>
    </div>
  );
}
