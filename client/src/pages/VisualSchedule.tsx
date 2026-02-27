import { useState, useEffect, useRef, useCallback } from "react";
import { speakWord, playSfx } from "@/lib/audio";
import { Edit2, Check, Timer, Play, Pause, RotateCcw, ChevronDown, ImageOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ALL_SCHEDULE_OPTIONS = [
  // School
  "Reading", "Centers", "Math", "Recess", "Lunch", "OT", "PT", "Speech",
  "Bathroom", "Circle Time", "Art", "Music Class", "Gym", "Library Time",
  "Snack", "Nap Time", "Story Time", "Free Play", "Writing", "Science",
  "Computer Lab", "Assembly",
  // Home
  "Breakfast", "Get Dressed", "Brush Teeth", "Pack Backpack",
  "After School", "Homework", "Dinner", "Bath Time",
  "Bedtime Routine", "Screen Time", "Chores", "Play Outside",
  "Read Together", "Family Time", "Exercise",
];

export const ITEM_COLORS: Record<string, string> = {
  "Reading":         "#2563EB",
  "Centers":         "#7C3AED",
  "Math":            "#059669",
  "Recess":          "#EA580C",
  "Lunch":           "#D97706",
  "OT":              "#DB2777",
  "PT":              "#0891B2",
  "Speech":          "#6D28D9",
  "Bathroom":        "#0284C7",
  "Circle Time":     "#DC2626",
  "Art":             "#BE185D",
  "Music Class":     "#4338CA",
  "Gym":             "#065F46",
  "Library Time":    "#1E40AF",
  "Snack":           "#B45309",
  "Nap Time":        "#374151",
  "Story Time":      "#92400E",
  "Free Play":       "#166534",
  "Writing":         "#1D4ED8",
  "Science":         "#065F46",
  "Computer Lab":    "#0F766E",
  "Assembly":        "#6D28D9",
  "Breakfast":       "#D97706",
  "Get Dressed":     "#7C3AED",
  "Brush Teeth":     "#0891B2",
  "Pack Backpack":   "#2563EB",
  "After School":    "#059669",
  "Homework":        "#1D4ED8",
  "Dinner":          "#B45309",
  "Bath Time":       "#0891B2",
  "Bedtime Routine": "#374151",
  "Screen Time":     "#6366F1",
  "Chores":          "#92400E",
  "Play Outside":    "#166534",
  "Read Together":   "#2563EB",
  "Family Time":     "#DB2777",
  "Exercise":        "#EA580C",
};

const DEFAULT_COLOR = "#64748B";

export const SCHOOL_SCHEDULE = [
  { time: "8:30", label: "Circle Time" },
  { time: "9:00", label: "Reading" },
  { time: "9:45", label: "Math" },
  { time: "10:30", label: "Recess" },
  { time: "11:00", label: "Centers" },
  { time: "11:45", label: "Lunch" },
  { time: "12:30", label: "OT" },
  { time: "1:15",  label: "Speech" },
];

export const HOME_SCHEDULE = [
  { time: "7:00", label: "Breakfast" },
  { time: "7:30", label: "Get Dressed" },
  { time: "7:45", label: "Brush Teeth" },
  { time: "8:00", label: "Pack Backpack" },
  { time: "3:30", label: "After School" },
  { time: "4:00", label: "Snack" },
  { time: "5:00", label: "Homework" },
  { time: "6:00", label: "Dinner" },
  { time: "7:00", label: "Bath Time" },
  { time: "7:30", label: "Bedtime Routine" },
];

const SCHEDULE_KEY = "taptalk-schedule";
const TIMER_OPTIONS = [1, 2, 5, 10];

type ScheduleItem = { time: string; label: string };

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function getCurrentSlot(schedule: ScheduleItem[]): number {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (nowMin >= timeToMinutes(schedule[i].time)) return i;
  }
  return 0;
}

function ScheduleItemIcon({ label, color }: { label: string; color: string }) {
  const [err, setErr] = useState(false);
  const fn = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  if (err) return (
    <div className="w-full h-full flex items-center justify-center">
      <ImageOff size={18} style={{ color, opacity: 0.5 }} />
    </div>
  );
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
          fill="none" stroke={col} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
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

function loadSchedule(): ScheduleItem[] {
  try {
    const saved = localStorage.getItem(SCHEDULE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return SCHOOL_SCHEDULE;
}

export default function VisualSchedule() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(loadSchedule);
  const [editMode, setEditMode] = useState(false);
  const [editDropdown, setEditDropdown] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  const [currentSlot, setCurrentSlot] = useState(() => getCurrentSlot(loadSchedule()));
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

  // Live clock — updates every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Re-sync schedule from localStorage when page gains focus (teacher may have edited in Settings)
  useEffect(() => {
    const onFocus = () => {
      const fresh = loadSchedule();
      setSchedule(fresh);
      setCurrentSlot(getCurrentSlot(fresh));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Save schedule changes
  useEffect(() => {
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule)); } catch {}
  }, [schedule]);

  // Save completed slots
  useEffect(() => {
    try { localStorage.setItem("taptalk-completed", JSON.stringify(Array.from(completedSlots))); } catch {}
  }, [completedSlots]);

  // Auto-advance current slot every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentSlot(getCurrentSlot(schedule)), 60000);
    return () => clearInterval(id);
  }, [schedule]);

  // Countdown timer
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

  const toggleTimer = useCallback(() => setTimerRunning((r) => !r), []);

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

  const updateSlotTime = useCallback((index: number, newTime: string) => {
    setSchedule((prev) => prev.map((s, i) => i === index ? { ...s, time: newTime } : s));
  }, []);

  const addSlot = useCallback(() => {
    setSchedule((prev) => [...prev, { time: "12:00", label: "Free Play" }]);
  }, []);

  const removeSlot = useCallback((index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
    setCompletedSlots((prev) => {
      const next = new Set<number>();
      prev.forEach((n) => { if (n < index) next.add(n); else if (n > index) next.add(n - 1); });
      return next;
    });
  }, []);

  const exitEdit = useCallback(() => {
    setEditMode(false);
    setEditDropdown(null);
    // Re-sort by time after editing
    setSchedule((prev) => [...prev].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)));
  }, []);

  const nextActivity = schedule.find((_, i) => i > currentSlot && !completedSlots.has(i));

  return (
    <div className="flex flex-col h-full bg-slate-50" data-testid="schedule-page">
      <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-black text-lg text-slate-800 leading-tight">Visual Schedule</h1>
            <div className="text-xs font-semibold text-blue-600 mt-0.5" data-testid="live-date">
              {formatDate(now)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div
              className="text-xl font-black tabular-nums leading-none text-slate-800"
              data-testid="live-clock"
            >
              {formatTime(now)}
            </div>
            <Button
              size="sm"
              variant={editMode ? "default" : "outline"}
              onClick={editMode ? exitEdit : () => setEditMode(true)}
              data-testid="button-edit-schedule"
              className="text-xs"
            >
              {editMode ? <><Check size={13} className="mr-1" /> Done</> : <><Edit2 size={13} className="mr-1" /> Edit</>}
            </Button>
          </div>
        </div>

        {nextActivity && !editMode && (
          <div className="mt-2 text-xs font-semibold text-slate-500">
            Next: <span style={{ color: ITEM_COLORS[nextActivity.label] ?? DEFAULT_COLOR }}>{nextActivity.label} at {nextActivity.time}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2" data-testid="schedule-list">
          {schedule.map((item, i) => {
            const color = ITEM_COLORS[item.label] ?? DEFAULT_COLOR;
            const isNow = i === currentSlot && !editMode;
            const isDone = completedSlots.has(i);
            const isPast = i < currentSlot && !isDone && !editMode;

            return (
              <div key={i} className="relative" data-testid={`schedule-slot-${i}`}>
                <div
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-150"
                  style={{
                    backgroundColor: isDone ? "#F0FDF4" : isNow ? color + "18" : "white",
                    border: `2px solid ${isDone ? "#86EFAC" : isNow ? color : "#E2E8F0"}`,
                    boxShadow: isNow ? `0 2px 12px ${color}30` : "none",
                    opacity: isPast ? 0.55 : 1,
                    cursor: editMode ? "default" : "pointer",
                  }}
                  onClick={() => !editMode && handleItemClick(i, item.label)}
                  role="button"
                  aria-label={`${item.time} — ${item.label}${isDone ? " (done)" : isNow ? " (now)" : ""}`}
                >
                  {editMode ? (
                    <input
                      type="time"
                      value={item.time.includes(":") && item.time.length === 4
                        ? "0" + item.time
                        : item.time.length === 4
                        ? "0" + item.time
                        : item.time}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) return;
                        const [hStr, mStr] = raw.split(":");
                        const h = parseInt(hStr, 10);
                        const m = parseInt(mStr, 10);
                        const display = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
                        updateSlotTime(i, display);
                      }}
                      data-testid={`time-input-${i}`}
                      className="text-xs font-black w-20 shrink-0 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-100 text-slate-700 border border-slate-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-xs font-black shrink-0 w-12 text-right"
                      style={{ color: isNow ? color : "#94A3B8" }}
                    >
                      {item.time}
                    </div>
                  )}

                  <div
                    className="w-px self-stretch shrink-0 rounded-full"
                    style={{ backgroundColor: isNow ? color : "#E2E8F0" }}
                  />

                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: color + "20" }}
                  >
                    {isDone && !editMode ? (
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
                      <div className="text-xs font-semibold mt-0.5" style={{ color }}>▶ Happening now</div>
                    )}
                    {isDone && !editMode && (
                      <div className="text-xs font-semibold text-green-600 mt-0.5">✓ All done!</div>
                    )}
                  </div>

                  {isNow && !isDone && !editMode && (
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color }} />
                  )}

                  {editMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSlot(i); }}
                      data-testid={`button-remove-slot-${i}`}
                      className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-50"
                      aria-label={`Remove ${item.label}`}
                    >
                      <Trash2 size={15} className="text-red-400" />
                    </button>
                  )}
                </div>

                {editMode && (
                  <div className="mt-1 ml-4">
                    <button
                      onClick={() => setEditDropdown(editDropdown === i ? null : i)}
                      data-testid={`edit-slot-${i}`}
                      className="text-xs text-blue-600 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Change: {item.label} <ChevronDown size={11} className="inline" />
                    </button>
                    {editDropdown === i && (
                      <div className="mt-1 bg-white rounded-xl border shadow-lg p-2 z-10 relative">
                        <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto">
                          {ALL_SCHEDULE_OPTIONS.map((opt) => (
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

          {editMode && (
            <button
              onClick={addSlot}
              data-testid="button-add-slot"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm border-2 border-dashed transition-all hover:bg-blue-50"
              style={{ borderColor: "#93C5FD", color: "#2563EB" }}
            >
              <Plus size={16} /> Add Activity
            </button>
          )}
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
                  {timerRunning
                    ? <><Pause size={14} className="mr-1.5" /> Pause</>
                    : <><Play size={14} className="mr-1.5" /> {timerSecondsLeft === timerMins * 60 ? "Start" : "Resume"}</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={resetTimer} data-testid="button-timer-reset">
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
