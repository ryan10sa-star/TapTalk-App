/**
 * TapTalk AAC — Image Verification & Auto-Fix Script
 *
 * For each vocabulary word:
 *   1. Searches ARASAAC API for the word
 *   2. Scores top results by keyword relevance
 *   3. If the best result differs from result[0], downloads the better image
 *   4. Reports confirmed matches, fixes, and unresolvable mismatches
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const VOCAB_FILE = path.join(ROOT, "client/public/vocabulary.json");
const IMG_DIR = path.join(ROOT, "client/public/aac-images");
const ARASAAC_SEARCH = "https://api.arasaac.org/v1/pictograms/en/search/";
const ARASAAC_IMAGE = (id) =>
  `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
const DELAY_MS = 350;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function wordToFilename(word) {
  return word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

/** Score how well a pictogram matches the target word */
function scoreMatch(targetWord, pictogram) {
  const target = targetWord.toLowerCase();
  const targetTokens = target.split(/\s+/);

  const keywords = [
    ...(pictogram.keywords || []).map((k) =>
      (k.keyword || k).toString().toLowerCase()
    ),
  ];

  let score = 0;

  // Exact match on any keyword
  if (keywords.some((k) => k === target)) score += 100;

  // All tokens appear in some keyword
  const allTokensMatch = targetTokens.every((t) =>
    keywords.some((k) => k.includes(t))
  );
  if (allTokensMatch) score += 50;

  // Partial token matches
  for (const token of targetTokens) {
    if (keywords.some((k) => k.includes(token))) score += 10;
  }

  // Penalize if target word doesn't appear at all in keywords
  if (!keywords.some((k) => targetTokens.some((t) => k.includes(t))))
    score -= 20;

  return score;
}

async function searchArasaac(word) {
  const url = `${ARASAAC_SEARCH}${encodeURIComponent(word)}`;
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
  const args = process.argv.slice(2);
  const startArg = args.find((a) => a.startsWith("--start="));
  const countArg = args.find((a) => a.startsWith("--count="));
  const startIdx = startArg ? parseInt(startArg.split("=")[1]) : 0;
  const count = countArg ? parseInt(countArg.split("=")[1]) : Infinity;

  const allVocab = JSON.parse(fs.readFileSync(VOCAB_FILE, "utf8"));
  const vocabulary = allVocab.slice(startIdx, startIdx + count);

  const results = {
    verified: [],
    fixed: [],
    noResults: [],
    lowConfidence: [],
  };

  console.log("=================================================");
  console.log("  TapTalk AAC — Image Verifier & Auto-Fixer");
  console.log("=================================================");
  console.log(`  Checking words ${startIdx + 1}–${startIdx + vocabulary.length} against ARASAAC API`);
  console.log("");

  for (let i = 0; i < vocabulary.length; i++) {
    const item = vocabulary[i];
    const { word } = item;
    const filename = wordToFilename(word);
    const prefix = `[${String(startIdx + i + 1).padStart(3, " ")}/${allVocab.length}]`;

    process.stdout.write(`${prefix} ${word.padEnd(26)}`);

    const pics = await searchArasaac(word);

    if (pics.length === 0) {
      console.log(`NO RESULTS`);
      results.noResults.push(word);
      await sleep(DELAY_MS);
      continue;
    }

    // Score all results, pick best
    const scored = pics
      .slice(0, 10)
      .map((p) => ({ pic: p, score: scoreMatch(word, p) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const first = pics[0];

    const bestId = best.pic._id;
    const firstId = first._id;

    if (best.score < 0) {
      // Very low confidence — no good match found
      const kws = (best.pic.keywords || [])
        .slice(0, 3)
        .map((k) => k.keyword || k)
        .join(", ");
      console.log(`LOW CONF  score=${best.score} best="${kws}"`);
      results.lowConfidence.push({ word, bestKeywords: kws, score: best.score });
      await sleep(DELAY_MS);
      continue;
    }

    if (bestId !== firstId) {
      // Better match found — fix the image
      const kws = (best.pic.keywords || [])
        .slice(0, 3)
        .map((k) => k.keyword || k)
        .join(", ");
      const ok = await downloadImage(bestId, filename);
      if (ok) {
        console.log(`FIXED     (was id:${firstId}, now id:${bestId}) "${kws}"`);
        results.fixed.push({ word, oldId: firstId, newId: bestId, keywords: kws });
      } else {
        console.log(`FIX FAIL  (id:${bestId})`);
      }
    } else {
      // First result is already the best
      const kws = (best.pic.keywords || [])
        .slice(0, 2)
        .map((k) => k.keyword || k)
        .join(", ");
      console.log(`OK        score=${best.score} "${kws}"`);
      results.verified.push(word);
    }

    await sleep(DELAY_MS);
  }

  console.log("");
  console.log("=================================================");
  console.log(`  Verified OK   : ${results.verified.length}`);
  console.log(`  Fixed         : ${results.fixed.length}`);
  console.log(`  No results    : ${results.noResults.length}`);
  console.log(`  Low confidence: ${results.lowConfidence.length}`);
  console.log("=================================================");

  if (results.fixed.length > 0) {
    console.log("\n  FIXED IMAGES:");
    results.fixed.forEach((f) =>
      console.log(`    "${f.word}" → id:${f.newId} (${f.keywords})`)
    );
  }

  if (results.noResults.length > 0) {
    console.log("\n  NO RESULTS:");
    results.noResults.forEach((w) => console.log(`    "${w}"`));
  }

  if (results.lowConfidence.length > 0) {
    console.log("\n  LOW CONFIDENCE (manual review recommended):");
    results.lowConfidence.forEach((f) =>
      console.log(`    "${f.word}" best match: "${f.bestKeywords}" (score=${f.score})`)
    );
  }

  fs.writeFileSync(
    path.join(ROOT, "scripts/verify-report.json"),
    JSON.stringify(results, null, 2)
  );
  console.log("\n  Full report saved to scripts/verify-report.json");
}

main().catch(console.error);
