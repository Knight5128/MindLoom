import Dexie, { type Table } from "dexie";

export interface Entry {
  id?: number;
  createdAt: number;
  updatedAt: number;
  mood?: string;
  content: string;
  tags?: string[];
}

class MindLoomDB extends Dexie {
  entries!: Table<Entry, number>;

  constructor() {
    super("mindloom");
    this.version(1).stores({
      entries: "++id, createdAt, updatedAt",
    });
  }
}

export const db = new MindLoomDB();

export async function createEntry(content = ""): Promise<number> {
  const now = Date.now();
  return db.entries.add({ createdAt: now, updatedAt: now, content });
}

export async function updateEntry(id: number, content: string): Promise<void> {
  await db.entries.update(id, { content, updatedAt: Date.now() });
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id);
}

export async function listEntries(): Promise<Entry[]> {
  return db.entries.orderBy("updatedAt").reverse().toArray();
}
