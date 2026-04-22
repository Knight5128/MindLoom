import { useMemo, useRef } from "react";
import { useCanvasFrame } from "./useCanvasFrame";

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  speed: number;
  phase: number;
  parallax: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export function StarrySky() {
  const stars = useMemo<Star[]>(() => {
    const arr: Star[] = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 220; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.3,
        base: Math.random() * 0.5 + 0.4,
        speed: Math.random() * 0.0015 + 0.0005,
        phase: Math.random() * Math.PI * 2,
        parallax: Math.random() * 0.4 + 0.1,
      });
    }
    return arr;
  }, []);

  const meteors = useRef<Meteor[]>([]);
  const lastMeteor = useRef(0);

  const ref = useCanvasFrame((ctx, w, h, t) => {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.85, 0, w * 0.5, h * 0.85, Math.max(w, h));
    grad.addColorStop(0, "#0e1118");
    grad.addColorStop(0.55, "#0a0c12");
    grad.addColorStop(1, "#06070b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (const s of stars) {
      const dx = (t * s.speed * s.parallax) % w;
      const x = (s.x + dx) % w;
      const tw = s.base + Math.sin(t * 0.001 + s.phase) * 0.35;
      ctx.globalAlpha = Math.max(0.1, Math.min(1, tw));
      ctx.fillStyle = "#e8eef7";
      ctx.beginPath();
      ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (t - lastMeteor.current > 7000 && Math.random() < 0.04) {
      lastMeteor.current = t;
      meteors.current.push({
        x: Math.random() * w * 0.6,
        y: Math.random() * h * 0.3,
        vx: 5 + Math.random() * 3,
        vy: 2 + Math.random() * 2,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      });
    }
    meteors.current = meteors.current.filter((m) => m.life < m.maxLife);
    for (const m of meteors.current) {
      m.life += 1;
      m.x += m.vx;
      m.y += m.vy;
      const alpha = (1 - m.life / m.maxLife) * 0.7;
      const tail = 80;
      const gradM = ctx.createLinearGradient(m.x - m.vx * tail * 0.1, m.y - m.vy * tail * 0.1, m.x, m.y);
      gradM.addColorStop(0, "rgba(232,238,247,0)");
      gradM.addColorStop(1, `rgba(232,238,247,${alpha})`);
      ctx.strokeStyle = gradM;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(m.x - m.vx * tail * 0.1, m.y - m.vy * tail * 0.1);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
    }
  }, 30);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0" />;
}
