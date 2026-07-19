import { create } from "zustand";
import { getBackend } from "../storage/backend";
import { runStartupTasks } from "../storage/startup";
import { genId, type Note } from "../storage/types";

interface EntryState {
  entries: Note[];
  currentId: string | null;
  content: string;
  saving: boolean;
  lastSavedAt: number | null;
  init: () => Promise<void>;
  setContent: (content: string) => void;
  loadEntry: (id: string) => void;
  newEntry: () => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  flush: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 800;

let initPromise: Promise<void> | null = null;

function sortEntries(list: Note[]): Note[] {
  return [...list].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [],
  currentId: null,
  content: "",
  saving: false,
  lastSavedAt: null,

  // 惰性创建：启动只加载列表，敲下第一个字才真正建立（并落盘）一条笔记
  init: () => {
    if (!initPromise) {
      initPromise = (async () => {
        await runStartupTasks();
        let entries: Note[] = [];
        try {
          entries = await getBackend().list();
        } catch {
          entries = [];
        }
        set({ entries: sortEntries(entries), currentId: null, content: "" });
      })();
    }
    return initPromise;
  },

  setContent: (content) => {
    if (get().currentId == null && content.length > 0) {
      const now = Date.now();
      const note: Note = { id: genId(), createdAtMs: now, updatedAtMs: now, tags: [], content: "" };
      set({ currentId: note.id, entries: sortEntries([note, ...get().entries]) });
    }
    set({ content });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void get().flush();
    }, DEBOUNCE_MS);
  },

  loadEntry: (id) => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const note = get().entries.find((n) => n.id === id);
    if (!note) return;
    set({ currentId: id, content: note.content, lastSavedAt: Date.now() });
  },

  // 回到空白草稿态，不写任何文件
  newEntry: async () => {
    await get().flush();
    set({ currentId: null, content: "", lastSavedAt: null });
  },

  deleteEntry: async (id) => {
    const note = get().entries.find((n) => n.id === id);
    if (!note) return;
    try {
      await getBackend().remove(id, note.createdAtMs);
    } catch {
      /* ignore */
    }
    set({ entries: get().entries.filter((n) => n.id !== id) });
    if (get().currentId === id) {
      set({ currentId: null, content: "", lastSavedAt: null });
    }
  },

  reload: async () => {
    try {
      const entries = await getBackend().list();
      set({ entries: sortEntries(entries) });
    } catch {
      /* ignore */
    }
  },

  flush: async () => {
    const { currentId, content, entries } = get();
    if (currentId == null) return;
    const note = entries.find((n) => n.id === currentId);
    if (!note || note.content === content) return;
    const updated: Note = { ...note, content, updatedAtMs: Date.now() };
    set({ saving: true });
    try {
      await getBackend().save(updated);
      set({
        saving: false,
        lastSavedAt: Date.now(),
        entries: sortEntries(get().entries.map((n) => (n.id === updated.id ? updated : n))),
      });
    } catch {
      set({ saving: false });
    }
  },
}));
