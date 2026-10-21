"use client";

import { useSyncExternalStore } from "react";
import { en, Dictionary } from "./en";
import { fr } from "./fr";

/** The languages the Destiny data comes in; the interface follows the same choice */
export const LOCALES = ["en", "fr", "es", "de", "it", "ja", "ru", "pl", "ko"] as const;
export type Locale = typeof LOCALES[number];

export const LOCALE_STORAGE_KEY = "locale";

// Languages without an interface translation show it in English (the Destiny data is still localized)
const DICTIONARIES: Partial<Record<Locale, Dictionary>> = { en, fr };

const isLocale = (value: string | null): value is Locale => LOCALES.includes(value as Locale);

/** The chosen language, English while rendering on the server or when the stored one is unknown */
export const getLocale = (): Locale => {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : "en";
};

/** The interface texts, for code outside React (callbacks, error messages) */
export const getDictionary = (locale: Locale = getLocale()): Dictionary => DICTIONARIES[locale] ?? en;

// Changing the language reloads the page, so the stored value never changes under a rendered page
const subscribe = () => () => { };

/** Whether the interface is translated in this language, rather than shown in English */
export const hasInterfaceTranslation = (locale: Locale) => locale in DICTIONARIES;

/** The interface texts in the chosen language; English on the server so hydration matches */
export const useT = (): Dictionary => useSyncExternalStore(subscribe, getDictionary, () => en);

export const useLocale = (): Locale => useSyncExternalStore(subscribe, getLocale, () => "en");

export type { Dictionary };
