import { useEffect, useRef } from "react";

/**
 * 节流 + 失焦暂停的 canvas 动画 hook。
 *  - 自动适配 devicePixelRatio
 *  - 默认限制 30 fps，节省功耗（睡前场景）
 *  - 窗口失焦 / Tab 隐藏自动暂停
 */
export function useCanvasFrame(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
  fps = 30
): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let active = !document.hidden && document.hasFocus();
    const interval = 1000 / fps;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!active) return;
      if (t - last < interval) return;
      last = t;
      drawRef.current(ctx, window.innerWidth, window.innerHeight, t);
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => {
      active = !document.hidden && document.hasFocus();
    };
    const onFocus = () => (active = true);
    const onBlur = () => (active = false);

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [fps]);

  return canvasRef;
}
