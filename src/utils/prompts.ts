const GREETINGS = {
  morning: ["清晨很安静，慢慢写。", "新的一天，从一行字开始。", "晨光未满，先听听心里的声音。"],
  day: ["给此刻留一点空白。", "忙碌之间，也可以停下来写几句。", "把纷杂暂时放在纸上。"],
  evening: ["夜色落下，写下一个字也好。", "今晚，允许思绪慢一点。", "把今天轻轻放在这里。"],
  late: ["夜深了，不必急着想明白。", "世界安静下来，你也可以。", "写完这一页，就安心休息。"],
} as const;

const PLACEHOLDERS = [
  "今天有什么想放下的？",
  "此刻心里最重的一件事是？",
  "把还没说出口的话留在这里。",
  "今天，有哪个瞬间值得记住？",
  "不必完整，先写下浮现的第一个念头。",
  "如果让思绪慢下来，你听见了什么？",
  "给今天写一句温柔的结尾。",
  "此刻的身体和心，分别是什么感觉？",
] as const;

function pick<T>(items: readonly T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

export function greetingForNow(now = new Date(), random = Math.random): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return pick(GREETINGS.morning, random);
  if (hour >= 11 && hour < 18) return pick(GREETINGS.day, random);
  if (hour >= 18 && hour < 23) return pick(GREETINGS.evening, random);
  return pick(GREETINGS.late, random);
}

export function pickPlaceholder(random = Math.random): string {
  return pick(PLACEHOLDERS, random);
}
