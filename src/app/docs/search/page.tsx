import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Search Docs | Vanguard Item Manager",
};

const filters = [
  {
    syntax: "perk:name",
    title: "Perk name",
    description:
      "Find items with an active visible perk matching the value. The item name is also checked as a fallback.",
    example: "perk:incandescent",
  },
  {
    syntax: "tier:number",
    title: "Gear tier",
    description:
      "Match items by their gear tier number.",
    example: "tier:5",
  },
  {
    syntax: ">=number",
    title: "Power level",
    description:
      "Compare the item's power with >=, <=, > or <. Also written power:>=550. The maximum power value is 550.",
    example: ">=550",
  },
  {
    syntax: "is:type",
    title: "Item kind and state",
    description:
      "weapon, armor, exotic, locked, unlocked, dupe (owned more than once), crafted, masterwork, featured or unfeatured. An element or slot name works too.",
    example: "is:dupe",
  },
  {
    syntax: "slot:name",
    title: "Slot",
    description:
      "kinetic, energy, power, helmet, arms, chest, legs or class.",
    example: "slot:helmet",
  },
  {
    syntax: "element:name",
    title: "Element",
    description:
      "kinetic, arc, solar, void, stasis or strand.",
    example: "element:solar",
  },
  {
    syntax: "stat:name>=number",
    title: "Armor stat",
    description:
      "Compare an armor stat with >=, <=, >, < or =: weapons, health, class, grenade, super, melee (or their old names: mobility, resilience, recovery, discipline, intellect, strength), or total for the sum.",
    example: "stat:health>=20",
  },
];

const examples = [
  {
    query: "fatebringer",
    meaning: "Search by item name.",
  },
  {
    query: "perk:incandescent is:crafted",
    meaning: "Crafted items with an active perk matching incandescent.",
  },
  {
    query: "is:exotic >=550",
    meaning: "Exotic items at 550 power.",
  },
  {
    query: "is:weapon is:dupe is:unlocked",
    meaning: "Unlocked weapons you own more than once.",
  },
  {
    query: "slot:helmet stat:total>=65",
    meaning: "Helmets with at least 65 stat points.",
  },
  {
    query: "tier:5 element:solar",
    meaning: "Tier 5 solar items.",
  },
];

export default function SearchDocsPage() {
  return (
    <main className="min-h-screen px-6 py-10 text-white sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="border-b border-white/10 pb-8">
          <Link
            href="/"
            className="mb-6 inline-flex text-sm font-semibold text-purple-300 transition-colors hover:text-white"
          >
            Back to app
          </Link>
          <p className="mb-3 text-sm uppercase text-gray-400">
            Vanguard Item Manager
          </p>
          <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">
            Search documentation
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            Use the search modal or the vault search to find items by name, perks,
            tier, power, slot, element, stats and item state. Filters can be combined in the same query.
          </p>
        </header>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Basic search</h2>
          <div className="border border-white/10 bg-[#1a1a1a]/90 p-5 shadow-xl shadow-black/20">
            <p className="leading-7 text-gray-300">
              Type any part of an item name to search across equipped items,
              character inventories, and the vault.
            </p>
            <code className="mt-4 inline-flex bg-white/10 px-3 py-2 text-sm text-white">
              fatebringer
            </code>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Filters</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {filters.map((filter) => (
              <article
                key={filter.syntax}
                className="border border-white/10 bg-[#1a1a1a]/90 p-5 shadow-xl shadow-black/20"
              >
                <code className="inline-flex bg-purple-400/10 px-2 py-1 text-sm text-purple-300">
                  {filter.syntax}
                </code>
                <h3 className="mt-4 text-xl font-semibold">{filter.title}</h3>
                <p className="mt-2 min-h-14 text-sm leading-6 text-gray-300">
                  {filter.description}
                </p>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <span className="block text-xs uppercase text-gray-500">
                    Example
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
          <h2 className="mb-4 text-2xl font-semibold">Combined examples</h2>
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
                  {example.meaning}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
