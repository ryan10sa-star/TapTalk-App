import { useState, useRef, useEffect } from "react";
import { Lock, Unlock } from "lucide-react";

interface PartnerModeLockProps {
  locked: boolean;
  onToggle: () => void;
}

export function PartnerModeLock({ locked, onToggle }: PartnerModeLockProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const HOLD_DURATION = 3000;
  const INTERVAL = 30;

  const startHold = () => {
    setHolding(true);
    setProgress(0);

    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(p + (INTERVAL / HOLD_DURATION) * 100, 100));
    }, INTERVAL);

    holdTimer.current = setTimeout(() => {
      clearInterval(progressTimer.current!);
      setHolding(false);
      setProgress(0);
      onToggle();
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    setHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" data-testid="partner-mode-lock">
      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={(e) => { e.preventDefault(); startHold(); }}
        onTouchEnd={cancelHold}
        onTouchCancel={cancelHold}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          backgroundColor: locked
            ? "#EF4444"
            : holding
            ? "#F59E0B22"
            : "transparent",
          border: `2px solid ${locked ? "#EF4444" : "#94A3B8"}`,
          color: locked ? "white" : "#64748B",
        }}
        aria-label={locked ? "Hold to unlock Partner Mode" : "Hold to lock Partner Mode"}
        aria-pressed={locked}
        data-testid="button-partner-lock"
      >
        {holding && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 32 32"
            style={{ pointerEvents: "none" }}
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.03s linear" }}
            />
          </svg>
        )}
        {locked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>

      {locked && (
        <div
          className="absolute top-full right-0 mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg z-50"
          style={{
            backgroundColor: "#EF4444",
            color: "white",
            pointerEvents: "none",
          }}
        >
          Partner Mode
        </div>
      )}
    </div>
  );
}
