import { ItemComponents, ItemDefinitions } from "@/lib/types";
import { ARMOR_STATS } from "@/lib/constants";

export type StatTotals = Record<number, number>;

export const ARMOR_STAT_HASHES = Object.values(ARMOR_STATS);

const emptyTotals = (): StatTotals => Object.fromEntries(ARMOR_STAT_HASHES.map((hash) => [hash, 0]));

/** What a plug adds to a stat once inserted (stat mods, fragments...). Conditional bonuses are left out. */
export const plugStatBonus = (plugHash: number | undefined, statHash: number, itemDefinitions: ItemDefinitions) =>
    (itemDefinitions[plugHash ?? 0]?.investmentStats ?? [])
        .filter((stat) => stat.statTypeHash === statHash && !stat.isConditionallyActive)
        .reduce((total, stat) => total + stat.value, 0);

/**
 * An armor piece's stats with other plugs in some sockets: the instance stats already count the plugs in place,
 * so each swapped socket removes the current plug's bonus and adds the new one's.
 */
export const armorStatsWithPlugs = (
    itemInstanceId: string,
    plugs: Record<number, number>,
    itemComponents: ItemComponents,
    itemDefinitions: ItemDefinitions
): StatTotals => {
    const instanceStats = itemComponents.stats[itemInstanceId]?.stats ?? {};
    const current = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
    const totals = emptyTotals();
    ARMOR_STAT_HASHES.forEach((statHash) => {
        let value = instanceStats[statHash]?.value ?? 0;
        Object.entries(plugs).forEach(([socketIndex, plugHash]) => {
            const currentPlug = current[Number(socketIndex)]?.plugHash;
            if (currentPlug === plugHash) return;
            value += plugStatBonus(plugHash, statHash, itemDefinitions) - plugStatBonus(currentPlug, statHash, itemDefinitions);
        });
        totals[statHash] = value;
    });
    return totals;
};

/** What a set of plugs adds on its own, for subclass fragments and aspects. */
export const plugsStats = (plugHashes: (number | undefined)[], itemDefinitions: ItemDefinitions): StatTotals => {
    const totals = emptyTotals();
    ARMOR_STAT_HASHES.forEach((statHash) => {
        totals[statHash] = plugHashes.reduce<number>((total, plugHash) => total + plugStatBonus(plugHash, statHash, itemDefinitions), 0);
    });
    return totals;
};

export const sumStats = (parts: StatTotals[]): StatTotals => {
    const totals = emptyTotals();
    parts.forEach((part) => ARMOR_STAT_HASHES.forEach((statHash) => { totals[statHash] += part[statHash] ?? 0; }));
    return totals;
};
