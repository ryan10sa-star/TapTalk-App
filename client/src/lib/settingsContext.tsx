import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AppSettings {
  celebrationEnabled: boolean;
  audioHighEnergyEnabled: boolean;
  hapticEnabled: boolean;
  maskedWords: string[];
}

const STORAGE_KEY = "taptalk-settings-v1";

const DEFAULTS: AppSettings = {
  celebrationEnabled: true,
  audioHighEnergyEnabled: true,
  hapticEnabled: true,
  maskedWords: [],
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
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
  isWordVisible: () => true,
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

  return (
    <SettingsContext.Provider value={{ settings, update, isWordVisible }}>
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
