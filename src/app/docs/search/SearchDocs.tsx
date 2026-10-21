"use client";

import Link from "next/link";
import { Dictionary, useT } from "@/lib/i18n";

// The syntax is the same in every language; only the explanations are translated
const filters: { syntax: string, example: string, text: keyof Dictionary["docs"]["filterTexts"] }[] = [
  { syntax: "perk:name", example: "perk:incandescent", text: "perk" },
  { syntax: "tier:number", example: "tier:5", text: "tier" },
  { syntax: ">=number", example: ">=550", text: "power" },
  { syntax: "is:type", example: "is:dupe", text: "is" },
  { syntax: "slot:name", example: "slot:helmet", text: "slot" },
  { syntax: "element:name", example: "element:solar", text: "element" },
  { syntax: "stat:name>=number", example: "stat:health>=20", text: "stat" },
];

const examples: { query: string, text: keyof Dictionary["docs"]["exampleTexts"] }[] = [
  { query: "fatebringer", text: "name" },
  { query: "perk:incandescent is:crafted", text: "craftedPerk" },
  { query: "is:exotic >=550", text: "exoticPower" },
  { query: "is:weapon is:dupe is:unlocked", text: "unlockedDupes" },
  { query: "slot:helmet stat:total>=65", text: "helmetStats" },
  { query: "tier:5 element:solar", text: "tierElement" },
];

const SearchDocs = () => {
  const t = useT();

  return (
    <main className="min-h-screen px-6 py-10 text-white sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="border-b border-white/10 pb-8">
          <Link
            href="/"
            className="mb-6 inline-flex text-sm font-semibold text-purple-300 transition-colors hover:text-white"
          >
            {t.docs.backToApp}
          </Link>
          <p className="mb-3 text-sm uppercase text-gray-400">
            Vanguard Item Manager
          </p>
          <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">
            {t.docs.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            {t.docs.intro}
          </p>
        </header>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">{t.docs.basicSearch}</h2>
          <div className="border border-white/10 bg-[#1a1a1a]/90 p-5 shadow-xl shadow-black/20">
            <p className="leading-7 text-gray-300">
              {t.docs.basicSearchText}
            </p>
            <code className="mt-4 inline-flex bg-white/10 px-3 py-2 text-sm text-white">
              fatebringer
            </code>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">{t.docs.filters}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {filters.map((filter) => (
              <article
                key={filter.syntax}
                className="border border-white/10 bg-[#1a1a1a]/90 p-5 shadow-xl shadow-black/20"
              >
                <code className="inline-flex bg-purple-400/10 px-2 py-1 text-sm text-purple-300">
                  {filter.syntax}
                </code>
                <h3 className="mt-4 text-xl font-semibold">{t.docs.filterTexts[filter.text].title}</h3>
                <p className="mt-2 min-h-14 text-sm leading-6 text-gray-300">
                  {t.docs.filterTexts[filter.text].description}
                </p>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <span className="block text-xs uppercase text-gray-500">
                    {t.docs.example}
                  </span>
                  <code className="mt-2 inline-flex bg-black/40 px-2 py-1 text-sm text-white">
                    {filter.example}
                  </code>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">{t.docs.combinedExamples}</h2>
          <div className="overflow-hidden border border-white/10 bg-[#1a1a1a]/90 shadow-xl shadow-black/20">
            {examples.map((example) => (
              <div
                key={example.query}
                className="grid gap-3 border-b border-white/10 p-5 last:border-b-0 md:grid-cols-[minmax(0,260px)_1fr]"
              >
                <code className="bg-black/40 px-2 py-1 text-sm text-white">
                  {example.query}
                </code>
                <p className="text-sm leading-6 text-gray-300">
                  {t.docs.exampleTexts[example.text]}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default SearchDocs;
