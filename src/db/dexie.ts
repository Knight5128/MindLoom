import Dexie, { type Table } from "dexie";

/**
 * 旧存储（IndexedDB）。桌面端已迁移至本地 Markdown 文件（见 src/storage/），
 * 此处仅保留两个用途：
 *  1. 启动时的一次性迁移读取（src/storage/startup.ts）
 *  2. 纯浏览器 `npm run dev` 的开发降级后端（src/storage/dexieBackend.ts）
 */
export interface Entry {
  id?: number;
  /** 字符串 id（新存储层的主键），旧纪录为空 */
  sid?: string;
  createdAt: number;
  updatedAt: number;
  mood?: string;
  tags?: string[];
  content: string;
}

class MindLoomDB extends Dexie {
  entries!: Table<Entry, number>;

  constructor() {
    super("mindloom");
    this.version(1).stores({
      entries: "++id, createdAt, updatedAt",
    });
    this.version(2).stores({
      entries: "++id, createdAt, updatedAt, sid",
    });
  }
}

export const db = new MindLoomDB();
