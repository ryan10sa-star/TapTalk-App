const audioCache = new Map<string, HTMLAudioElement>();
const sfxCache = new Map<string, HTMLAudioElement>();
const preloadQueue = new Set<string>();

let _highEnergyEnabled = true;
let _activeVoiceSlug = "sarah";
let _currentAudio: HTMLAudioElement | null = null;

export function setAudioHighEnergy(enabled: boolean) {
  _highEnergyEnabled = enabled;
}

export function setActiveVoiceSlug(slug: string) {
  if (_activeVoiceSlug !== slug) {
    _activeVoiceSlug = slug;
    audioCache.clear();
  }
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
      audio.currentTime = 0;
      onDone?.();
    }
  };
  setTimeout(tick, 1);
}

function playWithFade(audio: HTMLAudioElement): void {
  if (_currentAudio && _currentAudio !== audio && !_currentAudio.paused) {
    fadeOut(_currentAudio, 5, () => {
      _currentAudio = audio;
      fadeIn(audio);
      audio.play().catch(() => {});
    });
  } else {
    _currentAudio = audio;
    fadeIn(audio);
    audio.play().catch(() => {});
  }
}

function resolveAudioPath(word: string): string[] {
  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  return [
    `/aac-audio/${_activeVoiceSlug}/${fileName}.mp3`,
    `/aac-audio/${fileName}.mp3`,
  ];
}

export function speakWord(word: string): void {
  const paths = resolveAudioPath(word);

  const tryPath = (index: number) => {
    if (index >= paths.length) {
      fallbackSpeak(word);
      return;
    }
    const path = paths[index];
    if (audioCache.has(path)) {
      const audio = audioCache.get(path)!;
      audio.currentTime = 0;
      playWithFade(audio);
      return;
    }
    const audio = new Audio(path);
    audio.onerror = () => tryPath(index + 1);
    audio.oncanplaythrough = () => { audioCache.set(path, audio); };
    playWithFade(audio);
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

export function previewVoice(voiceSlug: string, word = "Hello"): void {
  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  const path = `/aac-audio/${voiceSlug}/${fileName}.mp3`;
  const audio = new Audio(path);
  audio.onerror = () => fallbackSpeak(word);
  fadeIn(audio, 1.0, 5);
  audio.play().catch(() => fallbackSpeak(word));
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
    const paths = resolveAudioPath(word);
    const primary = paths[0];
    if (audioCache.has(primary) || preloadQueue.has(primary)) return;
    preloadQueue.add(primary);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = primary;
    audio.oncanplaythrough = () => { audioCache.set(primary, audio); preloadQueue.delete(primary); };
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
  audioCache.clear();
  sfxCache.clear();
}
