import { useEffect, useRef } from "react";
import { useEntryStore } from "../store/useEntryStore";

const PLACEHOLDER = "今晚，写下一个字也好。";

export function Editor() {
  const content = useEntryStore((s) => s.content);
  const setContent = useEntryStore((s) => s.setContent);
  const flush = useEntryStore((s) => s.flush);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onBeforeUnload = () => {
      void flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  return (
    <div className="pointer-events-none flex h-full w-full items-start justify-center overflow-y-auto px-6 py-[18vh]">
      <div className="pointer-events-auto w-full max-w-[640px]">
        <textarea
          ref={ref}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          autoFocus
          className="w-full resize-none bg-transparent text-[18px] leading-[2] tracking-[0.02em] text-[color:var(--fg-1)] placeholder:text-[color:var(--fg-faint)] focus:outline-none"
          style={{
            fontFamily: "var(--font-serif)",
            minHeight: "60vh",
            caretColor: "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
