# TapTalk AAC — Lake County Edition (v2.0)

A premium Augmentative and Alternative Communication (AAC) Progressive Web App built for Maya.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (minimal — serves static assets and API stubs)
- **State**: React useState/useMemo (no server DB needed — all data is local JSON)
- **Storage**: IndexedDB (Anderson-OS tap event logging, client-side only)
- **Audio**: Web Speech API (TTS fallback) + MP3 file loading from `/aac-audio/`
- **PWA**: Service Worker (`/sw.js`) with Stale-While-Revalidate for media assets

## Key Files

- `client/public/vocabulary.json` — 255+ words across 15 categories
- `client/src/pages/Home.tsx` — Main AAC board page
- `client/src/components/AACTile.tsx` — Tap-responsive word tile
- `client/src/components/SentenceStrip.tsx` — Sentence builder strip
- `client/src/components/CategoryNav.tsx` — Horizontal category filter
- `client/src/components/PartnerModeLock.tsx` — 3-second hold lock/unlock
- `client/src/components/AnalyticsPanel.tsx` — Anderson-OS usage analytics
- `client/src/lib/audio.ts` — Audio pool + Web Speech API fallback
- `client/src/lib/indexeddb.ts` — IndexedDB tap event logging
- `client/public/sw.js` — Service worker (CACHE_NAME: taptalk-premium-v2026)
- `generate_audio.py` — ElevenLabs audio generation script

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

## Audio Files

Run `generate_audio.py` with `ELEVENLABS_API_KEY` set to populate `/client/public/aac-audio/`.
Without audio files, the app falls back to the browser's Web Speech API automatically.

## Development

```
npm run dev
```
