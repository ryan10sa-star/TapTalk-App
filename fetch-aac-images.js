#!/usr/bin/env node
/**
 * fetch-aac-images.js
 *
 * Optional script: downloads higher-quality ARASAAC pictograms for the full
 * core vocabulary pack and saves them to aac-images/{word}.png.
 *
 * The app ships bundled SVG pictograms and works fully offline without running
 * this script. Run it to upgrade to official ARASAAC artwork (requires
 * internet access).  Downloaded PNGs are gitignored and must be re-fetched
 * after a clean clone.
 *
 * Usage:  node fetch-aac-images.js
 *         npm run fetch-images
 *
 * Requires Node.js 18+ (uses global fetch).
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

/* ─────────────────────────────────────────────────────────────
   Core Vocabulary Pack  (122 words)
   Map format:  sanitized-filename  →  ARASAAC search term
   ───────────────────────────────────────────────────────────── */
const WORDS = {

  // Pronouns
  'i':            'I',
  'you':          'you',
  'he':           'he',
  'she':          'she',
  'it':           'it',
  'we':           'we',
  'they':         'they',
  'me':           'me',
  'my':           'my',
  'your':         'your',
  'that':         'that',

  // Verbs
  'go':           'go',
  'stop':         'stop',
  'want':         'want',
  'help':         'help',
  'play':         'play',
  'eat':          'eat',
  'drink':        'drink',
  'see':          'see',
  'come':         'come',
  'like':         'like',
  'need':         'need',
  'get':          'get',
  'make':         'make',
  'do':           'do',
  'have':         'have',
  'look':         'look',
  'feel':         'feel',
  'put':          'put',
  'sit':          'sit',
  'stand':        'stand',
  'open':         'open',
  'close':        'close',
  'give':         'give',
  'take':         'take',
  'push':         'push',
  'pull':         'pull',
  'throw':        'throw',
  'jump':         'jump',
  'walk':         'walk',
  'read':         'read',

  // Prepositions
  'in':           'in',
  'on':           'on',
  'up':           'up',
  'down':         'down',
  'out':          'out',
  'off':          'off',
  'here':         'here',
  'there':        'there',
  'with':         'with',
  'away':         'away',

  // Adjectives
  'good':         'good',
  'bad':          'bad',
  'big':          'big',
  'little':       'little',
  'hot':          'hot',
  'cold':         'cold',
  'fast':         'fast',
  'slow':         'slow',
  'dirty':        'dirty',
  'clean':        'clean',
  'loud':         'loud',
  'quiet':        'quiet',
  'different':    'different',
  'same':         'same',
  'favorite':     'favorite',
  'broken':       'broken',

  // Descriptors
  'more':         'more',
  'done':         'done',
  'finished':     'finished',
  'again':        'again',
  'mine':         'mine',

  // Question words
  'what':         'what',
  'where':        'where',
  'when':         'when',
  'why':          'why',
  'who':          'who',
  'how':          'how',

  // Common nouns
  'bathroom':     'bathroom',
  'water':        'water',
  'food':         'food',
  'home':         'home',
  'school':       'school',
  'car':          'car',
  'bed':          'bed',
  'book':         'book',
  'ball':         'ball',
  'music':        'music',
  'outside':      'outside',
  'inside':       'inside',
  'chair':        'chair',
  'table':        'table',

  // Social / Pragmatic
  'yes':          'yes',
  'no':           'no',
  'please':       'please',
  'wait':         'wait',
  'sorry':        'sorry',
  'no-thank-you': 'no thank you',
  'all-done':     'all done',
  'i-dont-know':  'I do not know',
  'good-job':     'good job',

  // Colors
  'red':          'red',
  'blue':         'blue',
  'green':        'green',
  'yellow':       'yellow',
  'orange':       'orange',
  'purple':       'purple',
  'pink':         'pink',

  // Emotions
  'happy':        'happy',
  'sad':          'sad',
  'mad':          'mad',
  'tired':        'tired',
  'hungry':       'hungry',
  'thirsty':      'thirsty',
  'sick':         'sick',
  'hurt':         'hurt',

  // Turn Taking
  'my-turn':      'my turn',
  'your-turn':    'your turn',

  // App Vocabulary
  'rocks':        'rocks',
  'coloring':     'coloring',
  'math':         'mathematics', // 'math' returns no ARASAAC results; 'mathematics' does
  'writing':      'writing',
};

const SEARCH_BASE  = 'https://api.arasaac.org/api/pictograms/en/search/';
const IMG_BASE     = 'https://static.arasaac.org/pictograms/';
const OUT_DIR      = path.join(__dirname, 'aac-images');
const RATE_DELAY   = 500; // ms between requests — respects ARASAAC rate limits

/* Ensure output directory exists */
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Sanitize a phrase into a safe filename.
 * Converts to lowercase, replaces whitespace with hyphens, strips unsafe chars.
 * The WORDS map keys are already sanitized; this is exposed for documentation.
 */
function sanitize(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Pause execution for `ms` milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch JSON from a URL (uses global fetch available in Node 18+) */
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TapTalk-AAC-BuildScript/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

/** Download a binary URL and save it to a local file */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'TapTalk-AAC-BuildScript/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        file.destroy();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      file.destroy();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const entries    = Object.entries(WORDS);
  const downloaded = []; // filenames of successful downloads (for manifest)
  let ok     = 0;
  let failed = 0;

  console.log(`Downloading ${entries.length} ARASAAC pictograms → ${OUT_DIR}\n`);

  for (const [filename, searchTerm] of entries) {
    // Ensure filename is sanitized (defensive; map keys should already be safe)
    const safeFile  = sanitize(filename);
    const searchUrl = `${SEARCH_BASE}${encodeURIComponent(searchTerm)}`;
    process.stdout.write(`  ${safeFile.padEnd(14)} … `);

    let pictogramId;
    try {
      const results = await fetchJson(searchUrl);
      if (!Array.isArray(results) || results.length === 0) {
        console.warn('⚠  no results — skipped');
        failed++;
        await sleep(RATE_DELAY);
        continue;
      }
      pictogramId = results[0]._id;
    } catch (err) {
      console.warn(`✗  search failed: ${err.message}`);
      failed++;
      await sleep(RATE_DELAY);
      continue;
    }

    const imgUrl = `${IMG_BASE}${pictogramId}/${pictogramId}_500.png`;
    const dest   = path.join(OUT_DIR, `${safeFile}.png`);

    try {
      await downloadFile(imgUrl, dest);
      const kb = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(`✓  id=${pictogramId}  (${kb} KB)`);
      downloaded.push(safeFile);
      ok++;
    } catch (err) {
      console.warn(`✗  download failed: ${err.message}`);
      failed++;
    }

    // Rate-limit: pause between every request to avoid hammering the API
    await sleep(RATE_DELAY);
  }

  console.log(`\nDone: ${ok} downloaded, ${failed} failed.\n`);

  // Write vocabulary.json manifest listing all successfully downloaded words
  const manifestPath = path.join(OUT_DIR, 'vocabulary.json');
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(downloaded, null, 2) + '\n');
    console.log(`Manifest written → ${manifestPath}  (${downloaded.length} words)`);
  } catch (err) {
    console.warn(`⚠  Could not write manifest: ${err.message}`);
  }

  // Never exit non-zero — download failures are non-fatal because bundled
  // SVG pictograms serve as offline fallbacks for all vocabulary words.
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
