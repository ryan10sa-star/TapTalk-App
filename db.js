
'use strict';

const DB_NAME = 'TapTalkDB';
const STORE = 'comm_events';
let _db = null;

async function _open() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = (e) => {
      console.warn('[TapTalkDB] Open error — logging disabled, app continues normally:', e.target.error);
      reject(e.target.error);
    };
  });
}

export const CommDB = {
  async logEvent(eventType, payload) {
    const record = {
      timestamp: new Date().toISOString(),
      eventType,
      words: Array.isArray(payload.words) ? payload.words : [],
      view: payload.view || '',
      user: window.PartnerMode?.isActive() ? 'partner' : 'student',
    };
    try {
      const db = await _open();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(record);
    } catch (err) {
      console.warn('[TapTalkDB] logEvent failed — app continues normally:', err);
    }
  },

  async getAll() {
    const db = await _open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async clearAll() {
    const db = await _open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};

// Expose for Anderson-OS and browser console
window.CommDB = CommDB;
window.exportTapTalkData = async function () {
  const records = await CommDB.getAll();
  const json = JSON.stringify(records, null, 2);
  console.log('[TapTalkDB] exportTapTalkData (' + records.length + ' records):\n', json);
  return json;
};
