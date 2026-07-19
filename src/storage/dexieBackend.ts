import { db } from "../db/dexie";
import type { NoteBackend } from "./backend";
import type { Note } from "./types";

/**
 * 浏览器开发降级后端。新纪录以 `sid`（字符串 id）关联；
 * 旧纪录（迁移前的数字自增 id）以 `String(id)` 暴露。
 */
async function findKeyBySid(sid: string): Promise<number | undefined> {
  const row = await db.entries.where("sid").equals(sid).first();
  if (row?.id != null) return row.id;
  const numId = Number(sid);
  if (Number.isInteger(numId)) {
    const legacy = await db.entries.get(numId);
    if (legacy && legacy.sid == null) return legacy.id;
  }
  return undefined;
}

export const dexieBackend: NoteBackend = {
  async list() {
    const rows = await db.entries.orderBy("updatedAt").reverse().toArray();
    return rows.map((r) => ({
      id: r.sid ?? String(r.id),
      createdAtMs: r.createdAt,
      updatedAtMs: r.updatedAt,
      mood: r.mood,
      tags: r.tags ?? [],
      content: r.content,
    }));
  },

  async save(note: Note) {
    const key = await findKeyBySid(note.id);
    if (key != null) {
      await db.entries.update(key, {
        content: note.content,
        updatedAt: note.updatedAtMs,
        mood: note.mood,
        tags: note.tags,
        sid: note.id,
      });
    } else {
      await db.entries.add({
        sid: note.id,
        createdAt: note.createdAtMs,
        updatedAt: note.updatedAtMs,
        mood: note.mood,
        tags: note.tags,
        content: note.content,
      });
    }
  },

  async remove(id: string) {
    const key = await findKeyBySid(id);
    if (key != null) await db.entries.delete(key);
  },
};
