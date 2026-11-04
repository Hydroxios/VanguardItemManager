"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { ChangelogEntry, Changelogs, localizeChangelog } from "@/lib/changelog";
import { useLocale } from "@/lib/i18n";

const ChangelogContext = createContext<Changelogs>({ en: [], fr: [] });

/** Hands the changelog files, read by the root layout at build time, to the client components */
export const ChangelogProvider = ({ changelogs, children }: { changelogs: Changelogs; children: ReactNode }) => (
  <ChangelogContext.Provider value={changelogs}>{children}</ChangelogContext.Provider>
);

/** Every release in the chosen language, newest first */
export const useChangelog = (): ChangelogEntry[] => {
  const changelogs = useContext(ChangelogContext);
  const locale = useLocale();
  return useMemo(() => localizeChangelog(changelogs, locale), [changelogs, locale]);
};
