import { useState, useEffect, useCallback } from "react";
import { speakWord } from "@/lib/audio";
import { RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOTAL_TOKENS = 5;

const REWARD_POOL = [
  { label: "Kinetic Sand", color: "#D97706" },
  { label: "Bubbles", color: "#0891B2" },
  { label: "Swing", color: "#059669" },
  { label: "Playdough", color: "#7C3AED" },
  { label: "Movie Time", color: "#374151" },
  { label: "Snack", color: "#EA580C" },
  { label: "Free Play", color: "#2563EB" },
  { label: "iPad Time", color: "#6D28D9" },
];

function Confetti() {
  const colors = ["#F59E0B", "#2563EB", "#DC2626", "#059669", "#7C3AED", "#DB2777", "#EA580C", "#0891B2"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 48 }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 0.8}s`;
        const duration = `${1.2 + Math.random() * 1}s`;
        const size = `${6 + Math.random() * 8}px`;
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
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(${Math.random() * 720}deg); opacity: 0; }
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
      aria-label={filled ? `Token ${index + 1} earned` : `Token ${index + 1} - tap to add`}
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
  const [count, setCount] = useState(() => {
    try { return parseInt(localStorage.getItem("taptalk-tokens") ?? "0", 10); } catch { return 0; }
  });
  const [celebrating, setCelebrating] = useState(false);
  const [selectedReward, setSelectedReward] = useState<string>(() => {
    try { return localStorage.getItem("taptalk-reward") ?? REWARD_POOL[0].label; } catch { return REWARD_POOL[0].label; }
  });
  const [showRewardPicker, setShowRewardPicker] = useState(false);

  const currentReward = REWARD_POOL.find((r) => r.label === selectedReward) ?? REWARD_POOL[0];

  useEffect(() => {
    try { localStorage.setItem("taptalk-tokens", String(count)); } catch {}
  }, [count]);

  useEffect(() => {
    try { localStorage.setItem("taptalk-reward", selectedReward); } catch {}
  }, [selectedReward]);

  const handleSlotTap = useCallback((index: number) => {
    if (celebrating) return;
    if (count === TOTAL_TOKENS) return;
    if (index !== count) return;

    const newCount = count + 1;
    setCount(newCount);
    speakWord("Token");

    if (newCount === TOTAL_TOKENS) {
      setTimeout(() => {
        setCelebrating(true);
        speakWord(`Reward earned! Time for ${selectedReward}!`);
        setTimeout(() => setCelebrating(false), 4000);
      }, 300);
    }
  }, [count, celebrating, selectedReward]);

  const handleReset = useCallback(() => {
    setCount(0);
    setCelebrating(false);
    speakWord("Let's earn more tokens!");
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-yellow-50 to-amber-50" data-testid="token-board-page">
      {celebrating && <Confetti />}

      <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b flex items-center justify-between" style={{ borderColor: "#FDE68A" }}>
        <div>
          <h1 className="font-black text-lg text-slate-800">Token Board</h1>
          <p className="text-xs text-amber-700 font-medium">Earn {TOTAL_TOKENS} tokens for your reward!</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowRewardPicker(!showRewardPicker)}
          data-testid="button-pick-reward"
          aria-label="Pick reward"
        >
          <Settings size={18} />
        </Button>
      </div>

      {showRewardPicker && (
        <div className="shrink-0 bg-amber-50 border-b p-3" style={{ borderColor: "#FDE68A" }}>
          <p className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wide">Working for:</p>
          <div className="flex flex-wrap gap-2">
            {REWARD_POOL.map((r) => (
              <button
                key={r.label}
                onClick={() => { setSelectedReward(r.label); setShowRewardPicker(false); }}
                data-testid={`reward-option-${r.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all"
                style={{
                  borderColor: r.color,
                  backgroundColor: selectedReward === r.label ? r.color : "transparent",
                  color: selectedReward === r.label ? "white" : r.color,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        {celebrating ? (
          <div className="flex flex-col items-center gap-4 text-center animate-bounce">
            <div className="text-6xl">🌟</div>
            <div className="text-3xl font-black text-amber-700">Reward Earned!</div>
            <div
              className="text-2xl font-black px-6 py-3 rounded-2xl text-white shadow-xl"
              style={{ backgroundColor: currentReward.color }}
            >
              {selectedReward}!
            </div>
            <Button onClick={handleReset} size="lg" className="mt-2">
              <RefreshCw size={16} className="mr-2" /> Start Again
            </Button>
          </div>
        ) : (
          <>
            <div
              className="w-full max-w-xs rounded-3xl p-4 flex items-center gap-3 shadow-lg"
              style={{
                backgroundColor: currentReward.color + "20",
                border: `3px solid ${currentReward.color}`,
              }}
              data-testid="reward-display"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-xl shrink-0"
                style={{ backgroundColor: currentReward.color }}
              >
                ★
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Working for</div>
                <div className="font-black text-base" style={{ color: currentReward.color }}>{selectedReward}</div>
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
