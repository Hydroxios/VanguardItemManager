// Inventory cleaner: empties a character's inventory into the vault, and points out the items worth dismantling

import { ARMOR_SLOTS, ARMOR_STATS, ITEM_STATE, WEAPON_SLOTS } from "@/lib/constants";
import { Item, ItemComponents, ItemDefinitions } from "@/lib/types";

/** Items a character holds besides its equipped ones, per bucket (the equipped one makes it 10) */
export const CHARACTER_BUCKET_CAPACITY = 9;

const VAULT_LOCATION = 2;
const CHARACTER_LOCATION = 1;

export interface ClearOptions {
    weapons: boolean
    armor: boolean
    keepLocked: boolean
}

export interface JunkOptions {
    /** Flags the worse copies of an item owned more than once */
    dupes: boolean
    /** Flags armor whose stats add up to less than this; 0 turns it off */
    minArmorTotal: number
    /** Flags gear of a lower tier than this; 0 turns it off. Gear without a tier is left alone */
    minGearTier: number
}

export type JunkReason = "dupe" | "lowStats" | "lowTier";

export interface OwnedItem {
    item: Item
    /** "vault" or a character id */
    ownerId: string
}

export interface JunkItem extends OwnedItem {
    reasons: JunkReason[]
}

const slotOf = (definitions: ItemDefinitions, item: Item) => definitions[item.itemHash]?.equippingBlock?.equipmentSlotTypeHash ?? 0;
const isWeapon = (definitions: ItemDefinitions, item: Item) => WEAPON_SLOTS.includes(slotOf(definitions, item));
const isArmor = (definitions: ItemDefinitions, item: Item) => ARMOR_SLOTS.includes(slotOf(definitions, item));
const isLocked = (item: Item) => (item.state & ITEM_STATE.LOCKED) !== 0;

export const armorTotal = (components: ItemComponents, item: Item) => {
    const stats = components.stats[item.itemInstanceId]?.stats;
    if (!stats) return undefined;
    return Object.values(ARMOR_STATS).reduce((total, hash) => total + (stats[hash]?.value ?? 0), 0);
};

/** The unequipped weapons and armor of a character's inventory (not its postmaster) that can go to the vault. */
export const findClearableItems = (inventory: Item[], definitions: ItemDefinitions, { weapons, armor, keepLocked }: ClearOptions) =>
    inventory.filter((item) =>
        item.itemInstanceId
        && item.location === CHARACTER_LOCATION
        && ((weapons && isWeapon(definitions, item)) || (armor && isArmor(definitions, item)))
        && !(keepLocked && isLocked(item)));

/** Every unequipped weapon and armor piece, in the vault or on a character. */
export const collectGear = (
    profileInventory: Item[],
    characterInventories: Record<string, { items: Item[] }>,
    definitions: ItemDefinitions,
): OwnedItem[] => {
    const isGear = (item: Item) => !!item.itemInstanceId && (isWeapon(definitions, item) || isArmor(definitions, item));
    return [
        ...profileInventory.filter((item) => item.location === VAULT_LOCATION && isGear(item)).map((item) => ({ item, ownerId: "vault" })),
        ...Object.entries(characterInventories).flatMap(([characterId, { items }]) =>
            items.filter((item) => item.location === CHARACTER_LOCATION && isGear(item)).map((item) => ({ item, ownerId: characterId }))),
    ];
};

/**
 * Orders the copies of an item, the one to keep first: locked, crafted, masterworked, then the highest tier,
 * power and stat total, then the newest.
 */
const compareKeepers = (components: ItemComponents) => (a: Item, b: Item) => {
    const keys = (item: Item) => {
        const instance = components.instances[item.itemInstanceId];
        return [
            isLocked(item) ? 1 : 0,
            item.state & ITEM_STATE.CRAFTED ? 1 : 0,
            item.state & ITEM_STATE.MASTERWORK ? 1 : 0,
            instance?.gearTier ?? 0,
            instance?.primaryStat?.value ?? 0,
            armorTotal(components, item) ?? 0,
        ];
    };
    const keysA = keys(a);
    const keysB = keys(b);
    for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) return keysB[i] - keysA[i];
    }
    // Instance ids grow as items drop
    const idA = BigInt(a.itemInstanceId);
    const idB = BigInt(b.itemInstanceId);
    return idA === idB ? 0 : idA < idB ? 1 : -1;
};

/**
 * The gear worth dismantling, with why. Locked items and the ones in `protectedIds` (loadouts) are never flagged,
 * though they still count as the copy to keep among dupes.
 */
export const findJunk = (
    gear: OwnedItem[],
    definitions: ItemDefinitions,
    components: ItemComponents,
    { dupes, minArmorTotal, minGearTier }: JunkOptions,
    protectedIds: Set<string> = new Set(),
): JunkItem[] => {
    const reasons = new Map<string, JunkReason[]>();
    const flag = (item: Item, reason: JunkReason) => {
        if (isLocked(item) || protectedIds.has(item.itemInstanceId)) return;
        reasons.set(item.itemInstanceId, [...(reasons.get(item.itemInstanceId) ?? []), reason]);
    };

    if (dupes) {
        const copies = new Map<number, Item[]>();
        gear.forEach(({ item }) => copies.set(item.itemHash, [...(copies.get(item.itemHash) ?? []), item]));
        copies.forEach((items) => {
            if (items.length < 2) return;
            [...items].sort(compareKeepers(components)).slice(1).forEach((item) => flag(item, "dupe"));
        });
    }

    gear.forEach(({ item }) => {
        if (minArmorTotal > 0 && isArmor(definitions, item)) {
            const total = armorTotal(components, item);
            if (total !== undefined && total < minArmorTotal) flag(item, "lowStats");
        }
        const tier = components.instances[item.itemInstanceId]?.gearTier;
        if (minGearTier > 0 && tier && tier < minGearTier) flag(item, "lowTier");
    });

    return gear
        .filter(({ item }) => reasons.has(item.itemInstanceId))
        .map((owned) => ({ ...owned, reasons: reasons.get(owned.item.itemInstanceId)! }));
};

/**
 * Which of the items can be brought to a character to be dismantled there, filling each bucket up to its capacity.
 * Items already on that character need no move; the others are skipped once their bucket is full.
 */
export const planGather = (items: OwnedItem[], characterId: string, characterInventory: Item[], definitions: ItemDefinitions) => {
    const used = new Map<number, number>();
    characterInventory.forEach((item) => {
        if (item.location === CHARACTER_LOCATION) used.set(item.bucketHash, (used.get(item.bucketHash) ?? 0) + 1);
    });

    const moves: OwnedItem[] = [];
    const skipped: OwnedItem[] = [];
    items.forEach((owned) => {
        if (owned.ownerId === characterId) return;
        const bucket = definitions[owned.item.itemHash]?.inventory?.bucketTypeHash;
        const count = used.get(bucket) ?? 0;
        if (bucket === undefined || count >= CHARACTER_BUCKET_CAPACITY) {
            skipped.push(owned);
            return;
        }
        used.set(bucket, count + 1);
        moves.push(owned);
    });
    return { moves, skipped };
};
