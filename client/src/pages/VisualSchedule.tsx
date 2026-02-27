import { useState, useEffect, useRef, useCallback } from "react";
import { speakWord, playSfx } from "@/lib/audio";
import { Edit2, Check, Timer, Play, Pause, RotateCcw, ChevronDown, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCHEDULE_OPTIONS = [
  "Reading", "Centers", "Math", "Recess", "Lunch", "OT", "PT", "Speech",
  "Bathroom", "Circle Time", "Art", "Music Class", "Gym", "Library Time",
  "Snack", "Nap Time", "Story Time", "Free Play", "Writing", "Science",
];

const ITEM_COLORS: Record<string, string> = {
  "Reading": "#2563EB", "Centers": "#7C3AED", "Math": "#059669",
  "Recess": "#EA580C", "Lunch": "#D97706", "OT": "#DB2777",
  "PT": "#0891B2", "Speech": "#6D28D9", "Bathroom": "#0284C7",
  "Circle Time": "#DC2626", "Art": "#BE185D", "Music Class": "#4338CA",
  "Gym": "#065F46", "Library Time": "#1E40AF", "Snack": "#B45309",
  "Nap Time": "#374151", "Story Time": "#92400E", "Free Play": "#166534",
  "Writing": "#1D4ED8", "Science": "#065F46",
};

const DEFAULT_COLOR = "#64748B";

const DEFAULT_SCHEDULE = [
  { time: "8:30", label: "Circle Time" },
  { time: "9:00", label: "Reading" },
  { time: "9:45", label: "Math" },
  { time: "10:30", label: "Recess" },
  { time: "11:00", label: "Centers" },
  { time: "11:45", label: "Lunch" },
  { time: "12:30", label: "OT" },
  { time: "1:15", label: "Speech" },
];

const TIMER_OPTIONS = [1, 2, 5, 10];

function ScheduleItemIcon({ label, color }: { label: string; color: string }) {
  const [err, setErr] = useState(false);
  const fn = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  if (err) return <div className="w-full h-full flex items-center justify-center"><ImageOff size={18} style={{ color, opacity: 0.5 }} /></div>;
  return (
    <img
      src={`/aac-images/${fn}.png`}
      alt={label}
      className="w-full h-full object-contain"
      onError={() => setErr(true)}
      draggable={false}
    />
  );
}

function CircleTimer({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const size = 160;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const offset = circ * (1 - progress);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = Math.round(progress * 100);

  const col = pct > 50 ? "#059669" : pct > 20 ? "#F59E0B" : "#DC2626";

  return (
    <div className="flex flex-col items-center gap-2" data-testid="circle-timer">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
        />
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize="28" fontWeight="900" fill={col}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" fontSize="13" fill="#94A3B8" fontWeight="600">
          {pct}%
        </text>
      </svg>
    </div>
  );
}

function getCurrentSlot(schedule: typeof DEFAULT_SCHEDULE): number {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = schedule.length - 1; i >= 0; i--) {
    const [h, m] = schedule[i].time.split(":").map(Number);
    if (nowMinutes >= h * 60 + m) return i;
  }
  return 0;
}

export default function VisualSchedule() {
  const [schedule, setSchedule] = useState<typeof DEFAULT_SCHEDULE>(() => {
    try {
      const saved = localStorage.getItem("taptalk-schedule");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SCHEDULE;
  });
  const [editMode, setEditMode] = useState(false);
  const [editDropdown, setEditDropdown] = useState<number | null>(null);
  const [currentSlot, setCurrentSlot] = useState(() => getCurrentSlot(DEFAULT_SCHEDULE));
  const [completedSlots, setCompletedSlots] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("taptalk-completed");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  const [timerMins, setTimerMins] = useState<number | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try { localStorage.setItem("taptalk-schedule", JSON.stringify(schedule)); } catch {}
  }, [schedule]);

  useEffect(() => {
    const arr = Array.from(completedSlots);
    try { localStorage.setItem("taptalk-completed", JSON.stringify(arr)); } catch {}
  }, [completedSlots]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlot(getCurrentSlot(schedule)), 60000);
    return () => clearInterval(interval);
  }, [schedule]);

  useEffect(() => {
    if (timerRunning && timerSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerSecondsLeft((s) => {
          if (s <= 1) {
            setTimerRunning(false);
            clearInterval(timerRef.current!);
            playSfx("timer-done");
            speakWord("Time is up!");
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const startTimer = useCallback((mins: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerMins(mins);
    setTimerSecondsLeft(mins * 60);
    setTimerRunning(true);
  }, []);

  const toggleTimer = useCallback(() => {
    setTimerRunning((r) => !r);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerSecondsLeft(timerMins ? timerMins * 60 : 0);
  }, [timerMins]);

  const handleItemClick = useCallback((index: number, label: string) => {
    if (editMode) return;
    speakWord(label);
    setCompletedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        playSfx("schedule-done");
      }
      return next;
    });
  }, [editMode]);

  const updateSlotLabel = useCallback((index: number, newLabel: string) => {
    setSchedule((prev) => prev.map((s, i) => i === index ? { ...s, label: newLabel } : s));
    setEditDropdown(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50" data-testid="schedule-page">
      <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b flex items-center justify-between" style={{ borderColor: "#E2E8F0" }}>
        <div>
          <h1 className="font-black text-lg text-slate-800">Visual Schedule</h1>
          <p className="text-xs text-muted-foreground">School Day · 8:30 AM – 3:00 PM</p>
        </div>
        <Button
          size="sm"
          variant={editMode ? "default" : "outline"}
          onClick={() => { setEditMode(!editMode); setEditDropdown(null); }}
          data-testid="button-edit-schedule"
        >
          {editMode ? <><Check size={14} className="mr-1.5" /> Done</> : <><Edit2 size={14} className="mr-1.5" /> Edit</>}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2" data-testid="schedule-list">
          {schedule.map((item, i) => {
            const color = ITEM_COLORS[item.label] ?? DEFAULT_COLOR;
            const isNow = i === currentSlot;
            const isDone = completedSlots.has(i);
            const isPast = i < currentSlot && !isDone;

            return (
              <div key={i} className="relative" data-testid={`schedule-slot-${i}`}>
                <button
                  onClick={() => handleItemClick(i, item.label)}
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-150 active:scale-98 focus:outline-none focus-visible:ring-2 text-left"
                  style={{
                    backgroundColor: isDone ? "#F0FDF4" : isNow ? color + "18" : "white",
                    border: `2px solid ${isDone ? "#86EFAC" : isNow ? color : "#E2E8F0"}`,
                    boxShadow: isNow ? `0 2px 12px ${color}30` : "none",
                    opacity: isPast ? 0.55 : 1,
                  }}
                  aria-label={`${item.time} — ${item.label}${isDone ? " (done)" : isNow ? " (now)" : ""}`}
                >
                  <div
                    className="text-xs font-black shrink-0 w-12 text-right"
                    style={{ color: isNow ? color : "#94A3B8" }}
                  >
                    {item.time}
                  </div>

                  <div
                    className="w-px self-stretch shrink-0 rounded-full"
                    style={{ backgroundColor: isNow ? color : "#E2E8F0" }}
                  />

                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: color + "20" }}
                  >
                    {isDone ? (
                      <Check size={22} style={{ color: "#22C55E" }} />
                    ) : (
                      <ScheduleItemIcon label={item.label} color={color} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className="font-bold text-sm leading-tight"
                      style={{
                        color: isDone ? "#16A34A" : isNow ? color : "#374151",
                        textDecoration: isPast ? "line-through" : "none",
                      }}
                    >
                      {item.label}
                    </div>
                    {isNow && !isDone && (
                      <div className="text-xs font-semibold mt-0.5" style={{ color }}>
                        ▶ Happening now
                      </div>
                    )}
                    {isDone && (
                      <div className="text-xs font-semibold text-green-600 mt-0.5">✓ All done!</div>
                    )}
                  </div>

                  {isNow && !isDone && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: color }}
                    />
                  )}

                  {editMode && (
                    <ChevronDown size={16} className="shrink-0 text-slate-400" />
                  )}
                </button>

                {editMode && (
                  <div className="mt-1 ml-16">
                    <button
                      onClick={() => setEditDropdown(editDropdown === i ? null : i)}
                      data-testid={`edit-slot-${i}`}
                      className="text-xs text-blue-600 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Change activity...
                    </button>
                    {editDropdown === i && (
                      <div className="mt-1 bg-white rounded-xl border shadow-lg p-2 z-10 relative">
                        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                          {SCHEDULE_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => updateSlotLabel(i, opt)}
                              data-testid={`schedule-option-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                              className="text-left px-2.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors"
                              style={{ color: ITEM_COLORS[opt] ?? DEFAULT_COLOR }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="mx-3 mb-3 rounded-2xl p-4"
          style={{ backgroundColor: "white", border: "2px solid #E2E8F0" }}
          data-testid="visual-timer"
        >
          <div className="flex items-center gap-2 mb-3">
            <Timer size={16} className="text-blue-600" />
            <h2 className="font-black text-sm text-slate-700">Visual Timer</h2>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {TIMER_OPTIONS.map((mins) => (
              <button
                key={mins}
                onClick={() => startTimer(mins)}
                data-testid={`timer-${mins}min`}
                className="px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all active:scale-95"
                style={{
                  backgroundColor: timerMins === mins ? "#2563EB" : "transparent",
                  color: timerMins === mins ? "white" : "#2563EB",
                  borderColor: "#2563EB",
                }}
              >
                {mins} min
              </button>
            ))}
          </div>

          {timerMins !== null && (
            <div className="flex flex-col items-center gap-3">
              <CircleTimer secondsLeft={timerSecondsLeft} totalSeconds={timerMins * 60} />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleTimer}
                  data-testid="button-timer-toggle"
                  disabled={timerSecondsLeft === 0}
                >
                  {timerRunning ? <><Pause size={14} className="mr-1.5" /> Pause</> : <><Play size={14} className="mr-1.5" /> {timerSecondsLeft === timerMins * 60 ? "Start" : "Resume"}</>}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetTimer}
                  data-testid="button-timer-reset"
                >
                  <RotateCcw size={14} className="mr-1.5" /> Reset
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
