import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { listEntries, type Entry } from "../db/dexie";
import { useEntryStore } from "../store/useEntryStore";

function isTauri(): boolean {
  return typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined";
}

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

function entryToMarkdown(e: Entry): string {
  return `## ${fmtDateTime(e.createdAt)}\n\n${e.content.trim() || "_（空白）_"}\n`;
}

async function browserDownload(name: string, content: string, mime: string) {
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

export async function exportCurrentAsMarkdown(): Promise<void> {
  await useEntryStore.getState().flush();
  const all = await listEntries();
  const today = new Date();
  const sameDay = all.filter((e) => fmtDate(e.createdAt) === fmtDate(today.getTime()));
  const md =
    `# MindLoom · ${fmtDate(today.getTime())}\n\n` +
    (sameDay.length === 0
      ? "_今天还没有记录。_\n"
      : sameDay.map(entryToMarkdown).join("\n---\n\n"));
  const filename = `mindloom-${fmtDate(today.getTime())}.md`;

  if (isTauri()) {
    const path = await save({
      defaultPath: filename,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!path) return;
    await writeTextFile(path, md);
  } else {
    await browserDownload(filename, md, "text/markdown");
  }
}

export async function exportAllAsJson(): Promise<void> {
  await useEntryStore.getState().flush();
  const all = await listEntries();
  const json = JSON.stringify({ exportedAt: Date.now(), entries: all }, null, 2);
  const filename = `mindloom-all-${fmtDate(Date.now())}.json`;

  if (isTauri()) {
    const path = await save({
      defaultPath: filename,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    await writeTextFile(path, json);
  } else {
    await browserDownload(filename, json, "application/json");
  }
}
