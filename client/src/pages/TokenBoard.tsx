import { useState, useCallback } from "react";
import { speakWord, playSfx, playCelebrationSound } from "@/lib/audio";
import { RefreshCw, ThumbsUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings, hapticTap } from "@/lib/settingsContext";

const TOTAL_TOKENS = 5;

function Confetti() {
  const colors = ["#F59E0B", "#2563EB", "#DC2626", "#059669", "#7C3AED", "#DB2777", "#EA580C", "#0891B2"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 48 }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = `${(i * 2.08) % 100}%`;
        const delay = `${(i * 0.017) % 0.8}s`;
        const duration = `${1.2 + (i % 10) * 0.1}s`;
        const size = `${6 + (i % 8)}px`;
        return (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left,
              top: "-20px",
              width: size,
              height: size,
              backgroundColor: color,
              animation: `confettiFall ${duration} ${delay} ease-in forwards`,
              transform: `rotate(${i * 7.5}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function TokenSlot({ filled, index, onClick }: { filled: boolean; index: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid={`token-slot-${index}`}
      aria-label={filled ? `Token ${index + 1} earned` : `Token ${index + 1} — tap to add`}
      className="relative focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 rounded-full"
      style={{ cursor: filled ? "default" : "pointer" }}
    >
      <div
        className="rounded-full flex items-center justify-center transition-all duration-500"
        style={{
          width: "clamp(52px, 14vw, 80px)",
          height: "clamp(52px, 14vw, 80px)",
          backgroundColor: filled ? "#FDE68A" : "#F1F5F9",
          border: `4px solid ${filled ? "#F59E0B" : "#CBD5E1"}`,
          boxShadow: filled
            ? "0 4px 0 #D97706, 0 6px 20px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.5)"
            : "0 2px 0 #E2E8F0, inset 0 1px 0 rgba(255,255,255,0.8)",
          transform: filled ? "scale(1.05)" : "scale(1)",
        }}
      >
        {filled ? (
          <svg viewBox="0 0 40 40" className="w-2/3 h-2/3" aria-hidden="true">
            <circle cx="20" cy="20" r="18" fill="#F59E0B" />
            <circle cx="20" cy="20" r="14" fill="#FDE68A" />
            <circle cx="20" cy="20" r="10" fill="#F59E0B" />
            <text x="20" y="26" textAnchor="middle" fontSize="14" fill="#92400E" fontWeight="bold">★</text>
          </svg>
        ) : (
          <span className="text-2xl font-black text-slate-300">{index + 1}</span>
        )}
      </div>
    </button>
  );
}

export default function TokenBoard() {
  const { settings } = useSettings();
  const [count, setCount] = useState(() => {
    try { return parseInt(localStorage.getItem("taptalk-tokens") ?? "0", 10); } catch { return 0; }
  });
  const [celebrating, setCelebrating] = useState(false);

  const rewardName = settings.rewardLabel.trim() || null;

  const handleSlotTap = useCallback((index: number) => {
    if (celebrating) return;
    if (count === TOTAL_TOKENS) return;
    if (index !== count) return;

    hapticTap(settings.hapticEnabled, 35);
    const newCount = count + 1;
    setCount(newCount);
    try { localStorage.setItem("taptalk-tokens", String(newCount)); } catch {}
    playSfx("token-earn");
    speakWord("Token");

    if (newCount === TOTAL_TOKENS) {
      setTimeout(() => {
        setCelebrating(true);
        speakWord(rewardName ? `Reward earned! Time for ${rewardName}!` : "Great job! Reward earned!");
        playSfx("reward-fanfare", { highEnergy: true });
        playCelebrationSound();
        hapticTap(settings.hapticEnabled, [100, 50, 100, 50, 300]);
        setTimeout(() => setCelebrating(false), 4000);
      }, 300);
    }
  }, [count, celebrating, rewardName, settings.hapticEnabled]);

  const handleReset = useCallback(() => {
    setCount(0);
    setCelebrating(false);
    try { localStorage.setItem("taptalk-tokens", "0"); } catch {}
    speakWord("Let's earn more tokens!");
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-yellow-50 to-amber-50" data-testid="token-board-page">
      {celebrating && settings.celebrationEnabled && <Confetti />}

      <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b flex items-center justify-between" style={{ borderColor: "#FDE68A" }}>
        <div>
          <h1 className="font-black text-lg text-slate-800">Token Board</h1>
          <p className="text-xs text-amber-700 font-medium">Earn {TOTAL_TOKENS} tokens for your reward!</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        {celebrating ? (
          <div className="flex flex-col items-center gap-4 text-center" style={{ animation: settings.celebrationEnabled ? "bounce 1s infinite" : "none" }}>
            {settings.celebrationEnabled ? (
              <div className="text-6xl">🌟</div>
            ) : (
              <CheckCircle2 size={64} className="text-green-500" />
            )}
            <div className="text-3xl font-black text-amber-700">
              {settings.celebrationEnabled ? "Reward Earned!" : "Well Done ✓"}
            </div>
            {rewardName && (
              <div className="text-2xl font-black px-6 py-3 rounded-2xl text-white shadow-xl" style={{ backgroundColor: "#D97706" }}>
                {rewardName}!
              </div>
            )}
            <Button onClick={handleReset} size="lg" className="mt-2">
              <RefreshCw size={16} className="mr-2" /> Start Again
            </Button>
          </div>
        ) : (
          <>
            <div
              className="w-full max-w-xs rounded-3xl p-4 flex items-center gap-3 shadow-lg"
              style={{
                backgroundColor: "#FEF3C722",
                border: "3px solid #F59E0B",
              }}
              data-testid="reward-display"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: "#F59E0B" }}
              >
                {rewardName ? (
                  <span className="text-xl font-black">★</span>
                ) : (
                  <ThumbsUp size={22} strokeWidth={2.5} />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Working for</div>
                <div
                  className="font-black text-base"
                  style={{ color: "#D97706" }}
                  data-testid="text-reward-label"
                >
                  {rewardName ?? "Reward!"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-5" data-testid="token-slots">
              {Array.from({ length: TOTAL_TOKENS }).map((_, i) => (
                <TokenSlot
                  key={i}
                  index={i}
                  filled={i < count}
                  onClick={() => handleSlotTap(i)}
                />
              ))}
            </div>

            <div className="text-center">
              <div className="text-4xl font-black text-amber-700">{count} / {TOTAL_TOKENS}</div>
              <div className="text-sm text-amber-600 font-medium mt-1">
                {count === 0
                  ? "Tap the first circle to add a token!"
                  : count < TOTAL_TOKENS
                  ? `${TOTAL_TOKENS - count} more to go!`
                  : "All done! Great job!"}
              </div>
            </div>

            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                data-testid="button-reset-tokens"
                className="text-amber-700"
              >
                <RefreshCw size={14} className="mr-1.5" /> Reset
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
