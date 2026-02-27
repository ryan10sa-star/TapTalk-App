#!/usr/bin/env python3
"""
TapTalk AAC — Asset Audit Script
Verifies every vocabulary.json entry has a matching PNG and MP3.

Usage:
  python scripts/audit_assets.py                  # Full audit
  python scripts/audit_assets.py --voice sarah    # Audit specific voice
  python scripts/audit_assets.py --images-only    # Images only
  python scripts/audit_assets.py --audio-only     # Audio only
  python scripts/audit_assets.py --json           # Machine-readable JSON output
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
VOCAB_FILE = ROOT / "client/public/vocabulary.json"
AUDIO_DIR = ROOT / "client/public/aac-audio"
IMAGE_DIR = ROOT / "client/public/aac-images"

ALL_VOICE_SLUGS = ["sarah", "rachel", "emily", "charlotte", "adam", "josh", "daniel", "antoni"]

def word_to_filename(word: str) -> str:
    return re.sub(r"[^a-z0-9\-]", "", word.lower().replace(" ", "-"))

def audit(voice_slugs: list[str], check_images: bool, check_audio: bool) -> dict:
    if not VOCAB_FILE.exists():
        print(f"✗ vocabulary.json not found at {VOCAB_FILE}", file=sys.stderr)
        sys.exit(1)

    with open(VOCAB_FILE) as f:
        vocab = json.load(f)

    results = {
        "total": len(vocab),
        "missing_images": [],
        "audio_by_voice": {},
        "summary": {},
    }

    for item in vocab:
        word = item["word"]
        category = item.get("category", "?")
        fn = word_to_filename(word)

        if check_images:
            img = IMAGE_DIR / f"{fn}.png"
            if not img.exists():
                results["missing_images"].append({"word": word, "category": category, "expected": str(img)})

        if check_audio:
            for slug in voice_slugs:
                voice_path = AUDIO_DIR / slug / f"{fn}.mp3"
                fallback_path = AUDIO_DIR / f"{fn}.mp3"
                present = voice_path.exists() or (slug == "sarah" and fallback_path.exists())
                if not present:
                    results["audio_by_voice"].setdefault(slug, []).append({
                        "word": word, "category": category, "expected": str(voice_path)
                    })

    img_ok = len(results["missing_images"]) == 0
    results["summary"]["images"] = {
        "total": len(vocab),
        "present": len(vocab) - len(results["missing_images"]),
        "missing": len(results["missing_images"]),
        "ok": img_ok,
    }
    for slug in voice_slugs:
        missing = results["audio_by_voice"].get(slug, [])
        results["summary"][f"audio_{slug}"] = {
            "present": len(vocab) - len(missing),
            "missing": len(missing),
            "ok": len(missing) == 0,
        }

    return results

def print_report(results: dict, voice_slugs: list[str]):
    total = results["total"]
    print(f"\n{'━' * 52}")
    print(f"  TapTalk AAC — Asset Audit Report")
    print(f"  vocabulary.json: {total} words")
    print(f"{'━' * 52}")

    img_summary = results["summary"].get("images")
    if img_summary:
        status = "✅" if img_summary["ok"] else "❌"
        print(f"\n{status} Images ({IMAGE_DIR.name}/)")
        print(f"   Present: {img_summary['present']}/{total}")
        if results["missing_images"]:
            print(f"   Missing: {img_summary['missing']}")
            by_cat: dict[str, list] = {}
            for item in results["missing_images"]:
                by_cat.setdefault(item["category"], []).append(item["word"])
            for cat, words in by_cat.items():
                print(f"     [{cat}] {', '.join(words)}")

    for slug in voice_slugs:
        key = f"audio_{slug}"
        s = results["summary"].get(key)
        if not s:
            continue
        status = "✅" if s["ok"] else "⚠️ "
        missing_items = results["audio_by_voice"].get(slug, [])
        print(f"\n{status} Audio — {slug} ({AUDIO_DIR.name}/{slug}/)")
        print(f"   Present: {s['present']}/{total}")
        if missing_items:
            print(f"   Missing: {s['missing']} words")
            preview = missing_items[:8]
            words_str = ", ".join(i["word"] for i in preview)
            if len(missing_items) > 8:
                words_str += f"  … +{len(missing_items) - 8} more"
            print(f"   {words_str}")
            print(f"\n   To generate: python scripts/generate_audio.py --voice {slug}")

    all_ok = all(s.get("ok", True) for s in results["summary"].values())
    print(f"\n{'━' * 52}")
    if all_ok:
        print("  ✅ All assets verified — zero missing files")
    else:
        total_missing = len(results["missing_images"]) + sum(
            len(v) for v in results["audio_by_voice"].values()
        )
        print(f"  ⚠️  {total_missing} missing files detected")
    print(f"{'━' * 52}\n")

def main():
    parser = argparse.ArgumentParser(description="TapTalk AAC Asset Audit")
    parser.add_argument("--voice", choices=ALL_VOICE_SLUGS + ["all"], default="all",
                        help="Voice to audit (default: all)")
    parser.add_argument("--images-only", action="store_true")
    parser.add_argument("--audio-only", action="store_true")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    args = parser.parse_args()

    check_images = not args.audio_only
    check_audio = not args.images_only

    voice_slugs = ALL_VOICE_SLUGS if args.voice == "all" else [args.voice]

    results = audit(voice_slugs, check_images, check_audio)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print_report(results, voice_slugs)

    any_missing = (
        len(results["missing_images"]) > 0 or
        any(len(v) > 0 for v in results["audio_by_voice"].values())
    )
    sys.exit(1 if any_missing else 0)

if __name__ == "__main__":
    main()
