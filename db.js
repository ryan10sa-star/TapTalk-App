/* ============================================================
   TapTalk AAC — db.js
   Standalone IndexedDB utility for communication analytics.

   Database : TapTalkDB  (separate from the general event log)
   Store    : comm_events
   Schema   : { id (auto), timestamp, eventType, words, view }

   eventType values:
     'single_word'     – one word was spoken (Yes/No or a single slot tap)
     'sentence_formed' – two-word "X or Y" phrase was spoken
     'clear_board'     – choice board was cleared

   Anderson-OS integration surface:
     window.exportTapTalkData()  →  prints & returns all records as JSON
   ============================================================ */

'use strict';

const CommDB = (() => {
  const DB_NAME    = 'TapTalkDB';
  const DB_VERSION = 1;
  const STORE      = 'comm_events';

  let _db = null;

  /* ---------- open (lazy, cached) ---------- */
  function _open() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

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

  /**
   * Persist one communication event.
   *
   * @param {string}   eventType  'single_word' | 'sentence_formed' | 'clear_board'
   * @param {{ words: string[], view: string }} payload
   */
  async function logEvent(eventType, payload) {
    const record = {
      timestamp: new Date().toISOString(),
      eventType,
      words: Array.isArray(payload.words) ? payload.words : [],
      view:  payload.view  || '',
      user:  window.PartnerMode?.isActive() ? 'partner' : 'student',
    };

    try {
      const db = await _open();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(record);
    } catch (err) {
      console.warn('[TapTalkDB] logEvent failed — app continues normally:', err);
    }
  }

  /**
   * Return all comm_events records (used by exportTapTalkData).
   * @returns {Promise<Array>}
   */
  async function getAll() {
    const db = await _open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  /**
   * Permanently delete every record from comm_events.
   * Used by the Anderson-OS "Clear Local Database" action.
   * @returns {Promise<void>}
   */
  async function clearAll() {
    const db = await _open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  return { logEvent, getAll, clearAll };
})();

/* ============================================================
   window.exportTapTalkData()
   Developer / Anderson-OS helper.
   Call from the browser console to dump the full comm_events
   log as a formatted JSON string.
   ============================================================ */

// Expose CommDB globally so app.js (and Anderson-OS scripts) can call logEvent
window.CommDB = CommDB;

window.exportTapTalkData = async function () {
  const records = await CommDB.getAll();
  const json = JSON.stringify(records, null, 2);
  console.log('[TapTalkDB] exportTapTalkData (' + records.length + ' records):\n', json);
  return json;
};
