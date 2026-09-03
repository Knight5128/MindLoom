import { invoke } from "@tauri-apps/api/core";
import { message, open, save } from "@tauri-apps/plugin-dialog";
import { getBackend } from "../storage/backend";
import { genId, isTauri, type Note } from "../storage/types";
import { useEntryStore } from "../store/useEntryStore";

function fmtDate(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtDateTime(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

function entryToMarkdown(e: Note): string {
  return `## ${fmtDateTime(e.createdAtMs)}\n\n${e.content.trim() || "_（空白）_"}\n`;
}

function browserDownload(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function saveTextAs(filename: string, contents: string, ext: string, filterName: string, mime: string) {
  if (isTauri()) {
    const path = await save({
      defaultPath: filename,
      filters: [{ name: filterName, extensions: [ext] }],
    });
    if (!path) return;
    await invoke("export_text_file", { path, contents });
  } else {
    browserDownload(filename, contents, mime);
  }
}

export async function exportTodayAsMarkdown(): Promise<void> {
  await useEntryStore.getState().flush();
  const all = useEntryStore.getState().entries;
  const today = Date.now();
  const sameDay = all.filter(
    (e) => fmtDate(e.createdAtMs) === fmtDate(today) && e.content.trim().length > 0
  );
  const md =
    `# MindLoom · ${fmtDate(today)}\n\n` +
    (sameDay.length === 0
      ? "_今天还没有记录。_\n"
      : sameDay.map(entryToMarkdown).join("\n---\n\n"));
  await saveTextAs(`mindloom-${fmtDate(today)}.md`, md, "md", "Markdown", "text/markdown");
}

export async function exportAllAsJson(): Promise<void> {
  await useEntryStore.getState().flush();
  const all = useEntryStore.getState().entries;
  const json = JSON.stringify({ exportedAt: Date.now(), entries: all }, null, 2);
  await saveTextAs(
    `mindloom-all-${fmtDate(Date.now())}.json`,
    json,
    "json",
    "JSON",
    "application/json"
  );
}

interface LegacyEntry {
  id?: number | string;
  createdAt?: number;
  updatedAt?: number;
  createdAtMs?: number;
  updatedAtMs?: number;
  mood?: string;
  tags?: string[];
  content?: string;
}

function normalizeImported(raw: LegacyEntry): Note | null {
  const createdAtMs = raw.createdAtMs ?? raw.createdAt;
  if (typeof createdAtMs !== "number" || typeof raw.content !== "string") return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : genId(),
    createdAtMs,
    updatedAtMs: raw.updatedAtMs ?? raw.updatedAt ?? createdAtMs,
    mood: raw.mood,
    tags: raw.tags ?? [],
    content: raw.content,
  };
}

/** 从导出的 JSON 备份恢复；按（创建时间, 内容）去重，已存在的条目跳过。 */
export async function importFromJson(): Promise<void> {
  if (!isTauri()) return;
  const path = await open({
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path || typeof path !== "string") return;

  let imported = 0;
  let skipped = 0;
  try {
    const raw = await invoke<string>("read_text_file_at", { path });
    const parsed = JSON.parse(raw) as { entries?: LegacyEntry[] };
    const list = Array.isArray(parsed.entries) ? parsed.entries : [];
    const existing = useEntryStore.getState().entries;
    const seen = new Set(existing.map((e) => `${e.createdAtMs}|${e.content}`));
    const existingIds = new Set(existing.map((e) => e.id));

    for (const rawEntry of list) {
      const note = normalizeImported(rawEntry);
      if (!note || note.content.trim().length === 0) continue;
      if (seen.has(`${note.createdAtMs}|${note.content}`)) {
        skipped++;
        continue;
      }
      if (existingIds.has(note.id)) note.id = genId();
      await getBackend().save(note);
      seen.add(`${note.createdAtMs}|${note.content}`);
      existingIds.add(note.id);
      imported++;
    }
    await useEntryStore.getState().reload();
    await message(`已导入 ${imported} 条笔记${skipped > 0 ? `，跳过重复 ${skipped} 条` : ""}。`, {
      title: "MindLoom",
    });
  } catch {
    await message("导入失败：文件不是有效的 MindLoom 备份 JSON。", { title: "MindLoom" });
  }
}

export async function openDataDir(): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("open_data_dir");
  } catch {
    /* ignore */
  }
}
