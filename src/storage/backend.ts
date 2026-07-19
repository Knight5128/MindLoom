import { dexieBackend } from "./dexieBackend";
import { fileBackend } from "./fileBackend";
import { isTauri, type Note } from "./types";

export interface NoteBackend {
  list(): Promise<Note[]>;
  save(note: Note): Promise<void>;
  remove(id: string, createdAtMs: number): Promise<void>;
}

/**
 * Tauri 桌面端 → 本地 Markdown 文件（正式存储）；
 * 纯浏览器 `npm run dev` → Dexie 降级（仅供开发预览，随 WebView 数据可被清除）。
 */
export function getBackend(): NoteBackend {
  return isTauri() ? fileBackend : dexieBackend;
}
