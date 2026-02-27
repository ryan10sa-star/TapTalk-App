/**
 * Fetch remaining ARASAAC images with fallback search terms for cultural words.
 * All images: CC BY-NC-SA 4.0 | ARASAAC - arasaac.org | Gobierno de Aragón, Spain
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const VOCAB_FILE = path.join(ROOT, "client/public/vocabulary.json");
const OUTPUT_DIR = path.join(ROOT, "client/public/aac-images");

const ARASAAC_SEARCH = "https://api.arasaac.org/v1/pictograms/en/search/";
const ARASAAC_IMAGE = (id) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
const DELAY_MS = 200;

const FALLBACKS = {
  "frybread": ["flatbread", "bread"],
  "pozole": ["soup", "corn soup", "mexican food"],
  "tamales": ["tamale", "corn", "food"],
  "conchas": ["bread roll", "sweet bread", "bun"],
  "lakeport": ["lake", "city"],
  "clearlake": ["lake", "clear lake"],
  "middletown": ["town", "village"],
  "kelseyville": ["town", "village"],
  "konocti": ["mountain", "volcano"],
  "powwow": ["celebration", "dance", "festival"],
  "pomo": ["native american", "indigenous", "person"],
  "tribal": ["indigenous", "native", "community"],
  "maya": ["girl", "child", "person"],
  "excuse-me": ["excuse", "sorry", "pardon"],
};

function wordToFilename(word) {
  return word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchArasaac(term) {
  const url = `${ARASAAC_SEARCH}${encodeURIComponent(term)}`;
  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "TapTalkAAC/2.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0]._id;
  } catch {
    return null;
  }
}

async function downloadImage(id, filename) {
  const outPath = path.join(OUTPUT_DIR, `${filename}.png`);
  const url = ARASAAC_IMAGE(id);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buffer);
    return buffer.length;
  } catch {
    return false;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const vocabulary = JSON.parse(fs.readFileSync(VOCAB_FILE, "utf8"));

  const missing = vocabulary.filter((item) => {
    const fn = wordToFilename(item.word);
    return !fs.existsSync(path.join(OUTPUT_DIR, `${fn}.png`));
  });

  console.log(`Fetching ${missing.length} remaining images from ARASAAC...`);
  console.log("License: CC BY-NC-SA 4.0 | arasaac.org\n");

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const item = missing[i];
    const word = item.word;
    const filename = wordToFilename(word);
    const prefix = `[${String(i + 1).padStart(3, " ")}/${missing.length}]`;

    process.stdout.write(`${prefix} ${word.padEnd(24)}`);

    const outPath = path.join(OUTPUT_DIR, `${filename}.png`);
    if (fs.existsSync(outPath)) {
      console.log("SKIP");
      continue;
    }

    let id = await searchArasaac(word);
    let source = word;

    if (!id && FALLBACKS[filename]) {
      for (const fallback of FALLBACKS[filename]) {
        id = await searchArasaac(fallback);
        if (id) { source = fallback; break; }
        await sleep(100);
      }
    }

    if (!id) {
      console.log("NOT FOUND");
      failed++;
      await sleep(DELAY_MS);
      continue;
    }

    const bytes = await downloadImage(id, filename);
    if (bytes) {
      console.log(`OK   (id:${id} via "${source}", ${Math.round(bytes / 1024)}KB)`);
      ok++;
    } else {
      console.log(`ERR  (download failed)`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${ok} downloaded, ${failed} failed/not-found`);
  console.log("\nAttribution: Pictograms by ARASAAC (https://arasaac.org)");
  console.log("Gobierno de Aragón, Spain. CC BY-NC-SA 4.0");
}

main().catch(console.error);
