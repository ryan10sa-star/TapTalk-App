import { useState, useCallback } from "react";
import { speakWord } from "@/lib/audio";
import { logTap } from "@/lib/indexeddb";
import { RefreshCw, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type BoardMode = "or" | "first-then" | "blank-then";

interface Activity {
  word: string;
  color: string;
}

const ACTIVITY_BANK: Activity[] = [
  { word: "Kinetic Sand", color: "#D97706" },
  { word: "Blocks", color: "#2563EB" },
  { word: "Trains", color: "#DC2626" },
  { word: "Dolls", color: "#DB2777" },
  { word: "Playdough", color: "#7C3AED" },
  { word: "Bubbles", color: "#0891B2" },
  { word: "Trucks", color: "#EA580C" },
  { word: "Swing", color: "#059669" },
  { word: "Slide", color: "#0284C7" },
  { word: "Puzzle", color: "#CA8A04" },
  { word: "Paint", color: "#BE185D" },
  { word: "Music", color: "#6D28D9" },
  { word: "Dance", color: "#0F766E" },
  { word: "Draw", color: "#1D4ED8" },
  { word: "Read", color: "#065F46" },
  { word: "Bike", color: "#B45309" },
  { word: "Swim", color: "#0369A1" },
  { word: "Build", color: "#7C2D12" },
  { word: "Games", color: "#4338CA" },
  { word: "Movie", color: "#374151" },
  { word: "Recess", color: "#059669" },
  { word: "Cooking", color: "#B45309" },
  { word: "Garden", color: "#166534" },
  { word: "Party", color: "#BE185D" },
  { word: "Snack", color: "#D97706" },
  { word: "Lunch", color: "#EA580C" },
];

const MODES: { id: BoardMode; label: string; desc: string }[] = [
  { id: "or", label: "Choice 1 OR Choice 2", desc: "Pick one of two options" },
  { id: "first-then", label: "First ▸ Then", desc: "First do this, then get that" },
  { id: "blank-then", label: "__ ▸ Then", desc: "Open first slot, then reward" },
];

function ActivityPicker({
  value,
  label,
  labelColor,
  placeholder,
  activities,
  onSelect,
  onClear,
}: {
  value: Activity | null;
  label: string;
  labelColor: string;
  placeholder: string;
  activities: Activity[];
  onSelect: (a: Activity) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fn = value ? value.word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "") : null;

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div
        className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
        style={{ backgroundColor: labelColor + "22", color: labelColor }}
      >
        {label}
      </div>

      <button
        onClick={() => setOpen(!open)}
        data-testid={`choice-slot-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className="w-full aspect-square max-h-44 rounded-2xl flex flex-col items-center justify-center gap-2 border-3 transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2"
        style={{
          border: `3px solid ${value ? value.color : "#CBD5E1"}`,
          backgroundColor: value ? value.color + "15" : "#F8FAFC",
          minHeight: "120px",
        }}
        aria-label={value ? `Selected: ${value.word}. Tap to change.` : placeholder}
      >
        {value ? (
          <>
            <div className="w-16 h-16 flex items-center justify-center">
              <ActivityImage word={value.word} color={value.color} />
            </div>
            <span className="font-bold text-sm" style={{ color: value.color }}>{value.word}</span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-2xl">+</div>
            <span className="text-xs font-medium">{placeholder}</span>
          </div>
        )}
      </button>

      {value && (
        <Button size="sm" variant="ghost" onClick={onClear} className="text-xs text-muted-foreground h-7">
          <RefreshCw size={12} className="mr-1" /> Change
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white p-4 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base">Choose an activity</h3>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Done</Button>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {activities.map((act) => (
                <button
                  key={act.word}
                  onClick={() => { onSelect(act); setOpen(false); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95"
                  style={{ borderColor: act.color + "66", backgroundColor: act.color + "11" }}
                >
                  <div className="w-10 h-10">
                    <ActivityImage word={act.word} color={act.color} />
                  </div>
                  <span className="text-xs font-semibold leading-tight text-center" style={{ color: act.color }}>{act.word}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityImage({ word, color }: { word: string; color: string }) {
  const [err, setErr] = useState(false);
  const fn = word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  if (err) return <ImageOff size={28} style={{ color, opacity: 0.4 }} />;
  return (
    <img
      src={`/aac-images/${fn}.png`}
      alt={word}
      className="w-full h-full object-contain"
      onError={() => setErr(true)}
      draggable={false}
    />
  );
}

export default function ChoiceBoard() {
  const [mode, setMode] = useState<BoardMode>("or");
  const [slot1, setSlot1] = useState<Activity | null>(null);
  const [slot2, setSlot2] = useState<Activity | null>(null);
  const [chosen, setChosen] = useState<Activity | null>(null);

  const handleChoose = useCallback((act: Activity) => {
    speakWord(act.word);
    logTap(act.word, "choice-board");
    setChosen(act);
  }, []);

  const handleReset = useCallback(() => {
    setSlot1(null);
    setSlot2(null);
    setChosen(null);
  }, []);

  const currentMode = MODES.find((m) => m.id === mode)!;

  const connector = mode === "or" ? (
    <div className="flex items-center justify-center shrink-0">
      <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg text-white shadow-md" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
        OR
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center shrink-0">
      <div className="flex flex-col items-center gap-1">
        <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[20px] border-t-slate-400" />
        <span className="text-xs text-muted-foreground font-bold">THEN</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50" data-testid="choice-board-page">
      <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b" style={{ borderColor: "#E2E8F0" }}>
        <h1 className="font-black text-lg text-slate-800 mb-2">Choice Board</h1>
        <div className="flex items-center gap-1.5 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setSlot1(null); setSlot2(null); setChosen(null); }}
              data-testid={`mode-${m.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
              style={{
                backgroundColor: mode === m.id ? "#2563EB" : "transparent",
                color: mode === m.id ? "white" : "#2563EB",
                borderColor: "#2563EB",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{currentMode.desc}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {chosen ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-8">
            <div
              className="w-40 h-40 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-xl"
              style={{ backgroundColor: chosen.color + "20", border: `4px solid ${chosen.color}` }}
            >
              <div className="w-20 h-20">
                <ActivityImage word={chosen.word} color={chosen.color} />
              </div>
              <span className="font-black text-xl" style={{ color: chosen.color }}>{chosen.word}</span>
            </div>
            <div className="text-2xl font-black text-slate-700">
              {mode === "or" ? "Great choice!" : "First, let's do..."}
            </div>
            <Button onClick={handleReset} variant="outline" size="lg">
              <RefreshCw size={16} className="mr-2" /> Start Over
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className={`flex items-center gap-4 ${mode !== "or" ? "flex-col" : ""}`}>
              <ActivityPicker
                value={slot1}
                label={mode === "or" ? "Choice 1" : "First"}
                labelColor="#059669"
                placeholder="Tap to add"
                activities={ACTIVITY_BANK}
                onSelect={setSlot1}
                onClear={() => setSlot1(null)}
              />
              {connector}
              <ActivityPicker
                value={slot2}
                label={mode === "or" ? "Choice 2" : "Then"}
                labelColor={mode === "or" ? "#DC2626" : "#F59E0B"}
                placeholder="Tap to add"
                activities={ACTIVITY_BANK}
                onSelect={setSlot2}
                onClear={() => setSlot2(null)}
              />
            </div>

            {mode === "or" && slot1 && slot2 && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleChoose(slot1)}
                  data-testid="button-choose-1"
                  className="flex-1 py-3 rounded-xl font-black text-white text-base active:scale-95 transition-all"
                  style={{ backgroundColor: "#059669", boxShadow: "0 3px 0 #065F46" }}
                >
                  Choose {slot1.word}
                </button>
                <button
                  onClick={() => handleChoose(slot2)}
                  data-testid="button-choose-2"
                  className="flex-1 py-3 rounded-xl font-black text-white text-base active:scale-95 transition-all"
                  style={{ backgroundColor: "#DC2626", boxShadow: "0 3px 0 #991B1B" }}
                >
                  Choose {slot2.word}
                </button>
              </div>
            )}

            {(mode === "first-then" || mode === "blank-then") && slot2 && (
              <button
                onClick={() => handleChoose(slot2)}
                data-testid="button-confirm-then"
                className="w-full py-3 rounded-xl font-black text-white text-base active:scale-95 transition-all"
                style={{ backgroundColor: "#F59E0B", boxShadow: "0 3px 0 #B45309" }}
              >
                OK! {mode === "blank-then" ? "I'll do it!" : `After ${slot1?.word ?? "…"}, I get ${slot2.word}!`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
