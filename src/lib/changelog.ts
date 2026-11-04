import packageJson from "../../package.json";
import type { Locale } from "./i18n";

export type ChangeKind = "feature" | "improvement" | "fix";

export interface Change {
  kind: ChangeKind;
  text: string;
}

export interface ChangelogEntry {
  /** MAJOR.MINOR.PATCH */
  version: string;
  /** Release day, YYYY-MM-DD */
  date: string;
  changes: Change[];
}

/** The languages with a changelog file (CHANGELOG.md for English, CHANGELOG.<locale>.md for the others) */
export const CHANGELOG_LOCALES = ["en", "fr"] as const;
export type ChangelogLocale = typeof CHANGELOG_LOCALES[number];

/** Every changelog file, parsed; English always has every release */
export type Changelogs = Record<ChangelogLocale, ChangelogEntry[]>;

/** The version running, which the newest release of CHANGELOG.md must match */
export const CURRENT_VERSION: string = packageJson.version;

/** The section headings a change can be listed under, in every changelog language */
const KIND_HEADINGS: Record<string, ChangeKind> = {
  new: "feature",
  nouveau: "feature",
  improved: "improvement",
  "amélioré": "improvement",
  fixed: "fix",
  "corrigé": "fix",
};

// "## 1.1.0 - 2026-11-04", also "## [1.1.0] - 2026-11-04" (Keep a Changelog) and with an en or em dash
const VERSION_HEADING = /^## \[?(\d+\.\d+\.\d+)\]?\s+[-–—]\s+(\d{4}-\d{2}-\d{2})\s*$/;
const KIND_HEADING = /^### (.+?)\s*$/;
const ITEM = /^[-*] (.+)$/;

/**
 * Reads a changelog file: a "## version - date" heading per release, "### New / Improved / Fixed" sections (or their
 * translations) and one "- " item per change, which may wrap on indented lines. Anything before the first release is
 * an introduction and is skipped. A line it doesn't understand throws, so a malformed file fails the tests and the build
 * rather than showing a broken changelog.
 */
export const parseChangelog = (markdown: string, fileName = "changelog"): ChangelogEntry[] => {
  const entries: ChangelogEntry[] = [];
  let entry: ChangelogEntry | undefined;
  let kind: ChangeKind | undefined;
  let change: Change | undefined;

  const fail = (lineNumber: number, reason: string): never => {
    throw new Error(`${fileName}:${lineNumber}: ${reason}`);
  };

  markdown.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const version = line.match(VERSION_HEADING);
    if (version) {
      entry = { version: version[1], date: version[2], changes: [] };
      entries.push(entry);
      kind = undefined;
      change = undefined;
      return;
    }
    if (line.startsWith("## ")) fail(lineNumber, `expected "## MAJOR.MINOR.PATCH - YYYY-MM-DD", got "${line}"`);
    // The introduction
    if (!entry) return;

    if (line.trim() === "") {
      change = undefined;
      return;
    }

    const heading = line.match(KIND_HEADING);
    if (heading) {
      kind = KIND_HEADINGS[heading[1].toLowerCase()];
      if (!kind) fail(lineNumber, `unknown section "${heading[1]}", expected one of ${Object.keys(KIND_HEADINGS).join(", ")}`);
      change = undefined;
      return;
    }

    const item = line.match(ITEM);
    if (item) {
      if (!kind) return fail(lineNumber, "a change must be under a ### section");
      change = { kind, text: item[1].trim() };
      entry.changes.push(change);
      return;
    }

    // An item wrapping on the next lines
    if (change && /^\s+\S/.test(line)) {
      change.text += ` ${line.trim()}`;
      return;
    }

    fail(lineNumber, `unexpected line "${line}"`);
  });

  return entries;
};

/** Negative when a is older than b, positive when newer, 0 when they are the same version */
export const compareVersions = (a: string, b: string): number => {
  const [aParts, bParts] = [a, b].map((version) => version.split(".").map(Number));
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * The releases in this language, newest first. A release missing from its translation, and every release in a
 * language without a changelog file, is shown in English.
 */
export const localizeChangelog = (changelogs: Changelogs, locale: Locale): ChangelogEntry[] => {
  const translated = (CHANGELOG_LOCALES as readonly string[]).includes(locale) ? changelogs[locale as ChangelogLocale] : [];
  return changelogs.en.map((entry) => translated.find(({ version }) => version === entry.version) ?? entry);
};

/**
 * The releases a player hasn't seen yet, newest first. Someone who never saw the changelog (a first visit, or a
 * visit from before it existed) gets only the newest release, not the whole history.
 */
export const unseenEntries = (seenVersion: string | null, entries: ChangelogEntry[]): ChangelogEntry[] =>
  seenVersion === null
    ? entries.slice(0, 1)
    : entries.filter((entry) => compareVersions(entry.version, seenVersion) > 0);

const SEEN_STORAGE_KEY = "changelogSeenVersion";

// The seen version lives in localStorage; these listeners let the page hear its own changes
const listeners = new Set<() => void>();
export const subscribeSeenVersion = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** The newest version the player has seen the changelog of, null if never */
export const getSeenVersion = (): string | null => {
  if (typeof window === "undefined") return CURRENT_VERSION;
  try {
    return localStorage.getItem(SEEN_STORAGE_KEY);
  } catch {
    // Storage blocked: don't show the window on every visit
    return CURRENT_VERSION;
  }
};

/** Nothing to show while rendering on the server, so hydration matches */
export const getServerSeenVersion = () => CURRENT_VERSION;

export const markChangelogSeen = () => {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, CURRENT_VERSION);
  } catch {
    // Storage blocked: the window shows again next visit
  }
  listeners.forEach((listener) => listener());
};
