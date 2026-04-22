import { useCanvasFrame } from "./useCanvasFrame";

/**
 * 流动雾：用低频正弦叠加做廉价 Perlin 替代，配合大模糊滤镜。
 */
export function Fog() {
  const ref = useCanvasFrame((ctx, w, h, t) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#10141b");
    grad.addColorStop(1, "#070a10");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.filter = "blur(40px)";
    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const phase = t * 0.00012 * (i + 1);
      const offsetX = Math.sin(phase) * w * 0.25;
      const offsetY = Math.cos(phase * 0.8) * h * 0.15;
      const radius = Math.max(w, h) * (0.45 + i * 0.12);
      const cx = w * 0.5 + offsetX;
      const cy = h * 0.6 + offsetY;
      const alpha = 0.06 + i * 0.025;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, `rgba(160,180,200,${alpha})`);
      g.addColorStop(1, "rgba(160,180,200,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, w, h);
  }, 24);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0" />;
}
