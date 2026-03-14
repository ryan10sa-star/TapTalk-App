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
import { Settings as GearIcon, X } from "lucide-react";
import { setAudioHighEnergy, setActiveVoice, preloadSfx } from "@/lib/audio";
import { VOICE_PROFILES } from "@/lib/settingsContext";

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
      data-testid="about-modal-backdrop"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl mx-4 p-6 flex flex-col gap-4"
        style={{ maxWidth: 360, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="about-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center rounded-full focus:outline-none"
          style={{ width: 28, height: 28, color: "#94A3B8" }}
          data-testid="about-modal-close"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-lg font-black text-white leading-none shrink-0"
            style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)", width: 28, height: 28, fontSize: 11 }}
          >
            TT
          </div>
          <span className="text-base font-black tracking-tight" style={{ color: "#1E293B" }}>
            TapTalk AAC™
          </span>
        </div>

        <div className="w-full" style={{ height: 1, backgroundColor: "#E2E8F0" }} />

        <div className="flex flex-col gap-3 text-sm leading-relaxed" style={{ color: "#475569" }}>
          <p>
            TapTalk AAC™ started as a dad building a communication tool for his daughter Maya's classroom in Lake County. It grew into something bigger.
          </p>
          <p>
            This app was built using AI-assisted development and is a project of RelayForge — an AI agent platform currently in development.
          </p>
          <p className="font-semibold" style={{ color: "#1E293B" }}>
            TapTalk AAC is and will always be free for students and classrooms.
          </p>
          <p>Built with ❤️ by Ryan &amp; Sheldon</p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <a
            href="https://ko-fi.com/talktapaac"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 px-4 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FF5E5B", color: "#fff" }}
            data-testid="about-kofi-link"
          >
            ☕ Support this project on Ko-fi
          </a>
          <a
            href="https://relayforge.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 px-4 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#F1F5F9", color: "#2563EB" }}
            data-testid="about-relayforge-link"
          >
            Learn about RelayForge →
          </a>
        </div>
      </div>
    </div>
  );
}

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
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    setAudioHighEnergy(settings.audioHighEnergyEnabled);
  }, [settings.audioHighEnergyEnabled]);

  useEffect(() => {
    const profile = VOICE_PROFILES.find((v) => v.slug === settings.selectedVoiceSlug);
    if (profile) setActiveVoice(profile.slug, profile.id);
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
            TapTalk AAC™
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://ko-fi.com/talktapaac"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-white font-semibold leading-none transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FF5E5B", fontSize: 8 }}
            data-testid="footer-kofi-link"
            aria-label="Support on Ko-fi"
          >
            ☕ Ko-fi
          </a>

          <button
            onClick={() => setInfoOpen(true)}
            className="flex items-center justify-center focus:outline-none"
            style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1, width: 18, height: 18 }}
            data-testid="button-about-info"
            aria-label="About TapTalk AAC"
          >
            ⓘ
          </button>

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
      </div>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {infoOpen && <AboutModal onClose={() => setInfoOpen(false)} />}
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
