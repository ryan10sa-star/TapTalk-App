import { useCallback } from "react";
import { speakWord } from "@/lib/audio";
import { logTap } from "@/lib/indexeddb";
import { useSettings, hapticTap } from "@/lib/settingsContext";

export function SafetyBar() {
  const { settings } = useSettings();

  const handleBreak = useCallback(() => {
    hapticTap(settings.hapticEnabled, 60);
    speakWord("Break");
    logTap("Break", "safety");
  }, [settings.hapticEnabled]);

  const handleBathroom = useCallback(() => {
    hapticTap(settings.hapticEnabled, 60);
    speakWord("Bathroom");
    logTap("Bathroom", "safety");
  }, [settings.hapticEnabled]);

  return (
    <div
      className="shrink-0 flex items-center gap-2 px-3 py-2"
      style={{
        backgroundColor: "#FFF7ED",
        borderTop: "2px solid #FED7AA",
      }}
      data-testid="safety-bar"
    >
      <button
        onClick={handleBreak}
        data-testid="button-break"
        aria-label="Break"
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-white text-base transition-all duration-100 active:scale-95 focus:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: "#DC2626",
          boxShadow: "0 3px 0 #991B1B, 0 4px 12px rgba(220,38,38,0.35)",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          letterSpacing: "0.05em",
        }}
      >
        <BreakIcon />
        BREAK
      </button>

      <button
        onClick={handleBathroom}
        data-testid="button-bathroom"
        aria-label="Bathroom"
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-white text-base transition-all duration-100 active:scale-95 focus:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: "#2563EB",
          boxShadow: "0 3px 0 #1D4ED8, 0 4px 12px rgba(37,99,235,0.35)",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          letterSpacing: "0.05em",
        }}
      >
        <BathroomIcon />
        BATHROOM
      </button>
    </div>
  );
}

function BreakIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 9v6m4-6v6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BathroomIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3a3 3 0 100 6 3 3 0 000-6zM6 21v-3a3 3 0 013-3h0a3 3 0 013 3v3M15 6a3 3 0 100 6 3 3 0 000-6zM12 21v-3a3 3 0 013-3h0a3 3 0 013 3v3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
