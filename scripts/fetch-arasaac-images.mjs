/**
 * TapTalk AAC - ARASAAC Image Fetcher
 *
 * Downloads open-source AAC pictograms from ARASAAC (Aragonese Portal of AAC)
 * License: CC BY-NC-SA 4.0
 * Source: https://arasaac.org
 *
 * ARASAAC is the world's leading free AAC symbol library, used by thousands
 * of speech-language pathologists and AAC practitioners globally.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const VOCAB_FILE = path.join(ROOT, "client/public/vocabulary.json");
const OUTPUT_DIR = path.join(ROOT, "client/public/aac-images");
const UPDATED_VOCAB_FILE = path.join(ROOT, "client/public/vocabulary.json");

const ARASAAC_SEARCH = "https://api.arasaac.org/v1/pictograms/en/search/";
const ARASAAC_IMAGE = (id) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

const DELAY_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wordToFilename(word) {
  return word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

async function searchArasaac(word) {
  const encoded = encodeURIComponent(word);
  const url = `${ARASAAC_SEARCH}${encoded}`;
  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "TapTalkAAC/2.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0]._id;
  } catch (e) {
    return null;
  }
}

async function downloadImage(id, filename) {
  const outPath = path.join(OUTPUT_DIR, `${filename}.png`);
  if (fs.existsSync(outPath)) return { skipped: true };

  const url = ARASAAC_IMAGE(id);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buffer);
    return { downloaded: true, bytes: buffer.length };
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const vocabulary = JSON.parse(fs.readFileSync(VOCAB_FILE, "utf8"));
  const updatedVocab = [...vocabulary];

  console.log("=================================================");
  console.log("  TapTalk AAC — ARASAAC Image Fetcher");
  console.log("  License: CC BY-NC-SA 4.0 | arasaac.org");
  console.log("=================================================");
  console.log(`  Words to process: ${vocabulary.length}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log("");

  let downloaded = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < vocabulary.length; i++) {
    const item = vocabulary[i];
    const { word } = item;
    const filename = wordToFilename(word);
    const prefix = `[${String(i + 1).padStart(3, " ")}/${vocabulary.length}]`;

    process.stdout.write(`${prefix} ${word.padEnd(22)}`);

    const outPath = path.join(OUTPUT_DIR, `${filename}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`SKIP (already exists)`);
      skipped++;
      updatedVocab[i] = { ...item };
      continue;
    }

    const arasaacId = await searchArasaac(word);
    if (!arasaacId) {
      console.log(`NOT FOUND`);
      notFound++;
      updatedVocab[i] = { ...item };
      await sleep(DELAY_MS);
      continue;
    }

    const result = await downloadImage(arasaacId, filename);
    if (result.downloaded) {
      console.log(`OK   (id: ${arasaacId}, ${Math.round(result.bytes / 1024)}KB)`);
      downloaded++;
      updatedVocab[i] = { ...item, arasaacId };
    } else if (result.skipped) {
      console.log(`SKIP`);
      skipped++;
      updatedVocab[i] = { ...item };
    } else {
      console.log(`ERR  (${result.error})`);
      errors++;
      updatedVocab[i] = { ...item };
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(UPDATED_VOCAB_FILE, JSON.stringify(updatedVocab, null, 2));

  console.log("");
  console.log("=================================================");
  console.log(`  Downloaded : ${downloaded}`);
  console.log(`  Skipped    : ${skipped}`);
  console.log(`  Not Found  : ${notFound}`);
  console.log(`  Errors     : ${errors}`);
  console.log("  vocabulary.json updated with arasaacId fields");
  console.log("=================================================");
  console.log("");
  console.log("  Attribution required by CC BY-NC-SA 4.0:");
  console.log("  Pictograms by ARASAAC (https://arasaac.org)");
  console.log("  Gobierno de Aragón, Spain. All rights reserved.");
  console.log("=================================================");
}

main().catch(console.error);
