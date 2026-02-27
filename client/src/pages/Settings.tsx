import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, CheckCircle2, Sparkles, Volume2, Vibrate, Eye, ToggleLeft, ToggleRight, ChevronRight, ShieldCheck } from "lucide-react";
import { useSettings, hapticTap } from "@/lib/settingsContext";
import { Button } from "@/components/ui/button";

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

export default function Settings({ onClose }: SettingsProps) {
  const { settings, update, isWordVisible } = useSettings();
  const [vocabulary, setVocabulary] = useState<VocabWord[]>([]);
  const [vocabSearch, setVocabSearch] = useState("");
  const [testState, setTestState] = useState<"idle" | "running" | "done">("idle");
  const [showConfetti, setShowConfetti] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
