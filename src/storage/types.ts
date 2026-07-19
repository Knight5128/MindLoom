export interface Note {
  id: string;
  createdAtMs: number;
  updatedAtMs: number;
  mood?: string;
  tags: string[];
  content: string;
}

export function isTauri(): boolean {
  return (
    typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !==
    "undefined"
  );
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
