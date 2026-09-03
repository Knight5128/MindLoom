import type { Note } from "../storage/types";

function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function tonightChars(entries: Note[], now = Date.now()): number {
  const today = localDayKey(now);
  return entries.reduce((total, entry) => {
    const content = entry.content.trim();
    return localDayKey(entry.createdAtMs) === today && content ? total + content.length : total;
  }, 0);
}

export function streakDays(entries: Note[], now = Date.now()): number {
  const activeDays = new Set(
    entries.filter((entry) => entry.content.trim()).map((entry) => localDayKey(entry.createdAtMs))
  );
  const today = new Date(now);
  let streak = 0;

  for (;;) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - streak);
    if (!activeDays.has(localDayKey(day.getTime()))) return streak;
    streak += 1;
  }
}
