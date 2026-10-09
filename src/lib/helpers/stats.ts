import { ItemComponents, ItemDefinition, ItemDefinitions } from "@/lib/types";
import { ARMOR_STATS } from "@/lib/constants";

export type StatTotals = Record<number, number>;

export const ARMOR_STAT_HASHES = Object.values(ARMOR_STATS);

const emptyTotals = (): StatTotals => Object.fromEntries(ARMOR_STAT_HASHES.map((hash) => [hash, 0]));

// The stat each class's class ability used to depend on (Titan: Resilience/Health, Hunter: Mobility/Weapons,
// Warlock: Recovery/Class). Fragments lowering "your class ability stat" list one conditional penalty for each.
const CLASS_ABILITY_STATS: Record<number, number> = {
    0: ARMOR_STATS.RESILIENCE,
    1: ARMOR_STATS.MOBILITY,
    2: ARMOR_STATS.RECOVERY,
};

/**
 * The armor stats a subclass plug (fragment...) changes, for a character of this class.
 * Most fragments flag their stats as conditionally active although the game always applies them; the exception is the
 * penalty on the class ability stat (Spark of Focus, Echo of Persistence), where only the character's class entry applies.
 */
export const subclassPlugStats = (plug: ItemDefinition | undefined, classType: number | undefined) => {
    const stats = (plug?.investmentStats ?? []).filter((stat) => ARMOR_STAT_HASHES.includes(stat.statTypeHash));
    const conditional = stats.filter((stat) => stat.isConditionallyActive).map((stat) => stat.statTypeHash);
    const perClass = Object.values(CLASS_ABILITY_STATS).every((statHash) => conditional.includes(statHash));
    return stats.filter((stat) =>
        !perClass || !stat.isConditionallyActive || (classType !== undefined && stat.statTypeHash === CLASS_ABILITY_STATS[classType])
    );
};

/** What a plug adds to a stat once inserted in an armor piece (stat mods...). Conditional bonuses are left out. */
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

/** What a set of subclass plugs (fragments, aspects) adds on its own, for a character of this class. */
export const plugsStats = (plugHashes: (number | undefined)[], itemDefinitions: ItemDefinitions, classType: number | undefined): StatTotals => {
    const totals = emptyTotals();
    plugHashes.forEach((plugHash) => {
        subclassPlugStats(itemDefinitions[plugHash ?? 0], classType).forEach((stat) => { totals[stat.statTypeHash] += stat.value; });
    });
    return totals;
};

export const sumStats = (parts: StatTotals[]): StatTotals => {
    const totals = emptyTotals();
    parts.forEach((part) => ARMOR_STAT_HASHES.forEach((statHash) => { totals[statHash] += part[statHash] ?? 0; }));
    return totals;
};

// Armor stats on a character go from 0 to 200
const MAX_CHARACTER_STAT = 200;

/**
 * A character's stats once its subclass plugs change (other fragments, or another subclass equipped): what the old
 * plugs gave is taken out and what the new ones give is added. Lets the stats follow a change right away, as Bungie
 * keeps serving the old profile for a while. Values stay in the game's 0-200 range; stats that aren't armor stats are kept.
 */
export const statsWithSubclassChange = (
    stats: Record<string, number>,
    oldPlugHashes: (number | undefined)[],
    newPlugHashes: (number | undefined)[],
    itemDefinitions: ItemDefinitions,
    classType: number | undefined
): Record<string, number> => {
    const removed = plugsStats(oldPlugHashes, itemDefinitions, classType);
    const added = plugsStats(newPlugHashes, itemDefinitions, classType);
    const updated = { ...stats };
    ARMOR_STAT_HASHES.forEach((statHash) => {
        if (updated[statHash] === undefined) return;
        const value = updated[statHash] - removed[statHash] + added[statHash];
        updated[statHash] = Math.min(MAX_CHARACTER_STAT, Math.max(0, value));
    });
    return updated;
};
