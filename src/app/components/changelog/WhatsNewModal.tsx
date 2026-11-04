"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CURRENT_VERSION, getSeenVersion, getServerSeenVersion, markChangelogSeen, subscribeSeenVersion, unseenEntries } from "@/lib/changelog";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { useT } from "@/lib/i18n";
import ChangelogEntries from "./ChangelogEntries";
import { useChangelog } from "./ChangelogProvider";

/** The releases since the player's last visit, once; closing it in any way marks them as seen */
const WhatsNewModal = ({ enabled }: { enabled: boolean }) => {
  const t = useT();
  const seenVersion = useSyncExternalStore(subscribeSeenVersion, getSeenVersion, getServerSeenVersion);
  const entries = unseenEntries(seenVersion, useChangelog());
  const open = enabled && entries.length > 0;

  useModalKeys(markChangelogSeen, { enabled: open });

  if (!open) return null;

  // Portaled to <body>, like the settings: above the header (1001), below the item tooltip (1005)
  return createPortal(
    <div className="fixed inset-0 z-[1003] flex items-center justify-center bg-black/80 p-4 animate-fade-in" onClick={markChangelogSeen}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="flex max-h-[85vh] w-[820px] max-w-full flex-col rounded border border-[#7e57c2] bg-[#1a1a2e] text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex min-w-0 flex-col">
            <h2 id="whats-new-title" className="truncate text-xl font-semibold text-white">{t.changelog.whatsNew}</h2>
            <span className="truncate text-sm text-gray-500">{t.changelog.whatsNewSubtitle(CURRENT_VERSION)}</span>
          </div>
          <button
            type="button"
            onClick={markChangelogSeen}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
            title={t.common.closeEsc}
            aria-label={t.common.close}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <ChangelogEntries entries={entries} compact />
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <a
            href="/changelog"
            target="_blank"
            rel="noopener noreferrer"
            className="mr-auto text-sm font-semibold text-purple-300 transition-colors hover:text-white"
          >
            {t.changelog.fullChangelog}
          </a>
          <button
            type="button"
            onClick={markChangelogSeen}
            autoFocus
            className="rounded-md bg-[#7e57c2] px-4 py-2 text-sm text-white transition-colors hover:bg-[#8e67d2]"
          >
            {t.changelog.gotIt}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default WhatsNewModal;
