import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, CheckCircle2, Sparkles, Volume2, Vibrate, Eye, ShieldCheck, Play, ThumbsUp, Activity, Plus, Trash2, CalendarDays, Home, GraduationCap } from "lucide-react";
import { useSettings, hapticTap, VOICE_PROFILES, type VoiceProfile } from "@/lib/settingsContext";
import { previewVoice } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import { SCHOOL_SCHEDULE, HOME_SCHEDULE, ALL_SCHEDULE_OPTIONS, ITEM_COLORS as SCHEDULE_COLORS } from "@/pages/VisualSchedule";

interface VocabWord {
  id: number;
  word: string;
  category: string;
  color: string;
}

function Toggle({ on, onChange, testId }: { on: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      data-testid={testId}
      onClick={() => onChange(!on)}
      className="relative shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full transition-colors duration-200"
      style={{
        width: 51,
        height: 31,
        backgroundColor: on ? "#34D399" : "#4B5563",
        border: "none",
        padding: 2,
      }}
    >
      <span
        className="block rounded-full bg-white shadow-md transition-transform duration-200"
        style={{
          width: 27,
          height: 27,
          transform: on ? "translateX(20px)" : "translateX(0px)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-5 pb-2">
      <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>
        {children}
      </h2>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  value,
  onChange,
  testId,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: "1px solid #1F2937" }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconColor + "33" }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm" style={{ color: "#F9FAFB" }}>{title}</div>
        <div className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>{subtitle}</div>
      </div>
      <Toggle on={value} onChange={onChange} testId={testId} />
    </div>
  );
}

function VoiceCard({
  voice,
  selected,
  onSelect,
}: {
  voice: VoiceProfile;
  selected: boolean;
  onSelect: () => void;
}) {
  const [previewing, setPreviewing] = useState(false);
  const isFemale = voice.gender === "female";

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewing(true);
    previewVoice(voice.slug, "Hello", voice.id);
    setTimeout(() => setPreviewing(false), 2500);
  };

  return (
    <button
      onClick={onSelect}
      data-testid={`voice-card-${voice.slug}`}
      aria-pressed={selected}
      className="relative flex flex-col gap-1.5 p-3 rounded-xl text-left transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      style={{
        backgroundColor: selected ? "#1E3A5F" : "#1F2937",
        border: `2px solid ${selected ? "#3B82F6" : "#374151"}`,
      }}
    >
      {voice.primary && (
        <span
          className="absolute top-2 right-2 text-xs font-black px-1.5 py-0.5 rounded"
          style={{ backgroundColor: "#064E3B", color: "#34D399", fontSize: "9px" }}
        >
          DEFAULT
        </span>
      )}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
          style={{
            backgroundColor: isFemale ? "#DB277733" : "#2563EB33",
            color: isFemale ? "#F472B6" : "#60A5FA",
          }}
        >
          {isFemale ? "♀" : "♂"}
        </div>
        <div>
          <div className="font-bold text-sm leading-tight" style={{ color: selected ? "#F9FAFB" : "#D1D5DB" }}>
            {voice.name}
          </div>
          <div className="text-xs leading-tight" style={{ color: "#6B7280" }}>{voice.accent}</div>
        </div>
      </div>
      <div className="text-xs leading-snug" style={{ color: selected ? "#93C5FD" : "#4B5563" }}>
        {voice.style}
      </div>
      <button
        onClick={handlePreview}
        data-testid={`voice-preview-${voice.slug}`}
        className="mt-0.5 flex items-center gap-1 text-xs px-2 py-1 rounded-lg self-start transition-all"
        style={{
          backgroundColor: previewing ? "#1D4ED8" : "#374151",
          color: previewing ? "white" : "#9CA3AF",
        }}
        aria-label={`Preview ${voice.name}`}
      >
        <Play size={9} />
        {previewing ? "Playing…" : "Preview"}
      </button>
      {selected && (
        <div
          className="absolute bottom-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#3B82F6" }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </button>
  );
}

function WordPill({
  word,
  color,
  enabled,
  onToggle,
}: {
  word: string;
  color: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      data-testid={`word-mask-${word.toLowerCase().replace(/\s+/g, "-")}`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-100 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 text-left"
      style={{
        backgroundColor: enabled ? color + "22" : "#1F2937",
        border: `1.5px solid ${enabled ? color + "66" : "#374151"}`,
        color: enabled ? color : "#4B5563",
        opacity: enabled ? 1 : 0.7,
      }}
      aria-pressed={enabled}
      aria-label={`${word}: ${enabled ? "visible" : "hidden"}`}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center"
        style={{ backgroundColor: enabled ? color : "#374151" }}
      >
        {!enabled && <X size={7} color="#6B7280" />}
      </span>
      <span className="leading-tight">{word}</span>
    </button>
  );
}

interface ConfettiPiece {
  id: number;
  color: string;
  left: string;
  delay: string;
  duration: string;
  size: string;
}

function MiniConfetti() {
  const colors = ["#F59E0B", "#2563EB", "#DC2626", "#059669", "#7C3AED", "#DB2777"];
  const pieces: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${1 + Math.random() * 0.8}s`,
    size: `${5 + Math.random() * 6}px`,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: p.left,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(260px) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

interface SettingsProps {
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  core: "#2563EB", actions: "#EA580C", feelings: "#7C3AED", food: "#059669",
  "lake-county": "#92400E", school: "#6D28D9", people: "#DB2777", places: "#0891B2",
  things: "#CA8A04", descriptors: "#6366F1", numbers: "#0F766E", social: "#E11D48",
  animals: "#65A30D", routines: "#7C3AED", activities: "#0284C7", nature: "#059669",
};

interface HealthResult {
  imagesOk: number;
  imagesTotal: number;
  audioOk: number;
  audioTotal: number;
  missingImages: string[];
  missingAudio: string[];
  progress: number;
}

export default function Settings({ onClose }: SettingsProps) {
  const { settings, update, isWordVisible } = useSettings();
  const [vocabulary, setVocabulary] = useState<VocabWord[]>([]);
  const [vocabSearch, setVocabSearch] = useState("");
  const [testState, setTestState] = useState<"idle" | "running" | "done">("idle");
  const [showConfetti, setShowConfetti] = useState(false);
  const [healthState, setHealthState] = useState<"idle" | "running" | "done">("idle");
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null);
  const [schedEdit, setSchedEdit] = useState<Array<{ time: string; label: string }>>(() => {
    try {
      const s = localStorage.getItem("taptalk-schedule");
      if (s) return JSON.parse(s);
    } catch {}
    return SCHOOL_SCHEDULE;
  });
  const [schedDropdown, setSchedDropdown] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const saveSchedEdit = useCallback((next: Array<{ time: string; label: string }>) => {
    setSchedEdit(next);
    try {
      localStorage.setItem("taptalk-schedule", JSON.stringify(next));
      localStorage.removeItem("taptalk-completed");
    } catch {}
  }, []);

  const loadPreset = useCallback((preset: typeof SCHOOL_SCHEDULE) => {
    saveSchedEdit([...preset]);
    setSchedDropdown(null);
  }, [saveSchedEdit]);

  const addSchedSlot = useCallback(() => {
    saveSchedEdit([...schedEdit, { time: "12:00", label: "Free Play" }]);
  }, [schedEdit, saveSchedEdit]);

  const removeSchedSlot = useCallback((i: number) => {
    saveSchedEdit(schedEdit.filter((_, idx) => idx !== i));
    setSchedDropdown(null);
  }, [schedEdit, saveSchedEdit]);

  const updateSchedTime = useCallback((i: number, time: string) => {
    saveSchedEdit(schedEdit.map((s, idx) => idx === i ? { ...s, time } : s));
  }, [schedEdit, saveSchedEdit]);

  const updateSchedLabel = useCallback((i: number, label: string) => {
    saveSchedEdit(schedEdit.map((s, idx) => idx === i ? { ...s, label } : s));
    setSchedDropdown(null);
  }, [schedEdit, saveSchedEdit]);

  useEffect(() => {
    fetch("/vocabulary.json")
      .then((r) => r.json())
      .then(setVocabulary)
      .catch(console.error);
  }, []);

  const filteredVocab = vocabulary.filter((w) =>
    w.word.toLowerCase().includes(vocabSearch.toLowerCase().trim())
  );

  const groupedVocab = filteredVocab.reduce<Record<string, VocabWord[]>>((acc, w) => {
    (acc[w.category] = acc[w.category] ?? []).push(w);
    return acc;
  }, {});

  const toggleWord = useCallback((word: string) => {
    hapticTap(settings.hapticEnabled, 20);
    const masked = settings.maskedWords.includes(word)
      ? settings.maskedWords.filter((w) => w !== word)
      : [...settings.maskedWords, word];
    update({ maskedWords: masked });
  }, [settings.maskedWords, settings.hapticEnabled, update]);

  const selectAll = useCallback(() => update({ maskedWords: [] }), [update]);
  const deselectAll = useCallback(() => {
    update({ maskedWords: vocabulary.map((w) => w.word) });
  }, [vocabulary, update]);

  const handleTestCelebration = useCallback(() => {
    setTestState("running");
    if (settings.celebrationEnabled) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    if (settings.audioHighEnergyEnabled) {
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
          gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
      } catch {}
    }
    hapticTap(settings.hapticEnabled, [80, 40, 80, 40, 200]);
    setTimeout(() => setTestState("done"), 3200);
    setTimeout(() => setTestState("idle"), 5500);
  }, [settings]);

  const runHealthCheck = useCallback(async () => {
    setHealthState("running");
    setHealthResult(null);

    const vocab = vocabulary.length > 0
      ? vocabulary
      : await fetch("/vocabulary.json").then((r) => r.json()).catch(() => []);

    if (!vocab.length) {
      setHealthState("done");
      setHealthResult({ imagesOk: 0, imagesTotal: 0, audioOk: 0, audioTotal: 0, missingImages: [], missingAudio: [], progress: 100 });
      return;
    }

    const total = vocab.length;
    let checked = 0;
    let imagesOk = 0;
    let audioOk = 0;
    const missingImages: string[] = [];
    const missingAudio: string[] = [];
    const voiceSlug = settings.selectedVoiceSlug;

    const BATCH = 8;
    for (let i = 0; i < vocab.length; i += BATCH) {
      const batch = vocab.slice(i, i + BATCH);
      await Promise.all(batch.map(async (w: VocabWord) => {
        const fn = w.word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

        const imgCheck = fetch(`/aac-images/${fn}.png`, { method: "HEAD" }).then((r) => {
          if (r.ok) imagesOk++;
          else missingImages.push(w.word);
        }).catch(() => missingImages.push(w.word));

        const audioCheck = fetch(`/aac-audio/${voiceSlug}/${fn}.mp3`, { method: "HEAD" }).then(async (r) => {
          if (r.ok) { audioOk++; return; }
          const r2 = await fetch(`/aac-audio/${fn}.mp3`, { method: "HEAD" }).catch(() => null);
          if (r2?.ok) { audioOk++; return; }
          missingAudio.push(w.word);
        }).catch(() => missingAudio.push(w.word));

        await Promise.all([imgCheck, audioCheck]);
        checked++;
        setHealthResult((prev) => ({
          imagesOk,
          imagesTotal: total,
          audioOk,
          audioTotal: total,
          missingImages: missingImages.slice(0, 20),
          missingAudio: missingAudio.slice(0, 20),
          progress: Math.round((checked / total) * 100),
        }));
      }));
    }

    setHealthResult({
      imagesOk, imagesTotal: total,
      audioOk, audioTotal: total,
      missingImages: missingImages.slice(0, 20),
      missingAudio: missingAudio.slice(0, 20),
      progress: 100,
    });
    setHealthState("done");
  }, [vocabulary, settings.selectedVoiceSlug]);

  const hiddenCount = settings.maskedWords.length;
  const totalCount = vocabulary.length;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#111827" }}
      data-testid="settings-panel"
    >
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#0F172A", borderBottom: "1px solid #1F2937" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#1E3A5F" }}
          >
            <ShieldCheck size={16} style={{ color: "#60A5FA" }} />
          </div>
          <div>
            <div className="font-black text-sm" style={{ color: "#F9FAFB" }}>Teacher's Vault</div>
            <div className="text-xs" style={{ color: "#6B7280" }}>Sensory Calibration Suite</div>
          </div>
        </div>
        <button
          onClick={onClose}
          data-testid="button-close-settings"
          className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          style={{ backgroundColor: "#1F2937" }}
          aria-label="Close settings"
        >
          <X size={16} style={{ color: "#9CA3AF" }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <SectionHeader>Sensory Profile</SectionHeader>
        <div style={{ backgroundColor: "#1F2937", borderRadius: 12, margin: "0 16px" }}>
          <SettingRow
            icon={Sparkles}
            iconColor="#F59E0B"
            title="Visual Celebrations"
            subtitle="Confetti and reward animations on token completion"
            value={settings.celebrationEnabled}
            onChange={(v) => update({ celebrationEnabled: v })}
            testId="toggle-celebration"
          />
          <SettingRow
            icon={Volume2}
            iconColor="#60A5FA"
            title="High-Energy Audio"
            subtitle="Cheer sounds and tones — off means calm voice only"
            value={settings.audioHighEnergyEnabled}
            onChange={(v) => update({ audioHighEnergyEnabled: v })}
            testId="toggle-audio"
          />
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#A78BFA33" }}
            >
              <Vibrate size={18} style={{ color: "#A78BFA" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: "#F9FAFB" }}>Haptic Feedback</div>
              <div className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>Device vibration on every tile tap</div>
            </div>
            <Toggle on={settings.hapticEnabled} onChange={(v) => update({ hapticEnabled: v })} testId="toggle-haptic" />
          </div>
        </div>

        <SectionHeader>Communication Voice</SectionHeader>
        <div className="px-4 mb-1">
          <p className="text-xs mb-3 leading-relaxed" style={{ color: "#6B7280" }}>
            Select Maya's voice. Run <span style={{ color: "#60A5FA", fontFamily: "monospace" }}>python scripts/generate_audio.py --voice {"{slug}"}</span> to bake audio for each profile.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VOICE_PROFILES.map((voice) => (
              <VoiceCard
                key={voice.slug}
                voice={voice}
                selected={settings.selectedVoiceSlug === voice.slug}
                onSelect={() => { hapticTap(settings.hapticEnabled, 30); update({ selectedVoiceSlug: voice.slug }); }}
              />
            ))}
          </div>
        </div>

        <SectionHeader>Token Board Reward</SectionHeader>
        <div className="px-4 mb-1">
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#D9770622" }}>
                <ThumbsUp size={18} style={{ color: "#D97706" }} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm" style={{ color: "#F9FAFB" }}>Custom Reward Name</div>
                <div className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>
                  What Maya is working toward. Leave blank for a generic reward banner.
                </div>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={settings.rewardLabel}
                onChange={(e) => update({ rewardLabel: e.target.value })}
                placeholder="e.g. Swing, iPad Time, Snack, Free Play…"
                maxLength={40}
                data-testid="input-reward-label"
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{
                  backgroundColor: "#111827",
                  color: "#F9FAFB",
                  border: "1px solid #374151",
                  paddingRight: settings.rewardLabel ? "2.5rem" : "0.75rem",
                }}
              />
              {settings.rewardLabel && (
                <button
                  onClick={() => update({ rewardLabel: "" })}
                  data-testid="button-clear-reward"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 focus:outline-none"
                  aria-label="Clear reward name"
                >
                  <X size={14} style={{ color: "#6B7280" }} />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "#6B7280" }}>
              <ThumbsUp size={11} />
              <span>
                {settings.rewardLabel.trim()
                  ? `Token Board will show: "${settings.rewardLabel.trim()}"`
                  : "Token Board will show a generic thumbs-up reward banner"}
              </span>
            </div>
          </div>
        </div>

        <SectionHeader>Diagnostic</SectionHeader>
        <div className="px-4">
          <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}>
            {showConfetti && <MiniConfetti />}
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <Eye size={18} style={{ color: "#34D399" }} />
                <div>
                  <div className="font-semibold text-sm" style={{ color: "#F9FAFB" }}>Test Celebration</div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: "#6B7280" }}>
                    Previews the current sensory profile — confirm it's safe for the student before exiting.
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-4 text-xs" style={{ color: "#6B7280" }}>
                <div className="flex items-center gap-2">
                  <span>{settings.celebrationEnabled ? "✅" : "⬜"}</span>
                  <span>Confetti animation will {settings.celebrationEnabled ? "show" : "NOT show"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{settings.audioHighEnergyEnabled ? "✅" : "⬜"}</span>
                  <span>Celebration tones will {settings.audioHighEnergyEnabled ? "play" : "NOT play"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{settings.hapticEnabled ? "✅" : "⬜"}</span>
                  <span>Vibration will {settings.hapticEnabled ? "trigger" : "NOT trigger"}</span>
                </div>
              </div>

              {testState === "idle" && (
                <button
                  onClick={handleTestCelebration}
                  data-testid="button-test-celebration"
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{ backgroundColor: "#1D4ED8", color: "white" }}
                >
                  Run Test
                </button>
              )}
              {testState === "running" && (
                <div className="w-full py-2.5 rounded-xl font-bold text-sm text-center" style={{ backgroundColor: "#374151", color: "#9CA3AF" }}>
                  Testing...
                </div>
              )}
              {testState === "done" && (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm" style={{ backgroundColor: "#064E3B", color: "#34D399" }}>
                  <CheckCircle2 size={16} /> Profile Verified
                </div>
              )}
            </div>
          </div>
        </div>

        <SectionHeader>System Health</SectionHeader>
        <div className="px-4 mb-1">
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#10B98133" }}>
                <Activity size={18} style={{ color: "#34D399" }} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm" style={{ color: "#F9FAFB" }}>Asset Verification</div>
                <div className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>
                  Checks every PNG image and MP3 audio file against the current vocabulary. Verifies HTTP 200 OK for each.
                </div>
              </div>
            </div>

            {healthState === "idle" && (
              <button
                onClick={runHealthCheck}
                data-testid="button-health-check"
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ backgroundColor: "#065F46", color: "#34D399", border: "1px solid #064E3B" }}
              >
                Run System Health Check
              </button>
            )}

            {healthState === "running" && healthResult && (
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                  <span>Checking assets…</span>
                  <span>{healthResult.progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#111827" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${healthResult.progress}%`, backgroundColor: "#34D399" }}
                  />
                </div>
                <div className="mt-2 flex gap-4 text-xs" style={{ color: "#6B7280" }}>
                  <span>🖼 {healthResult.imagesOk}/{healthResult.imagesTotal} images</span>
                  <span>🔊 {healthResult.audioOk}/{healthResult.audioTotal} audio</span>
                </div>
              </div>
            )}

            {healthState === "done" && healthResult && (
              <div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{
                      backgroundColor: healthResult.imagesOk === healthResult.imagesTotal ? "#064E3B" : "#450A0A",
                      border: `1px solid ${healthResult.imagesOk === healthResult.imagesTotal ? "#065F46" : "#7F1D1D"}`,
                    }}
                  >
                    <div className="text-lg font-black" style={{ color: healthResult.imagesOk === healthResult.imagesTotal ? "#34D399" : "#FCA5A5" }}>
                      {healthResult.imagesOk}/{healthResult.imagesTotal}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Images OK</div>
                  </div>
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{
                      backgroundColor: healthResult.audioOk === healthResult.audioTotal ? "#064E3B" : "#451A03",
                      border: `1px solid ${healthResult.audioOk === healthResult.audioTotal ? "#065F46" : "#7C2D12"}`,
                    }}
                  >
                    <div className="text-lg font-black" style={{ color: healthResult.audioOk === healthResult.audioTotal ? "#34D399" : "#FED7AA" }}>
                      {healthResult.audioOk}/{healthResult.audioTotal}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Audio OK</div>
                  </div>
                </div>

                {healthResult.missingImages.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-bold mb-1" style={{ color: "#FCA5A5" }}>Missing images:</div>
                    <div className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                      {healthResult.missingImages.join(", ")}
                      {healthResult.imagesTotal - healthResult.imagesOk > 20 && ` +${healthResult.imagesTotal - healthResult.imagesOk - 20} more`}
                    </div>
                  </div>
                )}

                {healthResult.missingAudio.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-bold mb-1" style={{ color: "#FED7AA" }}>Missing audio ({settings.selectedVoiceSlug}):</div>
                    <div className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                      {healthResult.missingAudio.join(", ")}
                      {healthResult.audioTotal - healthResult.audioOk > 20 && ` +${healthResult.audioTotal - healthResult.audioOk - 20} more`}
                    </div>
                    <div className="text-xs mt-1 font-mono" style={{ color: "#4B5563" }}>
                      Run: python scripts/generate_audio.py --voice {settings.selectedVoiceSlug}
                    </div>
                  </div>
                )}

                {healthResult.imagesOk === healthResult.imagesTotal && healthResult.audioOk === healthResult.audioTotal && (
                  <div className="flex items-center gap-2 mb-3 text-sm font-bold" style={{ color: "#34D399" }}>
                    <CheckCircle2 size={16} /> All assets verified — offline ready
                  </div>
                )}

                <button
                  onClick={() => { setHealthState("idle"); setHealthResult(null); }}
                  data-testid="button-health-reset"
                  className="w-full py-2 rounded-xl text-xs font-bold"
                  style={{ backgroundColor: "#111827", color: "#6B7280" }}
                >
                  Run Again
                </button>
              </div>
            )}
          </div>
        </div>

        <SectionHeader>Visual Schedule</SectionHeader>
        <div className="px-4 mb-1">
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}>

            <div className="flex items-center gap-2 p-3 pb-2" style={{ borderBottom: "1px solid #374151" }}>
              <CalendarDays size={15} style={{ color: "#60A5FA" }} />
              <span className="text-xs font-bold flex-1" style={{ color: "#F9FAFB" }}>Day Schedule</span>
              <button
                onClick={() => loadPreset(SCHOOL_SCHEDULE)}
                data-testid="button-preset-school"
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all"
                style={{ backgroundColor: "#1E3A5F", color: "#60A5FA" }}
              >
                <GraduationCap size={12} /> School
              </button>
              <button
                onClick={() => loadPreset(HOME_SCHEDULE)}
                data-testid="button-preset-home"
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all"
                style={{ backgroundColor: "#064E3B", color: "#34D399" }}
              >
                <Home size={12} /> Home
              </button>
            </div>

            <div className="p-2 space-y-1.5" data-testid="settings-schedule-list">
              {schedEdit.map((slot, i) => (
                <div key={i} className="flex items-center gap-1.5" data-testid={`settings-slot-${i}`}>
                  <input
                    type="time"
                    value={(() => {
                      const [hStr, mStr] = slot.time.split(":");
                      const h = parseInt(hStr ?? "0", 10);
                      const m = parseInt(mStr ?? "0", 10);
                      if (isNaN(h) || isNaN(m)) return "12:00";
                      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                    })()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) return;
                      const [hStr, mStr] = raw.split(":");
                      const h = parseInt(hStr, 10);
                      const m = parseInt(mStr, 10);
                      const display = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
                      updateSchedTime(i, display);
                    }}
                    data-testid={`settings-time-${i}`}
                    className="w-24 shrink-0 rounded-lg px-2 py-1.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: "#111827", color: "#F9FAFB", border: "1px solid #374151" }}
                  />

                  <div className="relative flex-1">
                    <button
                      onClick={() => setSchedDropdown(schedDropdown === i ? null : i)}
                      data-testid={`settings-label-${i}`}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold truncate"
                      style={{
                        backgroundColor: "#111827",
                        color: SCHEDULE_COLORS[slot.label] ?? "#94A3B8",
                        border: "1px solid #374151",
                      }}
                    >
                      {slot.label}
                    </button>
                    {schedDropdown === i && (
                      <div
                        className="absolute left-0 top-full mt-1 z-30 rounded-xl shadow-xl p-2"
                        style={{ backgroundColor: "#1F2937", border: "1px solid #374151", width: 220 }}
                      >
                        <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                          {ALL_SCHEDULE_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => updateSchedLabel(i, opt)}
                              data-testid={`settings-option-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                              className="text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors truncate"
                              style={{ color: SCHEDULE_COLORS[opt] ?? "#94A3B8" }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeSchedSlot(i)}
                    data-testid={`settings-remove-slot-${i}`}
                    className="p-1.5 rounded-lg hover:bg-red-900 transition-colors shrink-0"
                    aria-label={`Remove slot ${i}`}
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}

              <button
                onClick={addSchedSlot}
                data-testid="button-settings-add-slot"
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border-dashed border-2 transition-all"
                style={{ borderColor: "#374151", color: "#6B7280" }}
              >
                <Plus size={13} /> Add Activity
              </button>
            </div>

            <div className="px-3 pb-2 pt-1">
              <div className="text-xs" style={{ color: "#4B5563" }}>
                {schedEdit.length} activit{schedEdit.length === 1 ? "y" : "ies"} · changes auto-saved
              </div>
            </div>
          </div>
        </div>

        <SectionHeader>Vocabulary Masking</SectionHeader>
        <div className="px-4 mb-3">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
          >
            <div className="p-3 space-y-3" style={{ borderBottom: "1px solid #374151" }}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6B7280" }} />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={vocabSearch}
                  onChange={(e) => setVocabSearch(e.target.value)}
                  placeholder="Search words..."
                  data-testid="input-vocab-search"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "#111827",
                    color: "#F9FAFB",
                    border: "1px solid #374151",
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  {hiddenCount === 0
                    ? `All ${totalCount} words visible`
                    : `${hiddenCount} word${hiddenCount !== 1 ? "s" : ""} hidden`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    data-testid="button-select-all-words"
                    className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                    style={{ backgroundColor: "#064E3B", color: "#34D399" }}
                  >
                    All On
                  </button>
                  <button
                    onClick={deselectAll}
                    data-testid="button-deselect-all-words"
                    className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                    style={{ backgroundColor: "#450A0A", color: "#FCA5A5" }}
                  >
                    All Off
                  </button>
                </div>
              </div>
            </div>

            {filteredVocab.length === 0 && vocabSearch ? (
              <div className="py-8 text-center text-sm" style={{ color: "#6B7280" }}>
                No words match &ldquo;{vocabSearch}&rdquo;
              </div>
            ) : (
              <div className="p-3 space-y-4">
                {Object.entries(groupedVocab).map(([category, words]) => {
                  const catColor = CATEGORY_COLORS[category] ?? "#64748B";
                  const catLabel = category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ backgroundColor: catColor + "22", color: catColor }}
                        >
                          {catLabel}
                        </span>
                        <span className="text-xs" style={{ color: "#4B5563" }}>
                          {words.filter((w) => isWordVisible(w.word)).length}/{words.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {words.map((w) => (
                          <WordPill
                            key={w.id}
                            word={w.word}
                            color={catColor}
                            enabled={isWordVisible(w.word)}
                            onToggle={() => toggleWord(w.word)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-6">
          <div className="rounded-xl p-3 text-center text-xs" style={{ backgroundColor: "#0F172A", color: "#4B5563" }}>
            All settings saved automatically · Persists after refresh
          </div>
        </div>
      </div>
    </div>
  );
}
