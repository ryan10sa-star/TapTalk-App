const DB_NAME = "anderson-os";
const DB_VERSION = 1;
const STORE_NAME = "tap-events";

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("word", "word", { unique: false });
        store.createIndex("category", "category", { unique: false });
      }
    };
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

export interface TapEvent {
  id?: number;
  word: string;
  category: string;
  timestamp: number;
  sessionId: string;
}

const SESSION_ID = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function logTap(word: string, category: string): Promise<void> {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const event: TapEvent = {
      word,
      category,
      timestamp: Date.now(),
      sessionId: SESSION_ID,
    };
    store.add(event);
  } catch (e) {
    console.warn("IndexedDB log failed:", e);
  }
}

export async function getAllTaps(): Promise<TapEvent[]> {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function getTapCount(): Promise<number> {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return 0;
  }
}

export async function clearAllTaps(): Promise<void> {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch (e) {
    console.warn("Clear failed:", e);
  }
}
