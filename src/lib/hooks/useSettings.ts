"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface Settings {
  /** Minutes between automatic profile refreshes, 0 for never */
  refreshInterval: 0 | 1 | 3 | 5;
  /** How long the pointer must settle on an item before its tooltip opens */
  tooltipSpeed: "fast" | "normal" | "slow";
  /** "system" follows the OS reduced-motion preference */
  motion: "system" | "reduced" | "full";
  notificationDuration: "short" | "normal" | "long";
  rememberVaultFilters: boolean;
  vaultItemSize: "small" | "medium" | "large";
}

export const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 3,
  tooltipSpeed: "normal",
  motion: "system",
  notificationDuration: "normal",
  rememberVaultFilters: false,
  vaultItemSize: "medium",
};

const STORAGE_KEY = "settings";

// The settings live in localStorage; these listeners let the page hear its own changes
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

// useSyncExternalStore needs the same object back while nothing changed
let cachedRaw: string | null | undefined;
let cachedSettings = DEFAULT_SETTINGS;

/** The current settings, for code outside React (timers, callbacks) */
export const getSettings = (): Settings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      // Missing keys (settings added later) take their default
      cachedSettings = { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
    } catch {
      cachedSettings = DEFAULT_SETTINGS;
    }
  }
  return cachedSettings;
};

// Defaults while rendering on the server, so hydration matches
const getServerSettings = () => DEFAULT_SETTINGS;

export const updateSettings = (changes: Partial<Settings>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getSettings(), ...changes }));
  listeners.forEach((listener) => listener());
};

export const useSettings = () => {
  const settings = useSyncExternalStore(subscribe, getSettings, getServerSettings);
  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    updateSettings({ [key]: value } as Partial<Settings>);
  }, []);
  return { settings, setSetting };
};

/** How often the pointer is checked for settling on an item, by tooltip speed */
export const TOOLTIP_INTENT_INTERVALS: Record<Settings["tooltipSpeed"], number> = { fast: 40, normal: 80, slow: 200 };

export const NOTIFICATION_DURATION_FACTORS: Record<Settings["notificationDuration"], number> = { short: 0.6, normal: 1, long: 2 };

export const VAULT_ITEM_SIZES: Record<Settings["vaultItemSize"], number> = { small: 44, medium: 56, large: 72 };
