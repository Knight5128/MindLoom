import { invoke } from "@tauri-apps/api/core";
import type { NoteBackend } from "./backend";
import type { Note } from "./types";

export const fileBackend: NoteBackend = {
  list: () => invoke<Note[]>("list_notes"),
  save: (note) => invoke("save_note", { note }),
  remove: (id, createdAtMs) => invoke("delete_note", { id, createdAtMs }),
};
