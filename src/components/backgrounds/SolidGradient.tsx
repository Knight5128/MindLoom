/**
 * 纯渐变：零动画，最低能耗。点击同一按钮可在 4 种灰系色板中循环。
 * 色板序号随其余 UI 偏好一同持久化到 settings.json。
 */
import { useUiStore } from "../../store/useUiStore";

const PALETTES = [
  // 灰青
  "radial-gradient(120% 80% at 50% 110%, #1a242c 0%, #0c1117 60%, #060a0f 100%)",
  // 灰紫
  "radial-gradient(120% 80% at 50% 110%, #1f1a26 0%, #110d18 60%, #07050b 100%)",
  // 暖灰
  "radial-gradient(120% 80% at 50% 110%, #20211f 0%, #131311 60%, #08080706 100%)",
  // 冷灰
  "radial-gradient(120% 80% at 50% 110%, #161a1f 0%, #0a0d11 60%, #050608 100%)",
];

export function SolidGradient() {
  const idx = useUiStore((s) => s.solidPalette) % PALETTES.length;
  const setSolidPalette = useUiStore((s) => s.setSolidPalette);

  return (
    <div
      onClick={() => setSolidPalette((idx + 1) % PALETTES.length)}
      title="点击切换色板"
      className="fixed inset-0 cursor-pointer transition-[background] duration-1000"
      style={{ background: PALETTES[idx] }}
    />
  );
}
