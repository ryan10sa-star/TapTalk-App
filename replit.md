# TapTalk AAC™ (v4.0)

A free Augmentative and Alternative Communication (AAC) Progressive Web App.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (minimal — serves static assets and API stubs)
- **State**: React useState/useMemo (no server DB needed — all data is local JSON)
- **Storage**: IndexedDB (Anderson-OS tap event logging, client-side only)
- **Audio**: ElevenLabs eleven_turbo_v2_5 baked MP3s (voice-specific folders) + Web Speech API fallback
- **PWA**: Service Worker (`/sw.js`) with Stale-While-Revalidate for media assets

## Pages / Views (Bottom Navigation)

- **AAC Board** (`/`) — Main communication board
- **Choice Board** (`/choice-board`) — OR / First-Then / Blank-Then modes
- **Token Board** (`/token-board`) — 5-slot reward economy with celebration
- **Visual Schedule** (`/schedule`) — 8-slot school day + visual countdown timer

## Key Files

- `client/public/vocabulary.json` — 278+ words across 16 categories (incl. School)
- `client/src/pages/Home.tsx` — Main AAC board page
- `client/src/components/AACTile.tsx` — Tap-responsive word tile
- `client/src/components/SentenceStrip.tsx` — Sentence builder strip
- `client/src/components/CategoryNav.tsx` — Horizontal category filter
- `client/src/components/PartnerModeLock.tsx` — 3-second hold lock/unlock
- `client/src/components/AnalyticsPanel.tsx` — Anderson-OS usage analytics
- `client/src/lib/audio.ts` — Multi-voice audio pool, voice-folder routing, Web Speech API fallback
- `client/src/lib/settingsContext.tsx` — Global settings context (sensory profile, voice, vocab masking)
- `client/src/lib/indexeddb.ts` — IndexedDB tap event logging
- `client/src/pages/Settings.tsx` — Teacher's Vault (dark-mode settings panel, 3s hold to access)
- `client/public/sw.js` — Service worker (CACHE_NAME: taptalk-premium-v2026)
- `scripts/generate_audio.py` — ElevenLabs multi-voice bake pipeline (8 voices, Lake County optimization)
- `scripts/audit_assets.py` — Asset verification: checks all 278 words have PNG + MP3

## Features

- **255+ vocabulary words** including Lake County CA specialties (Frybread, Acorn Mush, Pozole, Tamales, Conchas, Street Tacos, Horchata, Pears, Walnuts)
- **15 categories**: Core, Social, Actions, Feelings, Food, Lake County, People, Places, Things, Descriptors, Numbers, Animals, Routines, Activities, Nature
- **Sentence builder** with tap-to-add, tap-to-remove, speak, and clear
- **Partner Mode**: 3-second hold lock button disables navigation
- **Audio preloading** when category is selected (background fetch)
- **Web Speech API fallback** when MP3 files are missing
- **Zero-simulation policy**: broken image = ImageOff icon (no SVG placeholders)
- **IndexedDB logging**: every tap saved to "anderson-os" database
- **Analytics panel**: word frequency charts, session stats, CSV export
- **PWA**: manifest + service worker for offline support
- **Search**: full-text search across all vocabulary

## Audio System

**Model**: `eleven_turbo_v2_5` (ultra-low latency)
**Status**: Sarah voice fully baked — 278/278 words at `/client/public/aac-audio/sarah/`

**8 Voice Profiles** (selectable in Teacher's Vault settings):
| Slug | Name | Gender | Accent | Style |
|------|------|--------|--------|-------|
| sarah ⭐ | Sarah | Female | American | Warm & Calm |
| rachel | Rachel | Female | American | Clear & Bright |
| emily | Emily | Female | American | Gentle & Soft |
| charlotte | Charlotte | Female | British | Crisp & Friendly |
| adam | Adam | Male | American | Steady & Clear |
| josh | Josh | Male | American | Deep & Warm |
| daniel | Daniel | Male | British | Authoritative |
| antoni | Antoni | Male | American | Relaxed & Friendly |

**To bake a voice:**
```bash
python scripts/generate_audio.py --voice rachel     # single voice
python scripts/generate_audio.py --all-voices       # all 8 (takes ~20 min)
python scripts/audit_assets.py                      # verify all assets
```

**Lake County words** (Frybread, Tamales, Pomo, etc.) use `stability: 0.85` for pronunciation integrity.
Without audio files, app falls back to Web Speech API automatically.

## Teacher's Vault (Settings)

Access: **3-second hold** on the tiny gear icon in the bottom attribution bar.

- **Sensory Profile**: Visual Celebrations toggle, High-Energy Audio toggle, Haptic Feedback toggle
- **Communication Voice**: 8-voice picker with Preview button
- **Vocabulary Masking**: Searchable grid of all 278 words — toggle any word off to hide it app-wide
- **Diagnostic**: "Run Test" button to preview the current sensory profile safely before use
- All settings auto-saved to localStorage, survive hard refresh

## Image Attribution

All pictograms sourced from **ARASAAC** (Aragonese Portal of Augmentative and Alternative Communication):
- **License**: Creative Commons CC BY-NC-SA 4.0
- **Source**: https://arasaac.org
- **Author**: Sergio Palao
- **Copyright**: © Gobierno de Aragón, Spain. All rights reserved.

253 pictograms downloaded using `scripts/fetch-arasaac-images.mjs` and stored in `client/public/aac-images/`.

For words not found in ARASAAC (culturally specific terms), closest semantic match pictograms were used.

Attribution is displayed in the app footer as required by the CC BY-NC-SA 4.0 license.

## Development

```
npm run dev
```

## Image Scripts

```bash
# Download/refresh ARASAAC images
node scripts/fetch-arasaac-images.mjs     # initial fetch
node scripts/fetch-remaining-images.mjs   # retry missing
```
