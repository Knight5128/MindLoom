import { useEffect, useRef, useState } from "react";
import { type BackgroundId, useUiStore } from "../store/useUiStore";
import { Aurora } from "./backgrounds/Aurora";
import { BreathRing } from "./backgrounds/BreathRing";
import { Fog } from "./backgrounds/Fog";
import { RainyNight } from "./backgrounds/RainyNight";
import { SolidGradient } from "./backgrounds/SolidGradient";
import { StarrySky } from "./backgrounds/StarrySky";

function render(id: BackgroundId) {
  switch (id) {
    case "starry":
      return <StarrySky />;
    case "rain":
      return <RainyNight />;
    case "aurora":
      return <Aurora />;
    case "fog":
      return <Fog />;
    case "solid":
      return <SolidGradient />;
    case "breath":
      return <BreathRing />;
  }
}

const FADE_MS = 800;

interface Layer {
  key: number;
  id: BackgroundId;
  state: "in" | "out";
}

export function BackgroundLayer() {
  const target = useUiStore((s) => s.background);
  const [layers, setLayers] = useState<Layer[]>(() => [
    { key: 0, id: target, state: "in" },
  ]);
  const counter = useRef(1);

  useEffect(() => {
    setLayers((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.id === target) return prev;
      const next: Layer[] = prev.map((l) => ({ ...l, state: "out" as const }));
      next.push({ key: counter.current++, id: target, state: "in" });
      return next;
    });
    const t = setTimeout(() => {
      setLayers((prev) => prev.filter((l) => l.state === "in"));
    }, FADE_MS + 80);
    return () => clearTimeout(t);
  }, [target]);

  return (
    <div className="fixed inset-0 -z-10">
      {layers.map((l) => (
        <div
          key={l.key}
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: l.state === "in" ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        >
          {render(l.id)}
        </div>
      ))}
    </div>
  );
}
