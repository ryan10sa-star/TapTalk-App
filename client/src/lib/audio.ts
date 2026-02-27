const audioCache = new Map<string, HTMLAudioElement>();
const preloadQueue = new Set<string>();

let _highEnergyEnabled = true;
let _activeVoiceSlug = "sarah";

export function setAudioHighEnergy(enabled: boolean) {
  _highEnergyEnabled = enabled;
}

export function setActiveVoiceSlug(slug: string) {
  if (_activeVoiceSlug !== slug) {
    _activeVoiceSlug = slug;
    audioCache.clear();
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
      audio.play().catch(() => tryPath(index + 1));
      return;
    }
    const audio = new Audio(path);
    audio.onerror = () => tryPath(index + 1);
    audio.oncanplaythrough = () => { audioCache.set(path, audio); };
    audio.play().catch(() => tryPath(index + 1));
  };

  tryPath(0);
}

export function previewVoice(voiceSlug: string, word = "Hello"): void {
  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  const path = `/aac-audio/${voiceSlug}/${fileName}.mp3`;
  const audio = new Audio(path);
  audio.onerror = () => fallbackSpeak(word);
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
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.13);
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
}
