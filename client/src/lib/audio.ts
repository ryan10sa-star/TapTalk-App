// TapTalk AAC — Audio Engine
// Uses a 3-element pool for speech to prevent construction overhead on rapid taps.
// Preloaded audio is served from the word cache for zero-latency repeat taps.

const wordCache = new Map<string, HTMLAudioElement>();
const sfxCache = new Map<string, HTMLAudioElement>();
const preloadQueue = new Set<string>();

let _highEnergyEnabled = true;
let _activeVoiceSlug = "sarah";
let _currentSpeech: HTMLAudioElement | null = null;

// Pre-allocate 3 Audio objects at module load — avoids construction overhead on first tap
const POOL_SIZE = 3;
const speechPool: HTMLAudioElement[] = Array.from({ length: POOL_SIZE }, () => {
  const a = new Audio();
  a.preload = "none";
  return a;
});
let _poolIndex = 0;

function nextPoolAudio(): HTMLAudioElement {
  const audio = speechPool[_poolIndex];
  _poolIndex = (_poolIndex + 1) % POOL_SIZE;
  return audio;
}

export function setAudioHighEnergy(enabled: boolean) {
  _highEnergyEnabled = enabled;
}

export function setActiveVoiceSlug(slug: string) {
  if (_activeVoiceSlug !== slug) {
    _activeVoiceSlug = slug;
    wordCache.clear();
  }
}

function resolveAudioPaths(word: string): string[] {
  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  return [
    `/aac-audio/${_activeVoiceSlug}/${fileName}.mp3`,
    `/aac-audio/${fileName}.mp3`,
  ];
}

function fadeIn(audio: HTMLAudioElement, targetVol = 1.0, durationMs = 5): void {
  audio.volume = 0;
  const STEPS = 8;
  const stepMs = durationMs / STEPS;
  let step = 0;
  const tick = () => {
    step++;
    audio.volume = Math.min(targetVol, (step / STEPS) * targetVol);
    if (step < STEPS) setTimeout(tick, stepMs);
  };
  setTimeout(tick, 1);
}

function fadeOut(audio: HTMLAudioElement, durationMs = 5, onDone?: () => void): void {
  const startVol = audio.volume;
  const STEPS = 8;
  const stepMs = durationMs / STEPS;
  let step = 0;
  const tick = () => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / STEPS));
    if (step < STEPS) {
      setTimeout(tick, stepMs);
    } else {
      audio.pause();
      onDone?.();
    }
  };
  setTimeout(tick, 1);
}

function playAudio(audio: HTMLAudioElement): void {
  if (_currentSpeech && _currentSpeech !== audio && !_currentSpeech.paused) {
    fadeOut(_currentSpeech, 5, () => {
      _currentSpeech = audio;
      fadeIn(audio);
      audio.play().catch(() => {});
    });
  } else {
    _currentSpeech = audio;
    audio.currentTime = 0;
    fadeIn(audio);
    audio.play().catch(() => {});
  }
}

export function speakWord(word: string): void {
  const paths = resolveAudioPaths(word);

  // Fast path: cached element (preloaded — zero latency)
  for (const path of paths) {
    if (wordCache.has(path)) {
      playAudio(wordCache.get(path)!);
      return;
    }
  }

  // Pool path: reuse a pre-created Audio object (avoids new Audio() overhead)
  const poolAudio = nextPoolAudio();

  const tryPath = (index: number) => {
    if (index >= paths.length) {
      fallbackSpeak(word);
      return;
    }
    const path = paths[index];
    poolAudio.onerror = null;
    poolAudio.onerror = () => tryPath(index + 1);
    poolAudio.src = path;
    playAudio(poolAudio);
  };

  tryPath(0);
}

export type SfxName =
  | "token-earn"
  | "reward-fanfare"
  | "timer-done"
  | "schedule-done"
  | "lock"
  | "unlock";

export function playSfx(name: SfxName, options?: { highEnergy?: boolean }): void {
  if (options?.highEnergy && !_highEnergyEnabled) return;

  const path = `/aac-audio/sfx/${name}.mp3`;

  if (sfxCache.has(path)) {
    const audio = sfxCache.get(path)!;
    audio.currentTime = 0;
    fadeIn(audio, 1.0, 5);
    audio.play().catch(() => {});
    return;
  }

  const audio = new Audio(path);
  audio.oncanplaythrough = () => { sfxCache.set(path, audio); };
  audio.onerror = () => {};
  fadeIn(audio, 1.0, 5);
  audio.play().catch(() => {});
}

export function previewVoice(voiceSlug: string, word = "Hello", voiceId?: string): void {
  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  const staticPath = `/aac-audio/${voiceSlug}/${fileName}.mp3`;

  const playViaApi = () => {
    if (!voiceId) { fallbackSpeak(word); return; }
    const url = `/api/tts-preview?voiceId=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(word)}`;
    const audio = new Audio(url);
    audio.onerror = () => fallbackSpeak(word);
    fadeIn(audio, 1.0, 5);
    audio.play().catch(() => fallbackSpeak(word));
  };

  // Try the pre-baked file first (zero API cost); fall back to live API call.
  const audio = new Audio(staticPath);
  audio.onerror = () => playViaApi();
  audio.oncanplaythrough = () => {
    audio.onerror = null;
    fadeIn(audio, 1.0, 5);
    audio.play().catch(() => playViaApi());
  };
  // If the static file never responds, kick off the API after 1.5s.
  const timeout = setTimeout(playViaApi, 1500);
  audio.addEventListener("canplaythrough", () => clearTimeout(timeout), { once: true });
  audio.addEventListener("error", () => clearTimeout(timeout), { once: true });
  audio.load();
}

export function playCelebrationSound(): void {
  if (!_highEnergyEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.13);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.13 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.3);
      osc.start(ctx.currentTime + i * 0.13);
      osc.stop(ctx.currentTime + i * 0.13 + 0.3);
    });
  } catch {}
}

export function preloadAudio(words: string[]): void {
  words.forEach((word) => {
    const paths = resolveAudioPaths(word);
    const primary = paths[0];
    if (wordCache.has(primary) || preloadQueue.has(primary)) return;
    preloadQueue.add(primary);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = primary;
    audio.oncanplaythrough = () => {
      wordCache.set(primary, audio);
      preloadQueue.delete(primary);
    };
    audio.onerror = () => { preloadQueue.delete(primary); };
  });
}

export function preloadSfx(names: SfxName[]): void {
  names.forEach((name) => {
    const path = `/aac-audio/sfx/${name}.mp3`;
    if (sfxCache.has(path)) return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = path;
    audio.oncanplaythrough = () => { sfxCache.set(path, audio); };
    audio.onerror = () => {};
  });
}

function fallbackSpeak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1.1;
  utterance.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Victoria") || v.name.includes("Female"))
  );
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

export function clearAudioCache(): void {
  wordCache.clear();
  sfxCache.clear();
}
