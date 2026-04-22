import { useLiveQuery } from "dexie-react-hooks";
import { db, deleteEntry } from "../db/dexie";
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
  const entries = useLiveQuery(
    () => db.entries.orderBy("updatedAt").reverse().limit(60).toArray(),
    [],
    []
  );
  const currentId = useEntryStore((s) => s.currentId);
  const loadEntry = useEntryStore((s) => s.loadEntry);
  const newEntry = useEntryStore((s) => s.newEntry);
  const flush = useEntryStore((s) => s.flush);

  const onSelect = async (id: number, content: string) => {
    await flush();
    loadEntry(id, content);
  };

  const onDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteEntry(id);
    if (currentId === id) {
      await newEntry();
    }
  };

  return (
    <div className="glass-panel m-3 flex h-[calc(100vh-1.5rem)] w-72 flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-4 py-3">
        <span className="text-xs tracking-widest text-[color:var(--fg-3)]">夜笺</span>
        <button
          onClick={() => void newEntry()}
          className="rounded-full px-2.5 py-1 text-xs text-[color:var(--fg-2)] transition-colors hover:bg-white/8 hover:text-[color:var(--fg-1)]"
          title="新建笔记"
        >
          + 新建
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {(entries ?? []).map((e) => {
          const active = e.id === currentId;
          return (
            <button
              key={e.id}
              onClick={() => void onSelect(e.id!, e.content)}
              className={[
                "group block w-full px-4 py-3 text-left transition-colors",
                active
                  ? "bg-white/6"
                  : "hover:bg-white/4",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between text-[10px] tracking-wider text-[color:var(--fg-3)]">
                <span>{fmtDate(e.updatedAt)}</span>
                <span
                  onClick={(ev) => void onDelete(ev, e.id!)}
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
        {(!entries || entries.length === 0) && (
          <div className="px-4 py-8 text-center text-xs text-[color:var(--fg-3)]">
            还没有笔记，开始写下今晚的第一行吧。
          </div>
        )}
      </div>
    </div>
  );
}
