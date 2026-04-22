import { useMemo } from "react";
import { useCanvasFrame } from "./useCanvasFrame";

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

export function RainyNight() {
  const drops = useMemo<Drop[]>(() => {
    const arr: Drop[] = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 220; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 8 + Math.random() * 18,
        speed: 6 + Math.random() * 9,
        alpha: 0.18 + Math.random() * 0.35,
      });
    }
    return arr;
  }, []);

  const ref = useCanvasFrame((ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0a0f17");
    grad.addColorStop(0.6, "#0d141d");
    grad.addColorStop(1, "#070a10");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    for (const d of drops) {
      d.y += d.speed;
      d.x += d.speed * 0.18;
      if (d.y > h) {
        d.y = -d.len;
        d.x = Math.random() * w;
      }
      if (d.x > w) d.x = 0;
      ctx.strokeStyle = `rgba(180,200,225,${d.alpha})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.speed * 0.18 * 2, d.y - d.len);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, w, h);
  }, 30);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0" />;
}
