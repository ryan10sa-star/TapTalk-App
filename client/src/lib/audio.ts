const audioCache = new Map<string, HTMLAudioElement>();
const preloadQueue = new Set<string>();

let _highEnergyEnabled = true;

export function setAudioHighEnergy(enabled: boolean) {
  _highEnergyEnabled = enabled;
}

export function speakWord(word: string): void {
  const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "");
  const audioPath = `/aac-audio/${fileName}.mp3`;

  if (audioCache.has(audioPath)) {
    const audio = audioCache.get(audioPath)!;
    audio.currentTime = 0;
    audio.play().catch(() => fallbackSpeak(word));
    return;
  }

  const audio = new Audio(audioPath);
  audio.onerror = () => { fallbackSpeak(word); };
  audio.oncanplaythrough = () => { audioCache.set(audioPath, audio); };
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
    const fileName = word.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "");
    const audioPath = `/aac-audio/${fileName}.mp3`;
    if (audioCache.has(audioPath) || preloadQueue.has(audioPath)) return;
    preloadQueue.add(audioPath);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = audioPath;
    audio.oncanplaythrough = () => { audioCache.set(audioPath, audio); preloadQueue.delete(audioPath); };
    audio.onerror = () => { preloadQueue.delete(audioPath); };
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
