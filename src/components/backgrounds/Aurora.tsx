export function Aurora() {
  return (
    <>
      <style>{auroraCss}</style>
      <div className="ml-aurora-root pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ml-aurora-base" />
        <div className="ml-aurora-blob ml-aurora-1" />
        <div className="ml-aurora-blob ml-aurora-2" />
        <div className="ml-aurora-blob ml-aurora-3" />
        <div className="ml-aurora-grain" />
      </div>
    </>
  );
}

const auroraCss = `
.ml-aurora-base {
  position: absolute; inset: 0;
  background:
    radial-gradient(120% 80% at 50% 110%, #0a131a 0%, #06080d 60%, #04060a 100%);
}
.ml-aurora-blob {
  position: absolute; border-radius: 50%;
  filter: blur(80px) saturate(140%);
  mix-blend-mode: screen;
  opacity: 0.55;
}
.ml-aurora-1 {
  width: 70vw; height: 70vw; left: -10vw; top: -20vw;
  background: conic-gradient(from 0deg, #1f3b5c, #2c6e6a, #1f3b5c, #3a4f7a, #1f3b5c);
  animation: ml-aurora-spin 60s linear infinite;
}
.ml-aurora-2 {
  width: 90vw; height: 90vw; right: -25vw; top: 10vh;
  background: conic-gradient(from 90deg, #2a4d6e, #1c3a55, #4a6c8a, #2a4d6e);
  animation: ml-aurora-spin 90s linear infinite reverse;
  opacity: 0.4;
}
.ml-aurora-3 {
  width: 60vw; height: 60vw; left: 20vw; bottom: -25vw;
  background: conic-gradient(from 180deg, #3d5a7a, #1f3b5c, #2c6e6a, #3d5a7a);
  animation: ml-aurora-spin 75s linear infinite;
  opacity: 0.45;
}
.ml-aurora-grain {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
  opacity: 0.5;
}
@keyframes ml-aurora-spin {
  from { transform: rotate(0deg) scale(1); }
  50%  { transform: rotate(180deg) scale(1.05); }
  to   { transform: rotate(360deg) scale(1); }
}
`;
