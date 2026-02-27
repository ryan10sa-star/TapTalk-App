#!/usr/bin/env python3
"""
TapTalk AAC — ElevenLabs Sound Effects Generator
Generates UI sound effects using the ElevenLabs Sound Generation API.

Usage:
  python scripts/generate_sfx.py              # Generate all SFX
  python scripts/generate_sfx.py --list       # List all planned SFX
  python scripts/generate_sfx.py --no-skip    # Re-generate even if file exists
"""

import argparse
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

ROOT = Path(__file__).parent.parent
SFX_DIR = ROOT / "client/public/aac-audio/sfx"
ELEVEN_API_KEY = os.environ.get("ELEVEN_API_KEY", "")
BASE_URL = "https://api.elevenlabs.io/v1"

SFX_LIBRARY = [
    {
        "name":     "token-earn",
        "file":     "token-earn.mp3",
        "prompt":   "A soft satisfying magical ping chime, like collecting a gold coin in a gentle educational game. Bright, short, pleasant.",
        "duration": 0.8,
        "influence": 0.4,
        "use":      "Played when a single token slot is tapped on the Token Board",
    },
    {
        "name":     "reward-fanfare",
        "file":     "reward-fanfare.mp3",
        "prompt":   "Cheerful uplifting three-note ascending musical fanfare. Warm, celebratory, gentle and child-friendly. No vocals. Educational app celebration.",
        "duration": 2.5,
        "influence": 0.35,
        "use":      "Played when all 5 tokens are earned (HIGH ENERGY — respects Audio toggle)",
    },
    {
        "name":     "timer-done",
        "file":     "timer-done.mp3",
        "prompt":   "Three gentle soft school bell chimes in sequence, warm and pleasant. Calm classroom notification sound.",
        "duration": 2.0,
        "influence": 0.4,
        "use":      "Played when the visual countdown timer reaches zero",
    },
    {
        "name":     "schedule-done",
        "file":     "schedule-done.mp3",
        "prompt":   "Soft satisfying positive completion ding. A gentle single chime indicating task done. Short, pleasant, calm.",
        "duration": 0.7,
        "influence": 0.45,
        "use":      "Played when a schedule activity is tapped as completed",
    },
    {
        "name":     "lock",
        "file":     "lock.mp3",
        "prompt":   "Soft gentle mechanical lock click sound. Short, subtle, satisfying.",
        "duration": 0.5,
        "influence": 0.5,
        "use":      "Played when Partner Mode is engaged (locked)",
    },
    {
        "name":     "unlock",
        "file":     "unlock.mp3",
        "prompt":   "Soft gentle mechanical unlock click and release sound. Short, subtle, airy.",
        "duration": 0.5,
        "influence": 0.5,
        "use":      "Played when Partner Mode is disengaged (unlocked)",
    },
]

def generate_sfx(entry: dict, skip_existing: bool = True) -> bool:
    out_path = SFX_DIR / entry["file"]

    if skip_existing and out_path.exists() and out_path.stat().st_size > 512:
        print(f"  ⏭  {entry['name']:<20} skip (already exists)")
        return True

    headers = {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    payload = {
        "text": entry["prompt"],
        "duration_seconds": entry["duration"],
        "prompt_influence": entry["influence"],
    }

    url = f"{BASE_URL}/sound-generation"

    for attempt in range(3):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=40)
            if resp.status_code == 200:
                out_path.write_bytes(resp.content)
                size_kb = out_path.stat().st_size / 1024
                print(f"  ✓  {entry['name']:<20} ({size_kb:.0f} KB)")
                return True
            elif resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 8)) + 2
                print(f"  ⏳ Rate limited — waiting {wait}s...")
                time.sleep(wait)
            elif resp.status_code == 401:
                print("  ✗ Invalid API key. Check ELEVEN_API_KEY.")
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


def main():
    parser = argparse.ArgumentParser(description="TapTalk AAC Sound Effects Generator")
    parser.add_argument("--list", action="store_true", help="List all SFX and exit")
    parser.add_argument("--no-skip", action="store_true", help="Re-generate even if file exists")
    args = parser.parse_args()

    if args.list:
        print("\nTapTalk AAC — Sound Effects Library")
        print("─" * 60)
        for sfx in SFX_LIBRARY:
            print(f"\n  {sfx['name']}")
            print(f"    File:    aac-audio/sfx/{sfx['file']}")
            print(f"    Length:  {sfx['duration']}s")
            print(f"    Usage:   {sfx['use']}")
        print()
        return

    if not ELEVEN_API_KEY:
        print("\n✗ ELEVEN_API_KEY not set in environment.")
        print("  Add it as a Replit Secret named ELEVEN_API_KEY")
        sys.exit(1)

    SFX_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n{'━' * 52}")
    print(f"  TapTalk AAC — Sound Effects Bake")
    print(f"  Generating {len(SFX_LIBRARY)} sound effects via ElevenLabs")
    print(f"  Output: {SFX_DIR.relative_to(ROOT)}")
    print(f"{'━' * 52}\n")

    success = 0
    failed = []

    for sfx in SFX_LIBRARY:
        ok = generate_sfx(sfx, skip_existing=not args.no_skip)
        if ok:
            success += 1
        else:
            failed.append(sfx["name"])
        time.sleep(0.5)

    print(f"\n{'━' * 52}")
    print(f"  ✅ {success}/{len(SFX_LIBRARY)} sound effects generated")
    if failed:
        print(f"  ✗ Failed: {', '.join(failed)}")
    print(f"{'━' * 52}\n")

    print("Files saved to:")
    for sfx in SFX_LIBRARY:
        p = SFX_DIR / sfx["file"]
        if p.exists():
            print(f"  ✓ /aac-audio/sfx/{sfx['file']}  ({p.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
