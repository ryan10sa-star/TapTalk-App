#!/usr/bin/env python3
"""
TapTalk AAC - ElevenLabs Audio Generator
Reads vocabulary.json and generates MP3 files using the ElevenLabs API.

Requirements:
  pip install requests

Usage:
  export ELEVENLABS_API_KEY="your-api-key-here"
  python generate_audio.py

Output:
  ./client/public/aac-audio/<word>.mp3

Voice: Aria (female, warm, child-friendly)
"""

import json
import os
import re
import requests
import time

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID = "9BWtsMINqrJLrRacOk9x"  # Aria - warm, natural female voice
OUTPUT_DIR = "./client/public/aac-audio"
VOCAB_FILE = "./client/public/vocabulary.json"

MODEL_ID = "eleven_multilingual_v2"

def word_to_filename(word: str) -> str:
    """Convert a word/phrase to a safe lowercase filename."""
    fname = word.lower().strip()
    fname = re.sub(r"\s+", "-", fname)
    fname = re.sub(r"[^a-z0-9\-]", "", fname)
    return fname

def generate_audio(word: str, filename: str) -> bool:
    """Call ElevenLabs API to generate speech for a word."""
    output_path = os.path.join(OUTPUT_DIR, f"{filename}.mp3")

    if os.path.exists(output_path):
        print(f"  [SKIP] {word!r} -> already exists")
        return True

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": word,
        "model_id": MODEL_ID,
        "voice_settings": {
            "stability": 0.65,
            "similarity_boost": 0.85,
            "style": 0.20,
            "use_speaker_boost": True,
        },
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"  [OK]   {word!r} -> {filename}.mp3")
            return True
        else:
            print(f"  [ERR]  {word!r} -> HTTP {response.status_code}: {response.text[:120]}")
            return False
    except requests.RequestException as e:
        print(f"  [ERR]  {word!r} -> {e}")
        return False

def main():
    if not ELEVENLABS_API_KEY:
        print("ERROR: Set the ELEVENLABS_API_KEY environment variable.")
        print("  export ELEVENLABS_API_KEY='your-api-key-here'")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(VOCAB_FILE, "r", encoding="utf-8") as f:
        vocabulary = json.load(f)

    print(f"TapTalk Audio Generator")
    print(f"========================")
    print(f"Words to process: {len(vocabulary)}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Voice: Aria (ElevenLabs)")
    print()

    success = 0
    failed = 0
    skipped = 0

    for i, item in enumerate(vocabulary, 1):
        word = item["word"]
        filename = word_to_filename(word)
        output_path = os.path.join(OUTPUT_DIR, f"{filename}.mp3")

        print(f"[{i:3d}/{len(vocabulary)}] ", end="")

        if os.path.exists(output_path):
            skipped += 1
            print(f"[SKIP] {word!r} -> already exists")
            continue

        ok = generate_audio(word, filename)
        if ok:
            success += 1
        else:
            failed += 1

        time.sleep(0.5)

    print()
    print(f"Done! Generated: {success}, Skipped: {skipped}, Failed: {failed}")

if __name__ == "__main__":
    main()
