import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface VoiceProfile {
  id: string;
  slug: string;
  name: string;
  gender: "female" | "male";
  style: string;
  accent: string;
  primary?: boolean;
}

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", slug: "sarah",   name: "Sarah",   gender: "female", style: "Warm & Calm",       accent: "American", primary: true },
  { id: "21m00Tcm4TlvDq8ikWAM", slug: "rachel",  name: "Rachel",  gender: "female", style: "Clear & Bright",    accent: "American" },
  { id: "LcfcDJNUP1GQjkzn1xUU", slug: "emily",   name: "Emily",   gender: "female", style: "Gentle & Soft",     accent: "American" },
  { id: "XB0fDUnXU5powFXDhCwa", slug: "charlotte",name: "Charlotte",gender:"female",style: "Crisp & Friendly",  accent: "British"  },
  { id: "pNInz6obpgDQGcFmaJgB", slug: "adam",    name: "Adam",    gender: "male",   style: "Steady & Clear",    accent: "American" },
  { id: "TxGEqnHWrfWFTfGW9XjX", slug: "josh",    name: "Josh",    gender: "male",   style: "Deep & Warm",       accent: "American" },
  { id: "onwK4e9ZLuTAKqWW03F9", slug: "daniel",  name: "Daniel",  gender: "male",   style: "Authoritative",     accent: "British"  },
  { id: "ErXwobaYiN019PkySvjV", slug: "antoni",  name: "Antoni",  gender: "male",   style: "Relaxed & Friendly",accent: "American" },
];

export interface AppSettings {
  celebrationEnabled: boolean;
  audioHighEnergyEnabled: boolean;
  hapticEnabled: boolean;
  maskedWords: string[];
  selectedVoiceSlug: string;
}

const STORAGE_KEY = "taptalk-settings-v1";

const DEFAULTS: AppSettings = {
  celebrationEnabled: true,
  audioHighEnergyEnabled: true,
  hapticEnabled: true,
  maskedWords: [],
  selectedVoiceSlug: "sarah",
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  isWordVisible: (word: string) => boolean;
  activeVoice: VoiceProfile;
}

const FALLBACK_VOICE = VOICE_PROFILES[0];

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
  isWordVisible: () => true,
  activeVoice: FALLBACK_VOICE,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  function update(patch: Partial<AppSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function isWordVisible(word: string): boolean {
    return !settings.maskedWords.includes(word);
  }

  const activeVoice =
    VOICE_PROFILES.find((v) => v.slug === settings.selectedVoiceSlug) ?? FALLBACK_VOICE;

  return (
    <SettingsContext.Provider value={{ settings, update, isWordVisible, activeVoice }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function hapticTap(enabled: boolean, pattern: number | number[] = 40) {
  if (!enabled) return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {}
}
