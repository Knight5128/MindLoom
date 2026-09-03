import { useState } from "react";
import { useEntryStore } from "../store/useEntryStore";

function fmtDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return `今天 ${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function preview(content: string) {
  const t = content.trim().replace(/\s+/g, " ");
  if (!t) return "（空白）";
  return t.length > 36 ? t.slice(0, 36) + "…" : t;
}

export function SideEntries() {
  const entries = useEntryStore((s) => s.entries);
  const currentId = useEntryStore((s) => s.currentId);
  const loadEntry = useEntryStore((s) => s.loadEntry);
  const newEntry = useEntryStore((s) => s.newEntry);
  const deleteEntry = useEntryStore((s) => s.deleteEntry);
  const flush = useEntryStore((s) => s.flush);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredEntries = normalizedQuery
    ? entries.filter((entry) => entry.content.toLocaleLowerCase().includes(normalizedQuery))
    : entries;

  const onSelect = async (id: string) => {
    await flush();
    loadEntry(id);
  };

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteEntry(id);
  };

  return (
    <div className="glass-panel m-3 flex h-[calc(100vh-1.5rem)] w-72 flex-col rounded-2xl">
      <div className="border-b border-[color:var(--hairline)] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest text-[color:var(--fg-3)]">夜笺</span>
          <button
            onClick={() => void newEntry()}
            className="rounded-full px-2.5 py-1 text-xs text-[color:var(--fg-2)] transition-colors hover:bg-white/8 hover:text-[color:var(--fg-1)]"
            title="新建笔记"
          >
            + 新建
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索笔记内容"
          aria-label="搜索历史笔记"
          className="mt-3 w-full rounded-lg border border-[color:var(--hairline)] bg-white/4 px-3 py-2 text-xs text-[color:var(--fg-1)] placeholder:text-[color:var(--fg-faint)] focus:border-[color:var(--hairline-strong)] focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filteredEntries.map((e) => {
          const active = e.id === currentId;
          return (
            <button
              key={e.id}
              onClick={() => void onSelect(e.id)}
              className={[
                "group block w-full px-4 py-3 text-left transition-colors",
                active ? "bg-white/6" : "hover:bg-white/4",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between text-[10px] tracking-wider text-[color:var(--fg-3)]">
                <span>{fmtDate(e.updatedAtMs)}</span>
                <span
                  onClick={(ev) => void onDelete(ev, e.id)}
                  className="opacity-0 transition-opacity hover:text-[color:var(--fg-1)] group-hover:opacity-100"
                  role="button"
                  title="删除"
                >
                  删除
                </span>
              </div>
              <div
                className={[
                  "text-[13px] leading-snug",
                  active ? "text-[color:var(--fg-1)]" : "text-[color:var(--fg-2)]",
                ].join(" ")}
              >
                {preview(e.content)}
              </div>
            </button>
          );
        })}
        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[color:var(--fg-3)]">
            还没有笔记，开始写下今晚的第一行吧。
          </div>
        )}
        {entries.length > 0 && filteredEntries.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[color:var(--fg-3)]">
            没有找到匹配的笔记。
          </div>
        )}
      </div>
    </div>
  );
}
