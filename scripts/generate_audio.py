#!/usr/bin/env python3
"""
TapTalk AAC — ElevenLabs Voice Bake Pipeline
Usage:
  python scripts/generate_audio.py                  # Primary voice (Sarah) only
  python scripts/generate_audio.py --voice rachel   # Single alternate voice
  python scripts/generate_audio.py --all-voices     # All 8 voices
  python scripts/generate_audio.py --voice sarah --words "Hello,Goodbye,Break"
  python scripts/generate_audio.py --audit          # Run asset audit only
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
VOCAB_FILE = ROOT / "client/public/vocabulary.json"
AUDIO_DIR = ROOT / "client/public/aac-audio"
IMAGE_DIR = ROOT / "client/public/aac-images"

ELEVEN_API_KEY = os.environ.get("ELEVEN_API_KEY", "")
MODEL_ID = "eleven_turbo_v2_5"
BASE_URL = "https://api.elevenlabs.io/v1"

VOICES = {
    "sarah":     {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah",    "gender": "Female", "accent": "American", "style": "Warm & Calm"},
    "rachel":    {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel",   "gender": "Female", "accent": "American", "style": "Clear & Bright"},
    "emily":     {"id": "LcfcDJNUP1GQjkzn1xUU", "name": "Emily",    "gender": "Female", "accent": "American", "style": "Gentle & Soft"},
    "charlotte": {"id": "XB0fDUnXU5powFXDhCwa", "name": "Charlotte","gender": "Female", "accent": "British",  "style": "Crisp & Friendly"},
    "adam":      {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam",     "gender": "Male",   "accent": "American", "style": "Steady & Clear"},
    "josh":      {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh",     "gender": "Male",   "accent": "American", "style": "Deep & Warm"},
    "daniel":    {"id": "onwK4e9ZLuTAKqWW03F9", "name": "Daniel",   "gender": "Male",   "accent": "British",  "style": "Authoritative"},
    "antoni":    {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni",   "gender": "Male",   "accent": "American", "style": "Relaxed & Friendly"},
}

LAKE_COUNTY_WORDS = {
    "frybread", "acorn mush", "pozole", "tamales", "conchas", "street tacos",
    "horchata", "pears", "walnuts", "pomo", "lake county", "clearlake",
    "lakeport", "kelseyville", "middletown", "ukiah", "mendocino",
}

def word_to_filename(word: str) -> str:
    return re.sub(r"[^a-z0-9\-]", "", word.lower().replace(" ", "-"))

def is_lake_county_word(word: str) -> bool:
    return word.lower() in LAKE_COUNTY_WORDS

def get_voice_settings(word: str) -> dict:
    if is_lake_county_word(word):
        return {
            "stability": 0.85,
            "similarity_boost": 0.80,
            "style": 0.20,
            "use_speaker_boost": True,
        }
    return {
        "stability": 0.55,
        "similarity_boost": 0.75,
        "style": 0.30,
        "use_speaker_boost": True,
    }

def generate_word(word: str, voice_slug: str, out_dir: Path, skip_existing: bool = True) -> bool:
    voice = VOICES[voice_slug]
    filename = word_to_filename(word) + ".mp3"
    out_path = out_dir / filename

    if skip_existing and out_path.exists() and out_path.stat().st_size > 1024:
        return True

    headers = {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    payload = {
        "text": word,
        "model_id": MODEL_ID,
        "voice_settings": get_voice_settings(word),
    }

    url = f"{BASE_URL}/text-to-speech/{voice['id']}?output_format=mp3_44100_128"

    for attempt in range(3):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                out_path.write_bytes(resp.content)
                return True
            elif resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 10)) + 2
                print(f"  ⏳ Rate limited — waiting {wait}s...")
                time.sleep(wait)
            elif resp.status_code == 401:
                print("  ✗ Invalid API key. Check ELEVEN_API_KEY secret.")
                return False
            else:
                print(f"  ✗ HTTP {resp.status_code}: {resp.text[:120]}")
                if attempt < 2:
                    time.sleep(2)
        except requests.RequestException as e:
            print(f"  ✗ Network error: {e}")
            if attempt < 2:
                time.sleep(3)

    return False

def run_audit():
    print("\n━━━ Asset Audit ━━━")
    if not VOCAB_FILE.exists():
        print(f"✗ vocabulary.json not found at {VOCAB_FILE}")
        return

    with open(VOCAB_FILE) as f:
        vocab = json.load(f)

    missing_images = []
    missing_audio = {}

    for item in vocab:
        word = item["word"]
        fn = word_to_filename(word)

        img = IMAGE_DIR / f"{fn}.png"
        if not img.exists():
            missing_images.append(word)

        for slug in VOICES:
            audio = AUDIO_DIR / slug / f"{fn}.mp3"
            fallback = AUDIO_DIR / f"{fn}.mp3"
            if not audio.exists() and not fallback.exists():
                missing_audio.setdefault(slug, []).append(word)

    print(f"\nTotal words: {len(vocab)}")

    if missing_images:
        print(f"\n🖼  Missing images ({len(missing_images)}):")
        for w in missing_images:
            print(f"  • {w}")
    else:
        print(f"\n✅ All {len(vocab)} images present")

    for slug, words in missing_audio.items():
        print(f"\n🔊 Missing audio for '{slug}' ({len(words)} words):")
        for w in words[:10]:
            print(f"  • {w}")
        if len(words) > 10:
            print(f"  ... and {len(words) - 10} more")

    if not missing_audio:
        print(f"\n✅ All audio files present for all voices")

    print()

def bake_voice(voice_slug: str, words: list[str], label: str = ""):
    voice = VOICES[voice_slug]
    out_dir = AUDIO_DIR / voice_slug
    out_dir.mkdir(parents=True, exist_ok=True)

    gender_icon = "♀" if voice["gender"] == "Female" else "♂"
    print(f"\n{'━' * 50}")
    print(f" {gender_icon}  {voice['name']} ({voice_slug}) — {voice['style']} · {voice['accent']}")
    print(f"    Voice ID: {voice['id']}")
    print(f"    Words to generate: {len(words)}")
    print(f"{'━' * 50}")

    success = 0
    skipped = 0
    failed = []

    for i, word in enumerate(words, 1):
        filename = word_to_filename(word)
        out_path = out_dir / f"{filename}.mp3"
        marker = "🏔 " if is_lake_county_word(word) else ""
        prefix = f"  [{i:>3}/{len(words)}] {marker}{word}"

        if out_path.exists() and out_path.stat().st_size > 1024:
            print(f"{prefix:<45} ⏭  skip")
            skipped += 1
            continue

        print(f"{prefix:<45} ", end="", flush=True)
        ok = generate_word(word, voice_slug, out_dir)
        if ok:
            size_kb = (out_dir / f"{filename}.mp3").stat().st_size / 1024
            print(f"✓  ({size_kb:.0f} KB)")
            success += 1
        else:
            print("✗  FAILED")
            failed.append(word)

        time.sleep(0.15)

    print(f"\n  Done: {success} generated, {skipped} skipped, {len(failed)} failed")
    if failed:
        print(f"  Failed words: {', '.join(failed)}")

    return success, failed

def main():
    parser = argparse.ArgumentParser(description="TapTalk AAC — ElevenLabs Voice Bake Pipeline")
    parser.add_argument("--voice", default="sarah", choices=list(VOICES.keys()),
                        help="Voice slug to generate (default: sarah)")
    parser.add_argument("--all-voices", action="store_true",
                        help="Generate audio for all 8 voice profiles")
    parser.add_argument("--words", default="",
                        help="Comma-separated list of specific words to generate")
    parser.add_argument("--no-skip", action="store_true",
                        help="Re-generate even if file already exists")
    parser.add_argument("--audit", action="store_true",
                        help="Run asset audit and exit")
    parser.add_argument("--list-voices", action="store_true",
                        help="List all available voices and exit")
    args = parser.parse_args()

    if args.list_voices:
        print("\nAvailable Voices:")
        print(f"{'Slug':<12} {'Name':<12} {'Gender':<8} {'Accent':<12} {'Style'}")
        print("─" * 60)
        for slug, v in VOICES.items():
            primary = " ← PRIMARY" if slug == "sarah" else ""
            print(f"{slug:<12} {v['name']:<12} {v['gender']:<8} {v['accent']:<12} {v['style']}{primary}")
        return

    if args.audit:
        run_audit()
        return

    if not ELEVEN_API_KEY:
        print("\n✗ ERROR: ELEVEN_API_KEY not set in environment.")
        print("  Add it as a Replit Secret named ELEVEN_API_KEY")
        sys.exit(1)

    if not VOCAB_FILE.exists():
        print(f"\n✗ ERROR: vocabulary.json not found at {VOCAB_FILE}")
        sys.exit(1)

    with open(VOCAB_FILE) as f:
        all_vocab = json.load(f)

    if args.words:
        word_list = [w.strip() for w in args.words.split(",") if w.strip()]
    else:
        word_list = [item["word"] for item in all_vocab]

    lake_words = [w for w in word_list if is_lake_county_word(w)]
    if lake_words:
        print(f"\n🏔  Lake County words (high-stability): {', '.join(lake_words)}")

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    voices_to_run = list(VOICES.keys()) if args.all_voices else [args.voice]
    total_success = 0
    total_failed = []

    for slug in voices_to_run:
        s, f = bake_voice(slug, word_list)
        total_success += s
        total_failed.extend(f)

    print(f"\n{'━' * 50}")
    print(f" COMPLETE — {total_success} files generated across {len(voices_to_run)} voice(s)")
    if total_failed:
        print(f" Failed: {len(total_failed)} words")
    print(f"{'━' * 50}\n")

    print("Running post-generation audit...")
    run_audit()

if __name__ == "__main__":
    main()
