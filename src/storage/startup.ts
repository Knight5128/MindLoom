import { invoke } from "@tauri-apps/api/core";
import { db } from "../db/dexie";
import { fileBackend } from "./fileBackend";
import { genId, isTauri, type Note } from "./types";

interface Meta {
  schemaVersion: number;
  migratedFromIndexedDb?: boolean;
  migratedCount?: number;
}

/**
 * Tauri 启动例程（浏览器开发模式下为 no-op）：
 * 1. IndexedDB → Markdown 文件一次性迁移（迁移前先写 pre-migration 全量备份，跳过空白笔记）
 * 2. 清理 .trash 中超过 30 天的软删除文件
 * 3. 当日滚动备份（backups/ 下保留 7 份）
 */
export async function runStartupTasks(): Promise<void> {
  if (!isTauri()) return;

  let meta: Meta = { schemaVersion: 1 };
  try {
    const raw = await invoke<string | null>("read_meta");
    if (raw) meta = { ...meta, ...JSON.parse(raw) };
  } catch {
    /* meta 不存在或损坏 → 按未迁移处理 */
  }

  if (!meta.migratedFromIndexedDb) {
    let migrated = 0;
    try {
      const rows = await db.entries.toArray();
      const nonEmpty = rows.filter((r) => r.content.trim().length > 0);
      if (nonEmpty.length > 0) {
        await invoke("write_pre_migration_backup", {
          json: JSON.stringify({ exportedAt: Date.now(), entries: nonEmpty }, null, 2),
        });
        for (const r of nonEmpty) {
          const note: Note = {
            // 由旧数字 id 确定性派生，保证迁移中断重试时覆盖同一文件而不是产生重复
            id: r.id != null ? `mig${r.id}` : genId(),
            createdAtMs: r.createdAt,
            updatedAtMs: r.updatedAt,
            mood: r.mood,
            tags: r.tags ?? [],
            content: r.content,
          };
          await fileBackend.save(note);
          migrated++;
        }
      }
      meta = { ...meta, migratedFromIndexedDb: true, migratedCount: migrated };
      await invoke("write_meta", { json: JSON.stringify(meta, null, 2) });
    } catch {
      /* 迁移失败则保持未迁移标记，下次启动重试；文件写入是幂等的（同内容同路径） */
    }
  }

  try {
    await invoke("purge_trash", { days: 30 });
  } catch {
    /* ignore */
  }

  try {
    const notes = await fileBackend.list();
    if (notes.length > 0) {
      await invoke("write_daily_backup_if_needed", {
        json: JSON.stringify({ exportedAt: Date.now(), entries: notes }, null, 2),
      });
    }
  } catch {
    /* ignore */
  }
}
