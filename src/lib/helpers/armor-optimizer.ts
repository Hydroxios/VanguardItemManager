// Armor optimizer: finds the armor pieces (one per slot) that reach the wanted stats, the best total first

import { ARMOR_SLOTS, SOCKET_CATEGORIES, TIER_TYPES } from "@/lib/constants";
import { ARMOR_STAT_ORDER } from "@/lib/helpers/item-stats";
import { plugStatBonus } from "@/lib/helpers/stats";
import { getAvailablePlugs, getEnergyCapacity, getEnergyCost } from "@/lib/helpers/mods";
import { OwnedItem } from "@/lib/helpers/inventory-cleaner";
import { ItemComponents, ItemDefinition, ItemDefinitions, PlugSets } from "@/lib/types";

/** Armor stats on a character go from 0 to 200 */
export const MAX_STAT = 200;
/** What a major stat mod adds */
export const STAT_MOD_VALUE = 10;
/** One stat mod per armor piece */
export const MAX_STAT_MODS = ARMOR_SLOTS.length;
/** Builds kept, the best first */
export const MAX_BUILDS = 50;
/** Combinations looked at before giving up, so a huge vault can't freeze the page */
const MAX_VISITS = 3_000_000;

/** Stat values in the order of ARMOR_STAT_ORDER */
export type StatVector = number[];

export interface OptimizerPiece extends OwnedItem {
    slot: number
    /** The piece's stats without its stat mods, which the optimizer picks again */
    stats: StatVector
    isExotic: boolean
    setHash?: number
}

/** "any": at most one exotic; "none": no exotic; a number: that exotic (item hash) */
export type ExoticChoice = "any" | "none" | number;

export interface OptimizerOptions {
    /** Lowest value wanted for each stat, 0 for none */
    minimums: StatVector
    /** How much each stat weighs in the score, 0 to leave it out */
    weights: number[]
    exotic: ExoticChoice
    /** Armor set whose bonus is wanted, with how many pieces of it */
    set?: { hash: number, count: number }
    /** Stat mods the optimizer may add to reach the minimums */
    statMods: number
}

export interface Build {
    pieces: OptimizerPiece[]
    /** The character's stats with this armor, its subclass and the mods, capped at 200 */
    stats: StatVector
    /** The stat (index in ARMOR_STAT_ORDER) of each mod to add */
    mods: number[]
    /** Weighted sum of the stats (capped at 200), without the mods */
    score: number
}

export interface OptimizerResult {
    builds: Build[]
    /** The search stopped before looking at every combination */
    truncated: boolean
}

const STAT_COUNT = ARMOR_STAT_ORDER.length;
const zeros = () => new Array<number>(STAT_COUNT).fill(0);

/** The armor mod sockets of an item */
const armorModSockets = (definition: ItemDefinition | undefined) => (definition?.sockets?.socketCategories ?? [])
    .filter((category) => category.socketCategoryHash === SOCKET_CATEGORIES.ARMOR_MODS)
    .flatMap((category) => category.socketIndexes);

/** Whether a plug raises armor stats unconditionally (a stat mod) */
const isStatMod = (plugHash: number | undefined, itemDefinitions: ItemDefinitions) =>
    ARMOR_STAT_ORDER.some((statHash) => plugStatBonus(plugHash, statHash, itemDefinitions) !== 0);

/**
 * An armor piece's stats without the stat mods in its mod sockets: the instance stats count them, and the optimizer
 * adds its own. Masterwork, tuning and the rest stay.
 */
export const baseArmorStats = (itemInstanceId: string, definition: ItemDefinition | undefined, itemComponents: ItemComponents, itemDefinitions: ItemDefinitions): StatVector => {
    const instanceStats = itemComponents.stats[itemInstanceId]?.stats ?? {};
    const sockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
    const modPlugs = armorModSockets(definition).map((socketIndex) => sockets[socketIndex]?.plugHash).filter((plugHash) => isStatMod(plugHash, itemDefinitions));
    return ARMOR_STAT_ORDER.map((statHash) =>
        (instanceStats[statHash]?.value ?? 0) - modPlugs.reduce<number>((total, plugHash) => total + plugStatBonus(plugHash, statHash, itemDefinitions), 0));
};

/** The armor a character of this class can wear, among the gear of the vault and the characters. */
export const collectArmor = (gear: OwnedItem[], classType: number | undefined, itemDefinitions: ItemDefinitions, itemComponents: ItemComponents): OptimizerPiece[] =>
    gear.flatMap((owned): OptimizerPiece[] => {
        const definition = itemDefinitions[owned.item.itemHash];
        const slot = definition?.equippingBlock?.equipmentSlotTypeHash ?? 0;
        if (!ARMOR_SLOTS.includes(slot)) return [];
        if (definition.classType !== undefined && definition.classType !== 3 && definition.classType !== classType) return [];
        if (!itemComponents.stats[owned.item.itemInstanceId]) return [];
        return [{
            ...owned,
            slot,
            stats: baseArmorStats(owned.item.itemInstanceId, definition, itemComponents, itemDefinitions),
            isExotic: definition.inventory?.tierType === TIER_TYPES.EXOTIC,
            setHash: definition.equippingBlock?.equipableItemSetHash,
        }];
    });

const dominates = (a: StatVector, b: StatVector) => a.every((value, index) => value >= b[index]);

/**
 * Leaves out the pieces another one beats on every stat, as they can't make a better build. Pieces only compete
 * with those that weigh the same on the exotic and set rules.
 */
export const pruneDominated = (pieces: OptimizerPiece[], setHash?: number): OptimizerPiece[] => {
    const group = (piece: OptimizerPiece) => `${piece.isExotic ? piece.item.itemHash : "legendary"}:${setHash !== undefined && piece.setHash === setHash}`;
    return pieces.filter((piece, index) => !pieces.some((other, otherIndex) =>
        otherIndex !== index
        && group(other) === group(piece)
        && dominates(other.stats, piece.stats)
        // Of two identical pieces, the first one stays
        && (!dominates(piece.stats, other.stats) || otherIndex < index)));
};

/** How many mods each stat needs to reach its minimum, or undefined when no number of mods gets there. */
const modsNeeded = (totals: StatVector, minimums: StatVector) => {
    const mods = zeros();
    for (let i = 0; i < STAT_COUNT; i++) {
        const missing = minimums[i] - totals[i];
        if (missing > 0) mods[i] = Math.ceil(missing / STAT_MOD_VALUE);
    }
    return mods;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * The best builds for the options: one piece per armor slot, the stats reaching their minimums with at most
 * `statMods` mods, ranked by the weighted sum of the stats (each capped at 200), then by the fewest mods.
 * `baseline` is what the character gets without armor (subclass fragments...).
 */
export const optimizeArmor = (pieces: OptimizerPiece[], baseline: StatVector, options: OptimizerOptions): OptimizerResult => {
    const { minimums, weights, exotic, set, statMods } = options;
    const weigh = (stats: StatVector) => stats.reduce((total, value, s) => total + weights[s] * value, 0);

    const allowed = pieces.filter((piece) => {
        if (!piece.isExotic) return true;
        if (exotic === "none") return false;
        return exotic === "any" || piece.item.itemHash === exotic;
    });

    // The best pieces first, so good builds come early and raise the bar for the others
    const slots = ARMOR_SLOTS.map((slot) => pruneDominated(allowed.filter((piece) => piece.slot === slot), set?.hash)
        .sort((a, b) => weigh(b.stats) - weigh(a.stats)));
    if (slots.some((candidates) => candidates.length === 0)) return { builds: [], truncated: false };
    // Fewest candidates first, for the pruning to cut early
    slots.sort((a, b) => a.length - b.length);

    // The most each stat (and the score) can still gain, and how many set pieces and exotics can still come, from slot i on
    const suffixMax: StatVector[] = new Array(slots.length + 1).fill(null).map(zeros);
    const suffixScore = new Array<number>(slots.length + 1).fill(0);
    const suffixSet = new Array<number>(slots.length + 1).fill(0);
    const suffixExotic = new Array<boolean>(slots.length + 1).fill(false);
    for (let i = slots.length - 1; i >= 0; i--) {
        for (let s = 0; s < STAT_COUNT; s++) suffixMax[i][s] = suffixMax[i + 1][s] + Math.max(...slots[i].map((piece) => piece.stats[s]));
        suffixScore[i] = suffixScore[i + 1] + Math.max(...slots[i].map((piece) => weigh(piece.stats)));
        suffixSet[i] = suffixSet[i + 1] + (set && slots[i].some((piece) => piece.setHash === set.hash) ? 1 : 0);
        suffixExotic[i] = suffixExotic[i + 1] || slots[i].some((piece) => piece.isExotic);
    }
    const mustHaveExotic = typeof exotic === "number";

    const builds: Build[] = [];
    let visits = 0;
    let truncated = false;
    const chosen: OptimizerPiece[] = [];
    const totals = [...baseline];

    const scoreOf = (values: StatVector) => {
        let score = 0;
        for (let s = 0; s < STAT_COUNT; s++) score += weights[s] * Math.min(MAX_STAT, values[s]);
        return score;
    };
    const worstKept = () => builds.length < MAX_BUILDS ? -Infinity : builds[builds.length - 1].score;

    const keep = (build: Build) => {
        const at = builds.findIndex((other) => other.score < build.score || (other.score === build.score && other.mods.length > build.mods.length));
        builds.splice(at === -1 ? builds.length : at, 0, build);
        if (builds.length > MAX_BUILDS) builds.pop();
    };

    const search = (depth: number, exotics: number, setPieces: number) => {
        if (truncated) return;
        if (++visits > MAX_VISITS) {
            truncated = true;
            return;
        }

        // Prune: the minimums out of reach even with every remaining best roll and all the mods
        const best = totals.map((value, s) => value + suffixMax[depth][s]);
        if (sum(modsNeeded(best, minimums)) > statMods) return;
        if (set && setPieces + suffixSet[depth] < set.count) return;
        if (mustHaveExotic && exotics === 0 && !suffixExotic[depth]) return;
        // Prune: can't beat the worst build kept, even with the best rolls (a tie with fewer mods is still worth it).
        // Each slot's best piece for the score bounds it, and so does each stat's best roll under its cap
        const bound = Math.min(scoreOf(best), scoreOf(totals.map((value) => Math.max(0, value))) + suffixScore[depth]);
        if (bound < worstKept()) return;

        if (depth === slots.length) {
            if (mustHaveExotic && exotics === 0) return;
            const perStat = modsNeeded(totals, minimums);
            const mods = perStat.flatMap((count, s) => new Array<number>(count).fill(s));
            const score = scoreOf(totals);
            if (builds.length >= MAX_BUILDS) {
                const worst = builds[builds.length - 1];
                if (score < worst.score || (score === worst.score && mods.length >= worst.mods.length)) return;
            }
            const stats = totals.map((value, s) => Math.min(MAX_STAT, Math.max(0, value + perStat[s] * STAT_MOD_VALUE)));
            keep({ pieces: [...chosen], stats, mods, score });
            return;
        }

        for (const piece of slots[depth]) {
            if (piece.isExotic && exotics > 0) continue;
            chosen.push(piece);
            for (let s = 0; s < STAT_COUNT; s++) totals[s] += piece.stats[s];
            search(depth + 1, exotics + (piece.isExotic ? 1 : 0), setPieces + (set && piece.setHash === set.hash ? 1 : 0));
            for (let s = 0; s < STAT_COUNT; s++) totals[s] -= piece.stats[s];
            chosen.pop();
            if (truncated) return;
        }
    };

    search(0, 0, 0);
    // Pieces back in the game's slot order
    builds.forEach((build) => build.pieces.sort((a, b) => ARMOR_SLOTS.indexOf(a.slot) - ARMOR_SLOTS.indexOf(b.slot)));
    return { builds, truncated };
};

/**
 * Spreads a build's mods over its pieces, one per piece, the pieces with the most free energy first.
 * Returns the stat index of the mod for each piece (by instance id).
 */
export const assignMods = (build: Build, freeEnergy: (piece: OptimizerPiece) => number): Map<string, number> => {
    const order = [...build.pieces].sort((a, b) => freeEnergy(b) - freeEnergy(a));
    return new Map(build.mods.map((stat, index) => [order[index].item.itemInstanceId, stat]));
};

interface StatModContext {
    definition: ItemDefinition
    itemInstanceId: string
    characterId: string
    itemComponents: ItemComponents
    itemDefinitions: ItemDefinitions
    plugSets: PlugSets
}

/**
 * Where to put a +10 mod of a stat on an armor piece, and which plug: the socket holding a stat mod or nothing,
 * with the cheapest mod that adds exactly 10 to that stat and nothing to the others. Undefined when the piece
 * has no such socket, or not enough energy for the mod.
 */
export const findStatModPlug = (statIndex: number, context: StatModContext): { socketIndex: number, plugHash: number } | undefined => {
    const { definition, itemInstanceId, itemComponents, itemDefinitions } = context;
    const statHash = ARMOR_STAT_ORDER[statIndex];
    const sockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
    const modSockets = armorModSockets(definition);
    const capacity = getEnergyCapacity(itemInstanceId, itemComponents, itemDefinitions);

    for (const socketIndex of modSockets) {
        const current = sockets[socketIndex]?.plugHash;
        const initial = definition.sockets?.socketEntries[socketIndex]?.singleInitialItemHash;
        // Other mods (artifact, utility) stay where they are
        if (current && current !== initial && !isStatMod(current, itemDefinitions)) continue;

        const plugs = getAvailablePlugs(socketIndex, context)
            .filter((plugHash) => ARMOR_STAT_ORDER.every((other) =>
                plugStatBonus(plugHash, other, itemDefinitions) === (other === statHash ? STAT_MOD_VALUE : 0)))
            .sort((a, b) => getEnergyCost(itemDefinitions[a]) - getEnergyCost(itemDefinitions[b]));
        const plugHash = plugs[0];
        if (!plugHash) continue;

        if (capacity !== undefined) {
            const usedElsewhere = modSockets
                .filter((index) => index !== socketIndex)
                .reduce((total, index) => total + getEnergyCost(itemDefinitions[sockets[index]?.plugHash ?? 0]), 0);
            if (usedElsewhere + getEnergyCost(itemDefinitions[plugHash]) > capacity) continue;
        }
        return { socketIndex, plugHash };
    }
    return undefined;
};

/** The energy a piece has left once its stat mods are taken out, to place the build's mods where they fit best. */
export const freeEnergyWithoutStatMods = (itemInstanceId: string, definition: ItemDefinition | undefined, itemComponents: ItemComponents, itemDefinitions: ItemDefinitions) => {
    const capacity = getEnergyCapacity(itemInstanceId, itemComponents, itemDefinitions) ?? 0;
    const sockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
    const used = armorModSockets(definition)
        .map((socketIndex) => sockets[socketIndex]?.plugHash)
        .filter((plugHash) => !isStatMod(plugHash, itemDefinitions))
        .reduce<number>((total, plugHash) => total + getEnergyCost(itemDefinitions[plugHash ?? 0]), 0);
    return capacity - used;
};
