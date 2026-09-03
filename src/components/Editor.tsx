import { useCallback, useEffect, useRef, useState } from "react";
import { useEntryStore } from "../store/useEntryStore";
import { useUiStore } from "../store/useUiStore";
import { pickPlaceholder } from "../utils/prompts";

const FONT_SIZES = { s: 16, m: 18, l: 20 } as const;
const LINE_WIDTHS = { narrow: 560, medium: 640, wide: 760 } as const;

export function Editor() {
  const content = useEntryStore((s) => s.content);
  const currentId = useEntryStore((s) => s.currentId);
  const setContent = useEntryStore((s) => s.setContent);
  const flush = useEntryStore((s) => s.flush);
  const fontSize = useUiStore((s) => s.fontSize);
  const lineWidth = useUiStore((s) => s.lineWidth);
  const ref = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [placeholder, setPlaceholder] = useState(() => pickPlaceholder());

  useEffect(() => {
    if (currentId === null) setPlaceholder(pickPlaceholder());
  }, [currentId]);

  const centerCaret = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const textarea = ref.current;
      const scroller = scrollRef.current;
      const mirror = mirrorRef.current;
      if (!textarea || !scroller || !mirror) return;

      const style = getComputedStyle(textarea);
      Object.assign(mirror.style, {
        boxSizing: style.boxSizing,
        width: `${textarea.clientWidth}px`,
        font: style.font,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        padding: style.padding,
        border: style.border,
      });
      mirror.textContent = `${textarea.value.slice(0, textarea.selectionStart)}\u200b`;

      const caretY = mirror.scrollHeight;
      const target = textarea.offsetTop + caretY - scroller.clientHeight / 2;
      scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    });
  }, []);

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
    centerCaret();
  }, [content]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  return (
    <div
      ref={scrollRef}
      className="pointer-events-none flex h-full w-full items-start justify-center overflow-y-auto px-6 pb-[50vh] pt-[18vh]"
    >
      <div
        className="pointer-events-auto w-full"
        style={{ maxWidth: `${LINE_WIDTHS[lineWidth]}px` }}
      >
        <textarea
          ref={ref}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            centerCaret();
          }}
          onKeyUp={centerCaret}
          onClick={centerCaret}
          onSelect={centerCaret}
          placeholder={placeholder}
          spellCheck={false}
          autoFocus
          className="w-full resize-none bg-transparent leading-[2] tracking-[0.02em] text-[color:var(--fg-1)] placeholder:text-[color:var(--fg-faint)] focus:outline-none"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: `${FONT_SIZES[fontSize]}px`,
            minHeight: "60vh",
            caretColor: "var(--accent)",
          }}
        />
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre-wrap break-words"
        />
      </div>
    </div>
  );
}
