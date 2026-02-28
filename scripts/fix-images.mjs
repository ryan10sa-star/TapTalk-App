/**
 * TapTalk AAC — Targeted Image Fixer
 *
 * Manually maps problematic words to better ARASAAC search terms,
 * then downloads the best matching pictogram.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMG_DIR = path.join(ROOT, "client/public/aac-images");
const ARASAAC_SEARCH = "https://api.arasaac.org/v1/pictograms/en/search/";
const ARASAAC_BY_ID = (id) => `https://api.arasaac.org/v1/pictograms/${id}`;
const ARASAAC_IMAGE = (id) =>
  `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
const DELAY_MS = 400;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function wordToFilename(word) {
  return word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

// Words with confirmed wrong/poor images and what to search instead
// Format: [vocabWord, searchTerm, optionalPictogramId]
const FIXES = [
  // Street Tacos was (wrongly) fixed to streetlight — use taco pictogram
  ["Street Tacos", null, 39698],     // ARASAAC id for "taco"
  // Multi-word phrases that need specific searches
  ["Don't Like", "dislike"],
  ["All Done", "finished"],
  ["Hot Springs", "thermal spring"],
  ["Pool", "swimming pool"],
  ["Wash Hands", "wash hands"],
  ["Comb Hair", "comb hair"],
  ["Nap Time", "nap"],
  ["Story Time", "story"],
  ["Excuse Me", "excuse"],
  ["Not Ready", "not ready"],
  // Abbreviations with bad matches
  ["OT", "occupational therapy"],
  ["PT", "physical therapy"],
  // Low-confidence that are actually wrong
  ["Art", "art class"],
  ["Library Time", "library"],
  ["Centers", "learning center"],
  // Cultural foods with no direct match — use closest visual
  ["Frybread", "bread"],
  ["Pozole", "soup"],
  ["Tamales", "corn"],
  ["Conchas", "bread roll"],
  // No-result terms
  ["Playdough", "clay play"],
  ["Powwow", "drum"],
  ["Token", "chip"],
  ["Reward", "prize"],
];

async function searchArasaac(term) {
  const url = `${ARASAAC_SEARCH}${encodeURIComponent(term)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "TapTalkAAC/2.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getById(id) {
  try {
    const res = await fetch(ARASAAC_BY_ID(id), {
      headers: { Accept: "application/json", "User-Agent": "TapTalkAAC/2.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function downloadImage(id, filename) {
  const outPath = path.join(IMG_DIR, `${filename}.png`);
  const url = ARASAAC_IMAGE(id);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return false;
    fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("=================================================");
  console.log("  TapTalk AAC — Targeted Image Fixer");
  console.log("=================================================\n");

  const fixed = [];
  const failed = [];

  for (const [word, searchTerm, forcedId] of FIXES) {
    const filename = wordToFilename(word);
    process.stdout.write(`  ${word.padEnd(20)} `);

    let targetId = null;
    let label = "";

    if (forcedId) {
      targetId = forcedId;
      const info = await getById(forcedId);
      label = info
        ? (info.keywords || [])
            .slice(0, 2)
            .map((k) => k.keyword || k)
            .join(", ")
        : `id:${forcedId}`;
      await sleep(DELAY_MS);
    } else {
      const results = await searchArasaac(searchTerm);
      await sleep(DELAY_MS);
      if (results.length === 0) {
        console.log(`NO RESULTS for "${searchTerm}"`);
        failed.push(word);
        continue;
      }
      targetId = results[0]._id;
      label = (results[0].keywords || [])
        .slice(0, 2)
        .map((k) => k.keyword || k)
        .join(", ");
    }

    const ok = await downloadImage(targetId, filename);
    if (ok) {
      console.log(`FIXED → id:${targetId} "${label}"`);
      fixed.push({ word, id: targetId, label });
    } else {
      console.log(`DOWNLOAD FAILED id:${targetId}`);
      failed.push(word);
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=================================================");
  console.log(`  Fixed  : ${fixed.length}`);
  console.log(`  Failed : ${failed.length}`);
  if (failed.length > 0) {
    console.log(`  Failed words: ${failed.join(", ")}`);
  }
  console.log("=================================================");
}

main().catch(console.error);
