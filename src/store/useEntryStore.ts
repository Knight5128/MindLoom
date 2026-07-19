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
        const now = Date.now();
        const note: Note = { id: genId(), createdAtMs: now, updatedAtMs: now, tags: [], content: "" };
        try {
          await getBackend().save(note);
        } catch {
          /* ignore */
        }
        set({
          entries: sortEntries([note, ...entries]),
          currentId: note.id,
          content: "",
          lastSavedAt: now,
        });
      })();
    }
    return initPromise;
  },

  setContent: (content) => {
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

  newEntry: async () => {
    await get().flush();
    const now = Date.now();
    const note: Note = { id: genId(), createdAtMs: now, updatedAtMs: now, tags: [], content: "" };
    try {
      await getBackend().save(note);
    } catch {
      /* ignore */
    }
    set({
      entries: sortEntries([note, ...get().entries]),
      currentId: note.id,
      content: "",
      lastSavedAt: now,
    });
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
      await get().newEntry();
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
