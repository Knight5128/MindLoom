import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { isTauri } from "../storage/types";

export type BackgroundId =
  | "starry"
  | "rain"
  | "aurora"
  | "fog"
  | "solid"
  | "breath";

export type AmbientId = "rain" | "wind" | "white" | "bowl" | null;
export type ThemeId = "mist" | "candle";
export type FontSizeId = "s" | "m" | "l";
export type LineWidthId = "narrow" | "medium" | "wide";

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

interface Settings {
  background: BackgroundId;
  ambient: AmbientId;
  theme: ThemeId;
  fontSize: FontSizeId;
  lineWidth: LineWidthId;
  volume: number; // 0..1
  solidPalette: number;
}

interface UiState extends Settings {
  forceUiVisible: boolean; // Esc 强制全显
  typing: boolean;
  sleepMinutes: 0 | 15 | 30;
  sleepEndsAt: number | null;
  setBackground: (id: BackgroundId) => void;
  setAmbient: (id: AmbientId) => void;
  setTheme: (theme: ThemeId) => void;
  setFontSize: (fontSize: FontSizeId) => void;
  setLineWidth: (lineWidth: LineWidthId) => void;
  setVolume: (v: number) => void;
  setSolidPalette: (idx: number) => void;
  toggleForceUi: () => void;
  setTyping: (typing: boolean) => void;
  setSleepTimer: (minutes: 0 | 15 | 30) => void;
  hydrateFromDisk: () => Promise<void>;
}

const STORAGE_KEY = "mindloom:ui:v1";

const DEFAULTS: Settings = {
  background: "starry",
  ambient: null,
  theme: "mist",
  fontSize: "m",
  lineWidth: "medium",
  volume: 0.5,
  solidPalette: 0,
};

const BACKGROUND_IDS = BACKGROUNDS.map((b) => b.id);
const AMBIENT_IDS: AmbientId[] = [...AMBIENTS.map((a) => a.id), null];

function normalize(obj: Partial<Settings> | null | undefined): Settings {
  return {
    background: BACKGROUND_IDS.includes(obj?.background as BackgroundId)
      ? (obj!.background as BackgroundId)
      : DEFAULTS.background,
    ambient: AMBIENT_IDS.includes(obj?.ambient as AmbientId)
      ? (obj!.ambient as AmbientId)
      : DEFAULTS.ambient,
    theme: obj?.theme === "candle" ? "candle" : DEFAULTS.theme,
    fontSize: obj?.fontSize === "s" || obj?.fontSize === "l" ? obj.fontSize : DEFAULTS.fontSize,
    lineWidth:
      obj?.lineWidth === "narrow" || obj?.lineWidth === "wide"
        ? obj.lineWidth
        : DEFAULTS.lineWidth,
    volume:
      typeof obj?.volume === "number" ? Math.max(0, Math.min(1, obj.volume)) : DEFAULTS.volume,
    solidPalette:
      typeof obj?.solidPalette === "number" && obj.solidPalette >= 0
        ? Math.floor(obj.solidPalette)
        : DEFAULTS.solidPalette,
  };
}

const loadInitial = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return DEFAULTS;
};

export const useUiStore = create<UiState>((set, get) => ({
  ...loadInitial(),
  forceUiVisible: false,
  typing: false,
  sleepMinutes: 0,
  sleepEndsAt: null,
  setBackground: (id) => {
    set({ background: id });
    persist(get());
  },
  setAmbient: (id) => {
    set({ ambient: id, sleepMinutes: 0, sleepEndsAt: null });
    persist(get());
  },
  setTheme: (theme) => {
    set({ theme });
    persist(get());
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    persist(get());
  },
  setLineWidth: (lineWidth) => {
    set({ lineWidth });
    persist(get());
  },
  setVolume: (v) => {
    set({ volume: Math.max(0, Math.min(1, v)) });
    persist(get());
  },
  setSolidPalette: (idx) => {
    set({ solidPalette: idx });
    persist(get());
  },
  toggleForceUi: () => set({ forceUiVisible: !get().forceUiVisible }),
  setTyping: (typing) => set({ typing }),
  setSleepTimer: (minutes) =>
    set({
      sleepMinutes: minutes,
      sleepEndsAt: minutes === 0 ? null : Date.now() + minutes * 60_000,
    }),

  // 正式存储为 appdata 的 settings.json；localStorage 仅作快速首帧 + 浏览器开发降级
  hydrateFromDisk: async () => {
    if (!isTauri()) return;
    try {
      const raw = await invoke<string | null>("read_settings");
      if (raw) set(normalize(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  },
}));

let diskTimer: ReturnType<typeof setTimeout> | null = null;

function persist(s: UiState) {
  const settings: Settings = {
    background: s.background,
    ambient: s.ambient,
    theme: s.theme,
    fontSize: s.fontSize,
    lineWidth: s.lineWidth,
    volume: s.volume,
    solidPalette: s.solidPalette,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  if (isTauri()) {
    if (diskTimer) clearTimeout(diskTimer);
    diskTimer = setTimeout(() => {
      void invoke("write_settings", { json: JSON.stringify(settings, null, 2) }).catch(() => {});
    }, 400);
  }
}
