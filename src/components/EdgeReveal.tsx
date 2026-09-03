import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUiStore } from "../store/useUiStore";

export type Edge = "top" | "bottom" | "left" | "right";

interface EdgeRevealProps {
  edge: Edge;
  threshold?: number;
  hideDelay?: number;
  children: ReactNode;
  className?: string;
}

/**
 * 监听全局 mousemove，仅当光标距离指定窗口边缘 ≤ threshold 时显示子节点。
 * 鼠标进入子节点（hover）时强制保持显示，避免操作时被收起。
 */
export function EdgeReveal({
  edge,
  threshold = 96,
  hideDelay = 1100,
  children,
  className,
}: EdgeRevealProps) {
  const [near, setNear] = useState(false);
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const force = useUiStore((s) => s.forceUiVisible);
  const typing = useUiStore((s) => s.typing);

  useEffect(() => {
    let ticking = false;

    const handle = (e: MouseEvent) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const w = window.innerWidth;
        const h = window.innerHeight;
        let d = Infinity;
        switch (edge) {
          case "top":
            d = e.clientY;
            break;
          case "bottom":
            d = h - e.clientY;
            break;
          case "left":
            d = e.clientX;
            break;
          case "right":
            d = w - e.clientX;
            break;
        }
        if (d <= threshold) {
          if (hideTimer.current) {
            window.clearTimeout(hideTimer.current);
            hideTimer.current = null;
          }
          setNear(true);
        } else {
          if (!hideTimer.current) {
            hideTimer.current = window.setTimeout(() => {
              setNear(false);
              hideTimer.current = null;
            }, hideDelay);
          }
        }
      });
    };

    window.addEventListener("mousemove", handle, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handle);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [edge, threshold, hideDelay]);

  const visible = force || (!typing && (near || hovering));

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={[
        "transition-opacity duration-700 ease-out",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
        className ?? "",
      ].join(" ")}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}
