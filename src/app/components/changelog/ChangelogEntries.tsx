"use client";

import { ChangeKind, ChangelogEntry, CURRENT_VERSION } from "@/lib/changelog";
import { useLocale, useT } from "@/lib/i18n";

// New features first, then what got better, then what got fixed
const KIND_ORDER: ChangeKind[] = ["feature", "improvement", "fix"];

const KIND_STYLES: Record<ChangeKind, string> = {
  feature: "bg-[#7e57c2]/20 text-purple-200",
  improvement: "bg-cyan-400/10 text-cyan-300",
  fix: "bg-amber-400/10 text-amber-300",
};

/** The release day in the reader's language; the date is a calendar day, so it's read in UTC */
const formatDate = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/** Releases with their changes grouped by kind, for the "What's new" window and the changelog page */
const ChangelogEntries = ({ entries, compact = false }: { entries: ChangelogEntry[]; compact?: boolean }) => {
  const t = useT();
  const locale = useLocale();

  return (
    <div className={`flex flex-col ${compact ? "gap-6" : "gap-10"}`}>
      {entries.map((entry) => (
        <section key={entry.version} aria-labelledby={`changelog-${entry.version}`}>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <h3 id={`changelog-${entry.version}`} className={`${compact ? "text-lg" : "text-2xl"} font-semibold text-white`}>
              {t.changelog.version(entry.version)}
            </h3>
            {entry.version === CURRENT_VERSION && (
              <span className="rounded bg-[#7e57c2] px-2 py-0.5 text-xs uppercase tracking-wider text-white">{t.changelog.latest}</span>
            )}
            <time dateTime={entry.date} className="text-sm text-gray-500">{formatDate(entry.date, locale)}</time>
          </div>
          <ul className="flex flex-col gap-2">
            {KIND_ORDER.flatMap((kind) => entry.changes.filter((change) => change.kind === kind)).map((change, index) => (
              <li key={index} className="flex items-start gap-3 text-sm leading-6 text-gray-300">
                <span className={`mt-0.5 w-20 shrink-0 rounded px-2 text-center text-xs leading-5 uppercase tracking-wider ${KIND_STYLES[change.kind]}`}>
                  {t.changelog.kinds[change.kind]}
                </span>
                <span>{change.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default ChangelogEntries;
