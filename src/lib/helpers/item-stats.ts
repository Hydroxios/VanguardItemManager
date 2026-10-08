// Stat lines of an item tooltip: values, how they're drawn, and what the masterwork and mods add

import { ARMOR_STATS, WEAPON_STATS } from "@/lib/constants";
import { plugStatBonus } from "@/lib/helpers/stats";
import { ItemComponents, ItemDefinition, ItemDefinitions, ItemStats, ScaledStatDefinition, StatGroupDefinitions } from "@/lib/types";

export type StatDisplay = "bar" | "number" | "recoil";

export interface StatRow {
    statHash: number
    value: number
    /** What the masterwork adds to the value */
    masterwork: number
    /** What the mods add to the value */
    mods: number
    /** Value of a full bar */
    max: number
    display: StatDisplay
    /** Difference with the compared item, when there is one with this stat */
    compare?: number
}

/** Used when the item has no stat group: the order the tooltip always had */
const WEAPON_STAT_ORDER = [
    WEAPON_STATS.IMPACT, WEAPON_STATS.RANGE, WEAPON_STATS.STABILITY, WEAPON_STATS.HANDLING, WEAPON_STATS.RELOAD_SPEED,
    WEAPON_STATS.CHARGE_TIME, WEAPON_STATS.DRAW_TIME, WEAPON_STATS.BLAST_RADIUS, WEAPON_STATS.VELOCITY,
    WEAPON_STATS.ROUNDS_PER_MINUTE, WEAPON_STATS.MAGAZINE,
];
const NUMERIC_WEAPON_STATS = [WEAPON_STATS.ROUNDS_PER_MINUTE, WEAPON_STATS.MAGAZINE];
// Milliseconds: their stat group scale doesn't fit them
const TIME_STATS = [WEAPON_STATS.CHARGE_TIME, WEAPON_STATS.DRAW_TIME];
const TIME_STAT_MAX = 1000;

export const ARMOR_STAT_ORDER = [
    ARMOR_STATS.MOBILITY, ARMOR_STATS.RESILIENCE, ARMOR_STATS.RECOVERY,
    ARMOR_STATS.DISCIPLINE, ARMOR_STATS.INTELLECT, ARMOR_STATS.STRENGTH,
];
/** A full bar for an armor stat: a tier 5 piece tops out around there with its masterwork and a stat mod */
export const ARMOR_STAT_BAR_MAX = 45;

/** Rounds halves to the even neighbour, like the game does when scaling stats */
const roundHalfEven = (value: number) => {
    const rounded = Math.round(value);
    return Math.abs(value % 1) === 0.5 && rounded % 2 !== 0 ? rounded - 1 : rounded;
};

/** The value the game shows for an investment value, along the stat's interpolation curve. */
export const interpolateStat = (investment: number, interpolation: ScaledStatDefinition["displayInterpolation"]) => {
    if (interpolation.length === 0) return investment;
    const end = interpolation.findIndex((point) => point.value > investment);
    if (end === -1) return interpolation[interpolation.length - 1].weight;
    if (end === 0) return interpolation[0].weight;
    const from = interpolation[end - 1];
    const to = interpolation[end];
    const t = (investment - from.value) / (to.value - from.value);
    return roundHalfEven(from.weight + t * (to.weight - from.weight));
};

/**
 * Where the recoil of a weapon goes, in degrees from straight up (negative is left), and how far it can stray
 * either side of that. 100 recoils straight up; the lower the value, the more it strays, leaning left or right along a sine.
 */
export const recoilDirection = (value: number) => ({
    angle: Math.sin((value + 5) * (Math.PI / 10)) * (100 - value) * 0.8,
    spread: (100 - value) * 0.5,
});

interface StatContext {
    definition: ItemDefinition
    itemInstanceId: string | undefined
    itemComponents: ItemComponents
    itemDefinitions: ItemDefinitions
    statGroupDefinitions: StatGroupDefinitions
    masterwork?: ItemDefinition
    mods: ItemDefinition[]
    /** Stats of the item to compare with */
    compareStats?: ItemStats["stats"]
}

const bonuses = (statHash: number, { masterwork, mods, itemDefinitions }: StatContext) => ({
    masterwork: plugStatBonus(masterwork?.hash, statHash, itemDefinitions),
    mods: mods.reduce((total, mod) => total + plugStatBonus(mod.hash, statHash, itemDefinitions), 0),
});

/**
 * A stat Bungie leaves out of the instance stats (aim assistance, zoom...), from the investment values of the item
 * and of the plugs in its sockets. Undefined when nothing invests in it.
 */
const hiddenStatValue = (statHash: number, scaled: ScaledStatDefinition, maximum: number, context: StatContext) => {
    const { definition, itemInstanceId, itemComponents, itemDefinitions } = context;
    const sources = [
        definition,
        ...(itemComponents.sockets[itemInstanceId ?? ""]?.sockets ?? []).map((socket) => itemDefinitions[socket.plugHash ?? 0]),
    ];
    const investments = sources.flatMap((source) => (source?.investmentStats ?? [])
        .filter((stat) => stat.statTypeHash === statHash && !stat.isConditionallyActive));
    if (investments.length === 0) return undefined;
    const investment = investments.reduce((total, stat) => total + stat.value, 0);
    return interpolateStat(Math.max(0, Math.min(investment, maximum)), scaled.displayInterpolation);
};

const withCompare = (row: StatRow, compareStats: StatContext["compareStats"]): StatRow => {
    const other = compareStats?.[row.statHash]?.value;
    return other === undefined ? row : { ...row, compare: row.value - other };
};

export const getWeaponStatRows = (context: StatContext): StatRow[] => {
    const { definition, itemInstanceId, itemComponents, statGroupDefinitions, compareStats } = context;
    const instanceStats = itemComponents.stats[itemInstanceId ?? ""]?.stats ?? {};
    const group = statGroupDefinitions[definition.stats?.statGroupHash ?? 0];
    const order = group ? group.scaledStats.map((stat) => stat.statHash) : WEAPON_STAT_ORDER;

    return order.flatMap((statHash): StatRow[] => {
        const scaled = group?.scaledStats.find((stat) => stat.statHash === statHash);
        const value = instanceStats[statHash]?.value
            ?? (scaled ? hiddenStatValue(statHash, scaled, group?.maximumValue ?? 100, context) : undefined);
        if (value === undefined) return [];

        const display: StatDisplay = statHash === WEAPON_STATS.RECOIL_DIRECTION ? "recoil"
            : (scaled?.displayAsNumeric || NUMERIC_WEAPON_STATS.includes(statHash)) ? "number"
                : "bar";
        const max = TIME_STATS.includes(statHash) ? TIME_STAT_MAX
            : definition.stats?.stats[statHash]?.displayMaximum || scaled?.maximumValue || 100;

        return [withCompare({ statHash, value, max, display, ...bonuses(statHash, context) }, compareStats)];
    });
};

export const getArmorStatRows = (context: StatContext): StatRow[] => {
    const { itemInstanceId, itemComponents, compareStats } = context;
    const instanceStats = itemComponents.stats[itemInstanceId ?? ""]?.stats ?? {};
    return ARMOR_STAT_ORDER.flatMap((statHash): StatRow[] => {
        const value = instanceStats[statHash]?.value;
        if (value === undefined) return [];
        return [withCompare({ statHash, value, max: ARMOR_STAT_BAR_MAX, display: "bar", ...bonuses(statHash, context) }, compareStats)];
    });
};
