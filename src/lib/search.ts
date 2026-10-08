// Item search: one query syntax shared by the search modal and the vault

import { ARMOR_SLOTS, ARMOR_STATS, EQUIPMENT_SLOTS, ITEM_STATE, WEAPON_SLOTS } from "@/lib/constants";
import { DamageType } from "@/lib/helpers/damage-type";
import { Item, ItemComponents, ItemDefinition, PerksDefinitions } from "@/lib/types";

const EXOTIC_TIER = 6;

type Comparison = ">=" | "<=" | ">" | "<" | "=";

/** A query, split into its filters. Every filter must match; unknown values are ignored so a half-typed filter hides nothing. */
export interface ParsedSearch {
    /** Words outside any filter, matched against the item name */
    name: string
    perks: string[]
    is: string[]
    tiers: number[]
    slots: number[]
    elements: number[]
    power: { comparison: Comparison, value: number }[]
    stats: { statHashes: number[], comparison: Comparison, value: number }[]
}

export interface SearchableItem {
    item: Item
    definition: ItemDefinition
}

export interface SearchContext {
    itemComponents: ItemComponents
    perksDefinitions: PerksDefinitions
    /** Item hashes owned more than once, for `is:dupe` (see `findDupes`) */
    dupes?: Set<number>
}

const SLOTS: Record<string, number> = {
    kinetic: EQUIPMENT_SLOTS.PRIMARY,
    primary: EQUIPMENT_SLOTS.PRIMARY,
    energy: EQUIPMENT_SLOTS.ENERGETIC,
    special: EQUIPMENT_SLOTS.ENERGETIC,
    power: EQUIPMENT_SLOTS.HEAVY,
    heavy: EQUIPMENT_SLOTS.HEAVY,
    helmet: EQUIPMENT_SLOTS.HELMET,
    arms: EQUIPMENT_SLOTS.ARMS,
    gauntlets: EQUIPMENT_SLOTS.ARMS,
    chest: EQUIPMENT_SLOTS.CHEST,
    legs: EQUIPMENT_SLOTS.LEGS,
    class: EQUIPMENT_SLOTS.CLASS_ITEM,
    classitem: EQUIPMENT_SLOTS.CLASS_ITEM,
};

const ELEMENTS: Record<string, number> = {
    kinetic: DamageType.Kinetic,
    arc: DamageType.Arc,
    solar: DamageType.Solar,
    void: DamageType.Void,
    stasis: DamageType.Stasis,
    strand: DamageType.Strand,
};

// Armor stats go by their current names and by the ones they had before Edge of Fate
const STATS: Record<string, number[]> = {
    weapons: [ARMOR_STATS.MOBILITY],
    mobility: [ARMOR_STATS.MOBILITY],
    health: [ARMOR_STATS.RESILIENCE],
    resilience: [ARMOR_STATS.RESILIENCE],
    class: [ARMOR_STATS.RECOVERY],
    recovery: [ARMOR_STATS.RECOVERY],
    grenade: [ARMOR_STATS.DISCIPLINE],
    discipline: [ARMOR_STATS.DISCIPLINE],
    super: [ARMOR_STATS.INTELLECT],
    intellect: [ARMOR_STATS.INTELLECT],
    melee: [ARMOR_STATS.STRENGTH],
    strength: [ARMOR_STATS.STRENGTH],
    total: Object.values(ARMOR_STATS),
};

const COMPARISON = /^(>=|<=|>|<|=)?(\d+)$/;

const parseComparison = (text: string) => {
    const match = COMPARISON.exec(text);
    if (!match) return undefined;
    return { comparison: (match[1] ?? "=") as Comparison, value: Number(match[2]) };
};

const compare = (actual: number, { comparison, value }: { comparison: Comparison, value: number }) => {
    switch (comparison) {
        case ">=": return actual >= value;
        case "<=": return actual <= value;
        case ">": return actual > value;
        case "<": return actual < value;
        default: return actual === value;
    }
};

export const parseSearch = (query: string): ParsedSearch => {
    const parsed: ParsedSearch = { name: "", perks: [], is: [], tiers: [], slots: [], elements: [], power: [], stats: [] };
    const words: string[] = [];

    query.toLowerCase().split(/\s+/).filter(Boolean).forEach((term) => {
        // ">=550" is short for "power:>=550"
        const power = /^[<>]=?\d+$/.test(term) ? parseComparison(term) : undefined;
        if (power) {
            parsed.power.push(power);
            return;
        }

        const separator = term.indexOf(":");
        if (separator === -1) {
            words.push(term);
            return;
        }
        const key = term.slice(0, separator);
        const value = term.slice(separator + 1);
        if (!value) return;

        switch (key) {
            case "perk":
                parsed.perks.push(value);
                break;
            case "is":
                if (ELEMENTS[value] !== undefined) parsed.elements.push(ELEMENTS[value]);
                else if (SLOTS[value] !== undefined) parsed.slots.push(SLOTS[value]);
                else parsed.is.push(value);
                break;
            case "tier": {
                const tier = Number(value);
                if (Number.isInteger(tier)) parsed.tiers.push(tier);
                break;
            }
            case "slot":
                if (SLOTS[value] !== undefined) parsed.slots.push(SLOTS[value]);
                break;
            case "element":
                if (ELEMENTS[value] !== undefined) parsed.elements.push(ELEMENTS[value]);
                break;
            case "power": {
                const comparison = parseComparison(value);
                if (comparison) parsed.power.push(comparison);
                break;
            }
            case "stat": {
                // stat:weapons>=20
                const match = /^([a-z]+)(.*)$/.exec(value);
                const statHashes = match ? STATS[match[1]] : undefined;
                const comparison = match ? parseComparison(match[2]) : undefined;
                if (statHashes && comparison) parsed.stats.push({ statHashes, ...comparison });
                break;
            }
            default:
                words.push(term);
        }
    });

    parsed.name = words.join(" ");
    return parsed;
};

const slotOf = (definition: ItemDefinition) => definition.equippingBlock?.equipmentSlotTypeHash ?? 0;

const IS_FILTERS: Record<string, (searchable: SearchableItem, context: SearchContext) => boolean> = {
    weapon: ({ definition }) => WEAPON_SLOTS.includes(slotOf(definition)),
    armor: ({ definition }) => ARMOR_SLOTS.includes(slotOf(definition)),
    exotic: ({ definition }) => definition.inventory?.tierType === EXOTIC_TIER,
    featured: ({ definition }) => !!definition.isFeaturedItem,
    unfeatured: ({ definition }) => !definition.isFeaturedItem,
    locked: ({ item }) => (item.state & ITEM_STATE.LOCKED) !== 0,
    unlocked: ({ item }) => (item.state & ITEM_STATE.LOCKED) === 0,
    crafted: ({ item }) => (item.state & ITEM_STATE.CRAFTED) !== 0,
    masterwork: ({ item }) => (item.state & ITEM_STATE.MASTERWORK) !== 0,
    dupe: ({ definition }, { dupes }) => dupes?.has(definition.hash) ?? false,
};

/** The instanced items owned more than once, by item hash. */
export const findDupes = (items: SearchableItem[]) => {
    const counts = new Map<number, number>();
    items.forEach(({ item, definition }) => {
        if (item.itemInstanceId) counts.set(definition.hash, (counts.get(definition.hash) ?? 0) + 1);
    });
    return new Set([...counts].filter(([, count]) => count > 1).map(([hash]) => hash));
};

export const isEmptySearch = (search: ParsedSearch) =>
    !search.name && Object.values(search).every((value) => !Array.isArray(value) || value.length === 0);

export const matchesSearch = (search: ParsedSearch, searchable: SearchableItem, context: SearchContext) => {
    const { item, definition } = searchable;
    const { itemComponents, perksDefinitions } = context;
    const name = definition.displayProperties?.name?.toLowerCase() ?? "";
    const instance = itemComponents.instances[item.itemInstanceId];

    if (search.name && !name.includes(search.name)) return false;

    // An item whose name holds the perk's name counts too, as a convenience
    const activePerks = (itemComponents.perks[item.itemInstanceId]?.perks ?? [])
        .filter((perk) => perk.visible && perk.isActive)
        .map((perk) => perksDefinitions[perk.perkHash]?.displayProperties?.name?.toLowerCase() ?? "");
    if (!search.perks.every((perk) => name.includes(perk) || activePerks.some((perkName) => perkName.includes(perk)))) return false;

    if (!search.is.every((value) => IS_FILTERS[value]?.(searchable, context) ?? true)) return false;
    if (!search.tiers.every((tier) => instance?.gearTier === tier)) return false;
    if (!search.slots.every((slot) => slotOf(definition) === slot)) return false;

    const element = instance?.damageType || definition.defaultDamageType;
    if (!search.elements.every((value) => element === value)) return false;

    const power = instance?.primaryStat?.value;
    if (!search.power.every((comparison) => power !== undefined && compare(power, comparison))) return false;

    const stats = itemComponents.stats[item.itemInstanceId]?.stats;
    return search.stats.every(({ statHashes, ...comparison }) =>
        stats !== undefined && compare(statHashes.reduce((total, hash) => total + (stats[hash]?.value ?? 0), 0), comparison));
};
