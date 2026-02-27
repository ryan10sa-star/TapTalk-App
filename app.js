/* ============================================================
   TapTalk AAC — app.js
   Modular, offline-first AAC application.
   IndexedDB event log is designed for future Anderson-OS sync.
   ============================================================ */

'use strict';

/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = Object.freeze({
  DB_NAME: 'taptalk-db',
  DB_VERSION: 1,
  STORE_EVENTS: 'events',
  BANK_ITEMS: ['Rocks', 'Ball', 'Walk', 'Coloring', 'Book', 'Math', 'Writing'],
  CORE_VOCAB: ['Yes', 'No'],
});

/* ============================================================
   SESSION
   ============================================================ */
const SESSION_ID = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* ============================================================
   DATABASE MODULE
   Stores every user interaction locally.
   Schema is designed so Anderson-OS can ingest the data later:
     { id, timestamp, sessionId, type, data }
   ============================================================ */
const DB = (() => {
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(CONFIG.STORE_EVENTS)) {
          const store = database.createObjectStore(CONFIG.STORE_EVENTS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };

      req.onerror = (e) => {
        console.error('[TapTalk] IndexedDB open error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  function log(type, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: SESSION_ID,
      type,
      data,
    };

    if (!_db) {
      console.warn('[TapTalk] DB not ready — event not persisted:', entry);
      DevTools.append({ ...entry, id: 'pending' });
      return;
    }

    const tx = _db.transaction(CONFIG.STORE_EVENTS, 'readwrite');
    const store = tx.objectStore(CONFIG.STORE_EVENTS);
    const req = store.add(entry);

    req.onsuccess = (e) => {
      entry.id = e.target.result;
      DevTools.append(entry);
    };

    req.onerror = () => console.error('[TapTalk] Failed to persist event');
  }

  function getAll() {
    return new Promise((resolve, reject) => {
      if (!_db) return reject(new Error('DB not ready'));
      const tx = _db.transaction(CONFIG.STORE_EVENTS, 'readonly');
      const req = tx.objectStore(CONFIG.STORE_EVENTS).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return { open, log, getAll };
})();

/* ============================================================
   SPEECH MODULE
   ============================================================ */
const Speech = (() => {
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    window.speechSynthesis.speak(utt);
  }

  return { speak };
})();

/* ============================================================
   PICTOGRAM MODULE
   Resolves pictograms from locally-downloaded files.
   Run `npm run fetch-images` before serving to populate
   public/aac-images/{word}.png for all core vocabulary.
   ============================================================ */
const Pictogram = (() => {
  /** Absolute-root path for a pre-downloaded pictogram */
  function _localPath(word) {
    return `./aac-images/${word.toLowerCase()}.png`;
  }

  /**
   * Load a pictogram into an <img> element from the local file.
   * If the file is absent (images not yet downloaded), the element
   * stays hidden and the text label remains visible — no broken icon.
   */
  function load(imgEl, word) {
    imgEl.src = _localPath(word);
    imgEl.onerror = () => imgEl.removeAttribute('src');
  }

  /** Return the local path for a word (used when filling choice slots) */
  function getCachedUrl(word) {
    return _localPath(word);
  }

  return { load, getCachedUrl };
})();

/* ============================================================
   DEV TOOLS MODULE
   Real-time IndexedDB event log panel.
   Proves data capture for the future Anderson-OS integration.
   ============================================================ */
const DevTools = (() => {
  const _panel = () => document.getElementById('dev-tools-panel');
  const _entries = () => document.getElementById('dev-log-entries');
  const _counter = () => document.getElementById('dev-event-count');
  let _count = 0;

  function init() {
    document.getElementById('dev-tools-toggle').addEventListener('click', () => {
      _panel().classList.toggle('hidden');
      if (!_panel().classList.contains('hidden')) _loadAll();
    });

    document.getElementById('dev-tools-close').addEventListener('click', () => {
      _panel().classList.add('hidden');
    });

    document.getElementById('dev-clear-log').addEventListener('click', () => {
      _entries().innerHTML = '';
      _count = 0;
      _updateCounter();
    });
  }

  function _updateCounter() {
    _counter().textContent = `${_count} event${_count !== 1 ? 's' : ''} logged`;
  }

  function _renderEntry(entry) {
    const div = document.createElement('div');
    div.className = 'dev-log-entry';
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const idStr = entry.id != null ? `[${entry.id}] ` : '';
    div.innerHTML =
      `<span class="log-time">${time}</span>` +
      `<span class="log-type">${idStr}${entry.type}</span>` +
      `${JSON.stringify(entry.data)}`;
    return div;
  }

  /** Called by DB.log() immediately after a successful write */
  function append(entry) {
    _count++;
    _updateCounter();
    if (_panel().classList.contains('hidden')) return;
    _entries().prepend(_renderEntry(entry));
  }

  async function _loadAll() {
    try {
      const events = await DB.getAll();
      _entries().innerHTML = '';
      _count = events.length;
      _updateCounter();
      [...events].reverse().forEach((e) => _entries().appendChild(_renderEntry(e)));
    } catch (err) {
      console.warn('[TapTalk] DevTools load failed:', err);
    }
  }

  return { init, append };
})();

/* ============================================================
   VIEW MODULE
   ============================================================ */
const Views = (() => {
  function switchTo(viewId) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    document.querySelector(`.nav-btn[data-view="${viewId}"]`).classList.add('active');
    DB.log('view_changed', { view: viewId });
  }

  function init() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTo(btn.dataset.view));
    });
  }

  return { init, switchTo };
})();

/* ============================================================
   CORE VOCAB MODULE  (View 1 — Yes / No)
   ============================================================ */
const CoreVocab = (() => {
  function init() {
    const words = ['yes', 'no'];
    words.forEach((word) => {
      const btn = document.getElementById(`btn-${word}`);
      const img = document.getElementById(`img-${word}`);
      Pictogram.load(img, word);
      btn.addEventListener('click', () => {
        Speech.speak(word);
        DB.log('vocabulary_use', { word, category: 'core_vocab' });
        window.CommDB?.logEvent('single_word', { words: [word], view: 'core-vocab' });
      });
    });
  }

  return { init };
})();

/* ============================================================
   CHOICE BOARD MODULE  (View 2 — Tap-to-Fill)
   ============================================================ */
const ChoiceBoard = (() => {
  const _slots = [null, null]; // [item1, item2]

  function _fillSlot(index, word) {
    const slotEl = document.getElementById(`slot-${index + 1}`);
    slotEl.classList.remove('empty');
    slotEl.innerHTML = '';

    const url = Pictogram.getCachedUrl(word);
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = word;
      slotEl.appendChild(img);
    }

    const lbl = document.createElement('span');
    lbl.className = 'slot-label';
    lbl.textContent = word;
    slotEl.appendChild(lbl);
  }

  function _clearSlot(index) {
    const slotEl = document.getElementById(`slot-${index + 1}`);
    slotEl.classList.add('empty');
    slotEl.innerHTML = '<span class="slot-placeholder">?</span>';
  }

  function _handleBankClick(word) {
    if (_slots[0] === null) {
      _slots[0] = word;
      _fillSlot(0, word);
      DB.log('choice_slot_filled', { slot: 1, word });
    } else if (_slots[1] === null) {
      _slots[1] = word;
      _fillSlot(1, word);
      const phrase = `${_slots[0]} or ${_slots[1]}`;
      Speech.speak(phrase);
      DB.log('choice_made', { choice1: _slots[0], choice2: _slots[1], phrase });
      window.CommDB?.logEvent('sentence_formed', { words: [_slots[0], _slots[1]], view: 'choice-board' });
    } else {
      /* Both slots full — re-speak current phrase */
      Speech.speak(`${_slots[0]} or ${_slots[1]}`);
      window.CommDB?.logEvent('sentence_formed', { words: [_slots[0], _slots[1]], view: 'choice-board' });
    }
  }

  function _clearAll() {
    _slots[0] = null;
    _slots[1] = null;
    _clearSlot(0);
    _clearSlot(1);
    DB.log('choice_cleared', {});
    window.CommDB?.logEvent('clear_board', { words: [], view: 'choice-board' });
  }

  function init() {
    const bank = document.getElementById('choice-bank');

    CONFIG.BANK_ITEMS.forEach((word) => {
      const div = document.createElement('div');
      div.className = 'bank-item';
      div.setAttribute('role', 'button');
      div.setAttribute('aria-label', word);
      div.dataset.word = word;

      const img = document.createElement('img');
      img.alt = word;

      const lbl = document.createElement('span');
      lbl.className = 'item-label';
      lbl.textContent = word;

      div.appendChild(img);
      div.appendChild(lbl);
      bank.appendChild(div);

      Pictogram.load(img, word.toLowerCase());
      div.addEventListener('click', () => _handleBankClick(word));
    });

    /* Filled slot tap → speak that item */
    document.getElementById('slot-1').addEventListener('click', () => {
      if (_slots[0]) {
        Speech.speak(_slots[0]);
        window.CommDB?.logEvent('single_word', { words: [_slots[0]], view: 'choice-board' });
      }
    });
    document.getElementById('slot-2').addEventListener('click', () => {
      if (_slots[1]) {
        Speech.speak(_slots[1]);
        window.CommDB?.logEvent('single_word', { words: [_slots[1]], view: 'choice-board' });
      }
    });

    document.getElementById('btn-clear').addEventListener('click', _clearAll);
  }

  return { init };
})();

/* ============================================================
   ORIENTATION MODULE
   ============================================================ */
const Orientation = (() => {
  function check() {
    const warn = document.getElementById('orientation-warning');
    if (window.innerWidth < window.innerHeight) {
      warn.classList.add('visible');
    } else {
      warn.classList.remove('visible');
    }
  }

  function init() {
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
  }

  return { init };
})();

/* ============================================================
   SERVICE WORKER REGISTRATION
   ============================================================ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => console.log('[TapTalk] SW registered:', reg.scope))
      .catch((err) => console.warn('[TapTalk] SW registration failed:', err));
  }
}

/* ============================================================
   APP INIT
   ============================================================ */
async function init() {
  registerSW();

  await DB.open();

  Views.init();
  CoreVocab.init();
  ChoiceBoard.init();
  DevTools.init();
  Orientation.init();

  DB.log('session_start', {
    sessionId: SESSION_ID,
    appVersion: '1.0.0',
    userAgent: navigator.userAgent,
  });

  console.log('[TapTalk] Ready. Session:', SESSION_ID);
}

/* ============================================================
   PUBLIC API  (Anderson-OS integration surface)
   External systems can call window.TapTalk.exportData() to
   retrieve the full IndexedDB event log for sync/analysis.
   ============================================================ */
window.TapTalk = {
  version: '1.0.0',
  getSessionId: () => SESSION_ID,
  /** Returns a Promise<Array> of all logged events */
  exportData: () => DB.getAll(),
};

document.addEventListener('DOMContentLoaded', init);
