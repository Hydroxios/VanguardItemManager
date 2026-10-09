"use client";

import Image from "next/image";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { ARMOR_STAT_HASHES, StatTotals } from "@/lib/helpers/stats";

// Armor stats go up to 200 since Armor 3.0
const STAT_MAX = 200;

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "—");
const deltaColor = (delta: number) => (delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-gray-600");

interface LoadoutStatsProps {
  stats: StatTotals;
  compareTo: StatTotals;
  /** What `compareTo` is, next to the title */
  compareLabel?: string;
}

/** The loadout's armor stats, with the difference from what the character wears now. */
const LoadoutStats = ({ stats, compareTo, compareLabel = "vs equipped" }: LoadoutStatsProps) => {
  const { statsDefinitions } = useDefinitions();
  const total = ARMOR_STAT_HASHES.reduce((sum, hash) => sum + stats[hash], 0);
  const totalDelta = total - ARMOR_STAT_HASHES.reduce((sum, hash) => sum + compareTo[hash], 0);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wider text-gray-400">
        Stats <span className="normal-case text-gray-600">{compareLabel}</span>
      </span>
      {ARMOR_STAT_HASHES.map((hash) => {
        const definition = statsDefinitions[hash];
        const value = stats[hash];
        const delta = value - compareTo[hash];
        return (
          <div key={hash} className="flex items-center gap-2 text-sm">
            <span className="relative size-4 shrink-0">
              {definition?.displayProperties.icon && (
                <Image src={`https://www.bungie.net${definition.displayProperties.icon}`} alt="" fill sizes="16px" />
              )}
            </span>
            <span className="w-20 shrink-0 truncate text-gray-300">{definition?.displayProperties.name ?? "Stat"}</span>
            <div className="h-1.5 flex-1 bg-white/10">
              <div className="h-full bg-white transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(value / STAT_MAX, 1)) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right tabular-nums text-white">{value}</span>
            <span className={`w-9 shrink-0 text-right text-xs tabular-nums ${deltaColor(delta)}`}>{formatDelta(delta)}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-2 text-sm border-t border-white/10 pt-1.5">
        <span className="size-4 shrink-0" />
        <span className="w-20 shrink-0 text-gray-400">Total</span>
        <span className="flex-1" />
        <span className="w-8 shrink-0 text-right tabular-nums text-white">{total}</span>
        <span className={`w-9 shrink-0 text-right text-xs tabular-nums ${deltaColor(totalDelta)}`}>{formatDelta(totalDelta)}</span>
      </div>
    </div>
  );
};

export default LoadoutStats;
