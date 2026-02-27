/* ============================================================
   Exported functions
   ============================================================ */

/**
 * Retrieves the list of active words from localStorage.
 * Returns an empty array if no active vocabulary is set.
 */
function getActiveVocab() {
  try {
    const stored = localStorage.getItem(CONFIG.LS_VOCAB_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return [];
}

/**
 * Placeholder function for Anderson-OS sync.
 * Will be replaced with the actual implementation in the future.
 */
function refresh() {}


window.getVocab = getActiveVocab;
// ============================================================
//   TapTalk AAC — app.js
//   Modular, offline-first AAC application.
//   IndexedDB event log is designed for future Anderson-OS sync.
// ============================================================

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
  TURN_VOCAB: ['my-turn', 'your-turn'],
  LS_VOCAB_KEY: 'activeVocabulary',
  LS_VOICE_KEY: 'selectedVoiceURI',
});

/* ============================================================
   SESSION
   ============================================================ */
const SESSION_ID = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* ============================================================
   PARTNER MODE MODULE
   Activated by the teacher for Aided Language Stimulation.
   All DB events logged while active carry user:'partner' so
   they are excluded from student analytics.
   ============================================================ */
const PartnerMode = (() => {
  let _active = false;

  function isActive() { return _active; }

  function _applyVisual() {
    const app = document.getElementById('app');
    const btn = document.getElementById('partner-mode-toggle');
    if (_active) {
      app.classList.add('partner-mode');
      btn.textContent = '🔓';
      btn.setAttribute('aria-pressed', 'true');
      btn.title = 'Partner Mode ON — tap to disable';
    } else {
      app.classList.remove('partner-mode');
      btn.textContent = '🔒';
      btn.setAttribute('aria-pressed', 'false');
      btn.title = 'Enable Partner Mode';
    }
  }

  function toggle() {
    _active = !_active;
    _applyVisual();
    DB.log('partner_mode_changed', { active: _active });
  }

  function init() {
    document.getElementById('partner-mode-toggle').addEventListener('click', toggle);
    _applyVisual();
  }

  return { isActive, init };
})();

/* ============================================================
   DATABASE MODULE
   Stores every user interaction locally.
   Schema is designed so Anderson-OS can ingest the data later:
     { id, timestamp, sessionId, type, data, user }
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
        // Critical error, keep for debugging if needed
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
      user: PartnerMode.isActive() ? 'partner' : 'student',
    };

    if (!_db) {
      // DB not ready — event not persisted
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

    req.onerror = () => {} // Silent fail
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
  let _unlocked = false;

  /**
   * Fire a silent zero-volume utterance to physically unlock the audio
   * context on iOS / Android, where speechSynthesis requires a user gesture
   * before it will produce any audio.  Called once on the first interaction.
   */
  function _unlock() {
    if (_unlocked || !window.speechSynthesis) return;
    _unlocked = true;
    const silent = new SpeechSynthesisUtterance('');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    /* Apply teacher-selected voice when one has been saved */
    try {
      const uri = localStorage.getItem(CONFIG.LS_VOICE_KEY);
      if (uri) {
        const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === uri);
        if (voice) utt.voice = voice;
      }
    } catch (_) {}
    window.speechSynthesis.speak(utt);
  }

  function init() {
    /* Force the browser to populate the voices list immediately.
     * Chrome / Edge load voices asynchronously; calling getVoices() on
     * window load triggers that population before the teacher opens Settings. */
    window.addEventListener('load', () => window.speechSynthesis?.getVoices());

    /* Unlock audio context on the very first user interaction.
     * Using capture so this fires before any child handler, and { once }
     * so the listener removes itself automatically after the first tap. */
    document.addEventListener('pointerdown', _unlock, { once: true, capture: true });
  }

  return { speak, init };
})();

/* ============================================================
   PICTOGRAM MODULE
   All pictograms are bundled as SVG files in aac-images/
   so the app works fully offline without any network requests.
   Higher-quality ARASAAC PNGs can be downloaded with
   `npm run fetch-images` and will take precedence automatically
   (browser picks the first matching <img src> that loads).
   ============================================================ */
const Pictogram = (() => {
  /**
   * Helper function to try loading a pictogram with the given word.
   * First tries to load [word].png, then falls back to [word].svg if that fails.
   * @param {string} word - the word to load the pictogram for
   * @returns {string} - the path to the loaded image, or null if none found
   */
  const isGitHub = window.location.hostname.includes('github.io');
  const basePath = isGitHub ? 'TapTalk-App/' : '';

  function _loadImagePath(word) {
    return `${basePath}aac-images/${word.toLowerCase()}.png`;
  }

  const getImagePath = (word) => {
    return `${basePath}aac-images/${word.toLowerCase()}.png`;
  };

  function _localPath(word) {
    return `./aac-images/${word.toLowerCase()}.png`;
  }

  /**
   * Load a pictogram into an <img> element from the bundled SVG file.
   * If the file is somehow absent the element stays blank — no broken icon.
   */
  function load(imgEl, word) {
    imgEl.src = `./aac-images/${word.toLowerCase()}.png`;
    imgEl.alt = word;
    // No fallback: let the browser show the broken image icon if missing
    imgEl.onerror = null;
  }

  /** Return the local path for a word (used when filling choice slots) */
  function getCachedUrl(word) {
    return _localPath(word);
  }

  return { load, getCachedUrl };
})();

/* ============================================================
   DEV TOOLS MODULE
   Full-screen developer preview panel (View 3).
   ============================================================ */
const DevTools = (() => {
  const _entries  = () => document.getElementById('dev-preview-entries');
  const _counter  = () => document.getElementById('dev-preview-count');
  let _count = 0;

  function init() {
    /* Populate static status fields */
    document.getElementById('dev-status-session').textContent =
      SESSION_ID.slice(0, 13) + '…';
    document.getElementById('dev-status-version').textContent =
      window.TapTalk?.version ?? '1.0.0';

    document.getElementById('dev-preview-clear').addEventListener('click', () => {
      _entries().innerHTML = '';
      _count = 0;
      _updateCounter();
    });

    document.getElementById('dev-preview-refresh').addEventListener('click', _loadAll);

    document.getElementById('dev-preview-export').addEventListener('click', async () => {
      try {
        const json = await window.exportTapTalkData?.();
        if (!json) { return; }
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `taptalk-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        // Silent fail
      }
    });
  }

  function _updateCounter() {
    _counter().textContent = `${_count} event${_count !== 1 ? 's' : ''} logged`;
  }

  function _renderEntry(entry) {
    const div = document.createElement('div');
    div.className = 'dev-log-entry';
    const time  = new Date(entry.timestamp).toLocaleTimeString();
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
      // Silent fail
    }
  }

  /** Update the DB status badge once the database is open */
  function setDbStatus(ok) {
    const el = document.getElementById('dev-status-db');
    el.textContent = ok ? 'open ✓' : 'error ✗';
    el.className = 'dev-status-value ' + (ok ? 'dev-status-ok' : 'dev-status-err');
  }

  /** Update the SW status badge */
  function setSwStatus(text, ok) {
    const el = document.getElementById('dev-status-sw');
    el.textContent = text;
    el.className = 'dev-status-value ' + (ok ? 'dev-status-ok' : 'dev-status-err');
  }

  return { init, append, setDbStatus, setSwStatus };
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

    const img = document.createElement('img');
    img.alt = word;
    slotEl.appendChild(img);
    Pictogram.load(img, word);

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

  function _buildBank(words) {
    const bank = document.getElementById('choice-bank');
    bank.innerHTML = '';
    words.forEach((word) => {
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

      Pictogram.load(img, word);
      /* Touch-event audit: using 'click' + global CSS touch-action:manipulation
       * eliminates the 300 ms delay without any touchstart listener, so there
       * is no risk of double-firing (no ghost clicks). */
      div.addEventListener('click', () => _handleBankClick(word));
    });
  }

  function init() {
    /* Load active vocabulary from localStorage; fall back to CONFIG.BANK_ITEMS */
    let active;
    try {
      const stored = localStorage.getItem(CONFIG.LS_VOCAB_KEY);
      active = stored ? JSON.parse(stored) : CONFIG.BANK_ITEMS.map(w => w.toLowerCase());
    } catch (_) {
      active = CONFIG.BANK_ITEMS.map(w => w.toLowerCase());
    }
    _buildBank(active);

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

  /** Called by Settings after the teacher saves a new active vocabulary */
  function rebuild(words) {
    [0, 1].forEach(i => { _slots[i] = null; _clearSlot(i); });
    _buildBank(words);
  }

  return { init, rebuild };
})();

/* ============================================================
   TURN TAKING MODULE  (persistent footer)
   "My Turn" and "Your Turn" buttons help the communication
   partner model turn-taking during aided language stimulation.
   These are always visible regardless of the active view.
   ============================================================ */
const TurnTaking = (() => {
  function init() {
    CONFIG.TURN_VOCAB.forEach((id) => {
      const spoken = id.replace('-', ' ');
      const btn = document.getElementById(`btn-${id}`);
      const img = document.getElementById(`img-${id}`);
      Pictogram.load(img, id);
      btn.addEventListener('click', () => {
        Speech.speak(spoken);
        DB.log('vocabulary_use', { word: spoken, category: 'turn_taking' });
        window.CommDB?.logEvent('single_word', { words: [spoken], view: 'turn-taking' });
      });
    });
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
   ANDERSON-OS SYNC MODULE
   Teacher-facing export and database management, accessible
   from the hidden Settings modal.

   • Mini-dashboard: live count + date of oldest record
   • Export: Web Share API (AirDrop / email) → download fallback
   • Clear: high-friction "type DELETE" confirmation
   ============================================================ */
const AndersonOS = (() => {
  /* ── Mini-dashboard: summarise stored data ── */
  async function refresh() {
    const summary = document.getElementById('aos-db-summary');
    if (!summary) return;
    try {
      const records = await CommDB.getAll();
      if (records.length === 0) {
        summary.textContent = 'No interactions stored yet.';
        return;
      }
      const oldest = records.reduce(
        (min, r) => (r.timestamp < min ? r.timestamp : min),
        records[0].timestamp,
      );
      const since = new Date(oldest).toLocaleDateString();
      summary.textContent =
        `Currently storing ${records.length} interaction${records.length !== 1 ? 's' : ''} since ${since}.`;
    } catch (_) {
      summary.textContent = 'Unable to read database.';
    }
  }

  /* ── Export: Web Share API → fallback download ── */
  async function _export() {
    try {
      const payload  = await generateOSPayload();
      const json     = JSON.stringify(payload, null, 2);
      const blob     = new Blob([json], { type: 'application/json' });
      const filename = `taptalk-export-${Date.now()}.json`;

      /* Try Web Share API first (AirDrop / Files / email on iPad/iOS) */
      if (navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'TapTalk Export' });
            DB.log('data_exported', { method: 'share', records: payload.metrics.totalEvents });
            return;
          }
        } catch (shareErr) {
          /* User cancelled or files-share unsupported — fall through to download */
          if (shareErr.name !== 'AbortError') {
            // Silent fail
          } else {
            return; /* User deliberately cancelled — do nothing */
          }
        }
      }

      /* Fallback: force a JSON file download */
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      DB.log('data_exported', { method: 'download', records: payload.metrics.totalEvents });
    } catch (err) {
      // Silent fail
    }
  }

  /* ── Clear: require the teacher to type DELETE ── */
  async function _clear() {
    const answer = window.prompt(
      'This will permanently delete all stored interactions.\n\nType DELETE to confirm:',
    );
    if (answer !== 'DELETE') return;

    try {
      await CommDB.clearAll();
      DB.log('database_cleared', {});
      await refresh();
    } catch (err) {
      // Silent fail
    }
  }

  function init() {
    document.getElementById('aos-export-btn').addEventListener('click', _export);
    document.getElementById('aos-clear-btn').addEventListener('click', _clear);
  }

  return { init, refresh };
})();

/* ============================================================
   SETTINGS MODULE
   Hidden gear button (3-second long-press) opens a full-screen
   modal where the teacher can:
     • select the active Choice Bank vocabulary
     • choose the TTS voice
   Selections are persisted in localStorage.
   ============================================================ */
const Settings = (() => {
  /* Full vocabulary fallback — used when vocabulary.json is unavailable.
   * Mirrors the WORDS map in fetch-aac-images.js. */
  const _VOCAB_FALLBACK = [
    // Pronouns
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your', 'that',
    // Verbs
    'go', 'stop', 'want', 'help', 'play', 'eat', 'drink', 'see', 'come', 'like',
    'need', 'get', 'make', 'do', 'have', 'look', 'feel', 'put', 'sit', 'stand',
    'open', 'close', 'give', 'take', 'push', 'pull', 'throw', 'jump', 'walk', 'read',
    // Prepositions
    'in', 'on', 'up', 'down', 'out', 'off', 'here', 'there', 'with', 'away',
    // Adjectives
    'good', 'bad', 'big', 'little', 'hot', 'cold', 'fast', 'slow', 'dirty', 'clean',
    'loud', 'quiet', 'different', 'same', 'favorite', 'broken',
    // Descriptors
    'more', 'done', 'finished', 'again', 'mine',
    // Questions
    'what', 'where', 'when', 'why', 'who', 'how',
    // Common Nouns
    'bathroom', 'water', 'food', 'home', 'school', 'car', 'bed', 'book', 'ball',
    'music', 'outside', 'inside', 'chair', 'table',
    // Social / Pragmatic
    'yes', 'no', 'please', 'wait', 'sorry', 'no-thank-you', 'all-done',
    'i-dont-know', 'good-job',
    // Colors
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
    // Emotions
    'happy', 'sad', 'mad', 'tired', 'hungry', 'thirsty', 'sick', 'hurt',
    // Turn Taking
    'my-turn', 'your-turn',
    // App Vocabulary
    'rocks', 'coloring', 'math', 'writing',
  ];

  let _allWords = [];
  let _longPressTimer = null;
  const _LONG_PRESS_MS = 3000;

  /* ── Vocabulary helpers ── */
  function getActiveVocab() {
    try {
      const stored = localStorage.getItem(CONFIG.LS_VOCAB_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return CONFIG.BANK_ITEMS.map(w => w.toLowerCase());
  }

  /* ── Load vocabulary.json; fall back to built-in list ── */
  async function _loadVocabList() {
    try {
      const res = await fetch('./aac-images/vocabulary.json');
      if (res.ok) {
        const words = await res.json();
        if (Array.isArray(words) && words.length > 0) return words;
      }
    } catch (_) {}
    return _VOCAB_FALLBACK;
  }

  /* ── Modal open / close ── */
  function _open() {
    _loadVocabList().then((words) => {
      _allWords = words;
      _renderVoices();
      document.getElementById('settings-search').value = '';
      _renderWordGrid(words, '');
      AndersonOS.refresh();
      document.getElementById('settings-modal').classList.add('open');
    });
  }

  function _close() {
    document.getElementById('settings-modal').classList.remove('open');
  }

  /* ── Voice selector ── */
  function _renderVoices() {
    const sel    = document.getElementById('voice-select');
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const saved  = localStorage.getItem(CONFIG.LS_VOICE_KEY) || '';
    sel.innerHTML = '';

    const def = document.createElement('option');
    def.value = '';
    def.textContent = 'Default voice';
    sel.appendChild(def);

    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.voiceURI === saved) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  /* ── Word grid ── */
  function _renderWordGrid(words, query) {
    const grid   = document.getElementById('settings-word-grid');
    const active = new Set(getActiveVocab());
    grid.innerHTML = '';

    const filtered = query
      ? words.filter(w => w.includes(query.toLowerCase()))
      : words;

    filtered.forEach((word) => {
      const isOn = active.has(word);

      const lbl = document.createElement('label');
      lbl.className = 'settings-word-item' + (isOn ? ' active' : '');

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'settings-word-check';
      chk.dataset.word = word;
      chk.checked = isOn;
      chk.addEventListener('change', () => lbl.classList.toggle('active', chk.checked));

      const img = document.createElement('img');
      img.className = 'settings-word-img';
      img.alt = word;
      // Always use Pictogram.load for robust fallback
      Pictogram.load(img, word);

      const span = document.createElement('span');
      span.className = 'settings-word-label';
      span.textContent = word;

      lbl.append(chk, img, span);
      grid.appendChild(lbl);
    });
  }

  /* ── Save ── */
  function _save() {
    const selected = Array.from(
      document.querySelectorAll('.settings-word-check:checked'),
      c => c.dataset.word,
    );
    try { localStorage.setItem(CONFIG.LS_VOCAB_KEY, JSON.stringify(selected)); } catch (_) {}
    ChoiceBoard.rebuild(selected);
    DB.log('settings_saved', { activeVocabulary: selected });
    _close();
  }

  /* ── Long-press detection (3 s) on the gear button ── */
  function _initLongPress() {
    const btn = document.getElementById('settings-btn');

    function _start() {
      _longPressTimer = setTimeout(() => {
        _longPressTimer = null;
        _open();
      }, _LONG_PRESS_MS);
    }

    function _cancel() {
      if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
    }

    btn.addEventListener('pointerdown', _start);
    btn.addEventListener('pointerup',   _cancel);
    btn.addEventListener('pointerleave', _cancel);
    btn.addEventListener('pointercancel', _cancel);
    /* Suppress the native context menu that appears on long-press (mobile) */
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function init() {
    _initLongPress();

    document.getElementById('settings-modal-close')
      .addEventListener('click', _close);
    document.getElementById('settings-save')
      .addEventListener('click', _save);
    document.getElementById('settings-search')
      .addEventListener('input', (e) => _renderWordGrid(_allWords, e.target.value.trim()));
    document.getElementById('voice-select')
      .addEventListener('change', (e) => {
        try { localStorage.setItem(CONFIG.LS_VOICE_KEY, e.target.value); } catch (_) {}
      });

    /* Voices may load asynchronously on some browsers */
    window.speechSynthesis?.addEventListener('voiceschanged', () => {
      if (document.getElementById('settings-modal').classList.contains('open')) {
        _renderVoices();
      }
    });
  }

  return { init, getActiveVocab };
})();

/* ============================================================
   SERVICE WORKER REGISTRATION
   ============================================================ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // Silent for production
        DevTools.setSwStatus('active ✓', true);
      })
      .catch((err) => {
        // Silent for production
        DevTools.setSwStatus('failed ✗', false);
      });
  } else {
    DevTools.setSwStatus('unsupported', false);
  }
}

/* ============================================================
   APP INIT
   ============================================================ */
async function init() {
  registerSW();

  try {
    await DB.open();
    DevTools.setDbStatus(true);
  } catch (err) {
    DevTools.setDbStatus(false);
  }

  Views.init();
  PartnerMode.init();
  Speech.init();
  CoreVocab.init();
  ChoiceBoard.init();
  TurnTaking.init();
  DevTools.init();
  Orientation.init();
  Settings.init();
  AndersonOS.init();

  DB.log('session_start', {
    sessionId: SESSION_ID,
    appVersion: '1.0.0',
    userAgent: navigator.userAgent,
  });

  // Silent for production
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

/* Also expose PartnerMode globally so db.js can read the active state */
window.PartnerMode = PartnerMode;

document.addEventListener('DOMContentLoaded', init);
