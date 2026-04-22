import { create } from "zustand";

export type BackgroundId =
  | "starry"
  | "rain"
  | "aurora"
  | "fog"
  | "solid"
  | "breath";

export type AmbientId = "rain" | "wind" | "white" | "bowl" | null;

export const BACKGROUNDS: { id: BackgroundId; label: string }[] = [
  { id: "starry", label: "星空" },
  { id: "rain", label: "雨夜" },
  { id: "aurora", label: "极光" },
  { id: "fog", label: "雾气" },
  { id: "solid", label: "渐变" },
  { id: "breath", label: "呼吸" },
];

export const AMBIENTS: { id: Exclude<AmbientId, null>; label: string }[] = [
  { id: "rain", label: "雨声" },
  { id: "wind", label: "风声" },
  { id: "white", label: "白噪" },
  { id: "bowl", label: "钵音" },
];

interface UiState {
  background: BackgroundId;
  ambient: AmbientId;
  volume: number; // 0..1
  forceUiVisible: boolean; // Esc 强制全显
  setBackground: (id: BackgroundId) => void;
  setAmbient: (id: AmbientId) => void;
  setVolume: (v: number) => void;
  toggleForceUi: () => void;
}

const STORAGE_KEY = "mindloom:ui:v1";

const loadInitial = (): Pick<
  UiState,
  "background" | "ambient" | "volume" | "forceUiVisible"
> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return {
        background: obj.background ?? "starry",
        ambient: obj.ambient ?? null,
        volume: typeof obj.volume === "number" ? obj.volume : 0.5,
        forceUiVisible: false,
      };
    }
  } catch {
    /* ignore */
  }
  return { background: "starry", ambient: null, volume: 0.5, forceUiVisible: false };
};

export const useUiStore = create<UiState>((set, get) => ({
  ...loadInitial(),
  setBackground: (id) => {
    set({ background: id });
    persist(get());
  },
  setAmbient: (id) => {
    set({ ambient: id });
    persist(get());
  },
  setVolume: (v) => {
    set({ volume: Math.max(0, Math.min(1, v)) });
    persist(get());
  },
  toggleForceUi: () => set({ forceUiVisible: !get().forceUiVisible }),
}));

function persist(s: UiState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ background: s.background, ambient: s.ambient, volume: s.volume })
    );
  } catch {
    /* ignore */
  }
}
