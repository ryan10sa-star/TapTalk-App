#!/usr/bin/env node
/**
 * fetch-aac-images.js
 *
 * Build-time script: downloads ARASAAC pictograms for every word in the
 * core vocabulary and saves them to public/aac-images/{word}.png.
 *
 * Usage:  node fetch-aac-images.js
 *         npm run fetch-images
 *
 * Requires Node.js 18+ (uses global fetch).
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

/* Core vocabulary to download.
 * Must mirror CONFIG.CORE_VOCAB + CONFIG.BANK_ITEMS in app.js (all lowercase).
 * Keep these in sync when the vocabulary changes. */
const WORDS = ['yes', 'no', 'rocks', 'ball', 'walk', 'coloring', 'book', 'math', 'writing'];

const SEARCH_BASE = 'https://api.arasaac.org/api/pictograms/en/search/';
const IMG_BASE    = 'https://static.arasaac.org/pictograms/';
const OUT_DIR     = path.join(__dirname, 'public', 'aac-images');

/* Ensure output directory exists */
fs.mkdirSync(OUT_DIR, { recursive: true });

/** Fetch JSON from a URL (uses global fetch available in Node 18+) */
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TapTalk-AAC-BuildScript/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

/** Download a binary URL and pipe it to a local file */
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
  console.log(`Downloading ${WORDS.length} ARASAAC pictograms → ${OUT_DIR}\n`);
  let ok = 0;
  let failed = 0;

  for (const word of WORDS) {
    const searchUrl = `${SEARCH_BASE}${encodeURIComponent(word)}`;
    process.stdout.write(`  ${word.padEnd(10)} … `);

    let id;
    try {
      const results = await fetchJson(searchUrl);
      if (!Array.isArray(results) || results.length === 0) {
        console.log('⚠ no results, skipped');
        failed++;
        continue;
      }
      id = results[0]._id;
    } catch (err) {
      console.log(`✗ search failed: ${err.message}`);
      failed++;
      continue;
    }

    const imgUrl = `${IMG_BASE}${id}/${id}_500.png`;
    const dest   = path.join(OUT_DIR, `${word}.png`);

    try {
      await downloadFile(imgUrl, dest);
      const kb = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(`✓  id=${id}  (${kb} KB)`);
      ok++;
    } catch (err) {
      console.log(`✗ download failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} downloaded, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
