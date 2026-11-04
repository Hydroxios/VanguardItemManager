"use client";

import Link from "next/link";
import { useEffect } from "react";
import ChangelogEntries from "@/app/components/changelog/ChangelogEntries";
import { useChangelog } from "@/app/components/changelog/ChangelogProvider";
import { markChangelogSeen } from "@/lib/changelog";
import { useT } from "@/lib/i18n";

const ChangelogPage = () => {
  const t = useT();
  const entries = useChangelog();

  // Reading the whole changelog counts as seeing what's new
  useEffect(() => {
    markChangelogSeen();
  }, []);

  return (
    // The header stays in place; only the list of versions scrolls
    <main className="flex h-dvh flex-col overflow-hidden px-6 py-10 text-white sm:px-10">
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-10">
        <header className="shrink-0 border-b border-white/10 pb-8">
          <Link
            href="/"
            className="mb-6 inline-flex text-sm font-semibold text-purple-300 transition-colors hover:text-white"
          >
            {t.changelog.backToApp}
          </Link>
          <p className="mb-3 text-sm uppercase text-gray-400">
            Vanguard Item Manager
          </p>
          <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">
            {t.changelog.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            {t.changelog.intro}
          </p>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto border border-white/10 bg-[#1a1a1a]/90 p-6 shadow-xl shadow-black/20">
          <ChangelogEntries entries={entries} />
        </div>
      </div>
    </main>
  );
};

export default ChangelogPage;
