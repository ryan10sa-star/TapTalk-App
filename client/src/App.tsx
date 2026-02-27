import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ChoiceBoard from "@/pages/ChoiceBoard";
import TokenBoard from "@/pages/TokenBoard";
import VisualSchedule from "@/pages/VisualSchedule";
import Settings from "@/pages/Settings";
import { SafetyBar } from "@/components/SafetyBar";
import { BottomNav } from "@/components/BottomNav";
import { PartnerProvider } from "@/lib/partnerContext";
import { SettingsProvider, useSettings } from "@/lib/settingsContext";
import { useState, useRef, useCallback, useEffect } from "react";
import { Settings as GearIcon } from "lucide-react";
import { setAudioHighEnergy, setActiveVoiceSlug, preloadSfx } from "@/lib/audio";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/choice-board" component={ChoiceBoard} />
      <Route path="/token-board" component={TokenBoard} />
      <Route path="/schedule" component={VisualSchedule} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { settings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setAudioHighEnergy(settings.audioHighEnergyEnabled);
  }, [settings.audioHighEnergyEnabled]);

  useEffect(() => {
    setActiveVoiceSlug(settings.selectedVoiceSlug);
  }, [settings.selectedVoiceSlug]);

  useEffect(() => {
    preloadSfx(["token-earn", "reward-fanfare", "timer-done", "schedule-done", "lock", "unlock"]);
  }, []);
  const [gearProgress, setGearProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const HOLD_MS = 3000;
  const TICK = 30;

  const startGearHold = useCallback(() => {
    setGearProgress(0);
    progressTimer.current = setInterval(() => {
      setGearProgress((p) => Math.min(p + (TICK / HOLD_MS) * 100, 100));
    }, TICK);
    holdTimer.current = setTimeout(() => {
      clearInterval(progressTimer.current!);
      setGearProgress(0);
      setSettingsOpen(true);
    }, HOLD_MS);
  }, []);

  const cancelGearHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    setGearProgress(0);
  }, []);

  const circumference = 2 * Math.PI * 8;
  const dashOffset = circumference - (gearProgress / 100) * circumference;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-hidden">
        <Router />
      </div>
      <SafetyBar />
      <BottomNav />

      <div
        className="shrink-0 flex items-center justify-between px-4"
        style={{
          backgroundColor: "#F8FAFC",
          borderTop: "1px solid #E2E8F0",
          minHeight: "26px",
          paddingTop: "4px",
          paddingBottom: "4px",
        }}
        data-testid="app-footer"
      >
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center justify-center rounded font-black text-white leading-none"
            style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)", width: 14, height: 14, fontSize: 7 }}
          >
            TT
          </div>
          <span className="text-xs font-black tracking-tight" style={{ color: "#2563EB", letterSpacing: "-0.01em" }}>
            TapTalk
          </span>
          <span className="text-xs" style={{ color: "#CBD5E1" }}>· AAC</span>
        </div>

        <button
          onMouseDown={startGearHold}
          onMouseUp={cancelGearHold}
          onMouseLeave={cancelGearHold}
          onTouchStart={(e) => { e.preventDefault(); startGearHold(); }}
          onTouchEnd={cancelGearHold}
          onTouchCancel={cancelGearHold}
          data-testid="button-settings-gear"
          aria-label="Hold for 3 seconds to open Teacher's Vault"
          className="relative flex items-center justify-center focus:outline-none"
          style={{ width: 22, height: 22 }}
        >
          {gearProgress > 0 && (
            <svg
              className="absolute inset-0 -rotate-90"
              width="22" height="22"
              viewBox="0 0 22 22"
              style={{ pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" fill="none" stroke="#60A5FA" strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.03s linear" }}
              />
            </svg>
          )}
          <GearIcon
            size={13}
            style={{
              color: gearProgress > 0 ? "#60A5FA" : "#CBD5E1",
              transition: "color 0.2s ease",
            }}
          />
        </button>
      </div>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <PartnerProvider>
            <Toaster />
            <AppShell />
          </PartnerProvider>
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
