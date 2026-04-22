import { create } from "zustand";
import { createEntry, updateEntry } from "../db/dexie";

interface EntryState {
  currentId: number | null;
  content: string;
  saving: boolean;
  lastSavedAt: number | null;
  init: () => Promise<void>;
  setContent: (content: string) => void;
  loadEntry: (id: number, content: string) => void;
  newEntry: () => Promise<void>;
  flush: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 800;

export const useEntryStore = create<EntryState>((set, get) => ({
  currentId: null,
  content: "",
  saving: false,
  lastSavedAt: null,

  init: async () => {
    if (get().currentId != null) return;
    const id = await createEntry("");
    set({ currentId: id, content: "", lastSavedAt: Date.now() });
  },

  setContent: (content) => {
    set({ content });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void get().flush();
    }, DEBOUNCE_MS);
  },

  loadEntry: (id, content) => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ currentId: id, content, lastSavedAt: Date.now() });
  },

  newEntry: async () => {
    await get().flush();
    const id = await createEntry("");
    set({ currentId: id, content: "", lastSavedAt: Date.now() });
  },

  flush: async () => {
    const { currentId, content } = get();
    if (currentId == null) return;
    set({ saving: true });
    try {
      await updateEntry(currentId, content);
      set({ saving: false, lastSavedAt: Date.now() });
    } catch {
      set({ saving: false });
    }
  },
}));
