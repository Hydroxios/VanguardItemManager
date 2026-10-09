import { describe, expect, it } from "vitest";
import { components, definition, definitions, item } from "@/test/fixtures";
import { ARMOR_STATS, EQUIPMENT_SLOTS, ITEM_STATE } from "@/lib/constants";
import { ItemInstance } from "@/lib/types";
import { CHARACTER_BUCKET_CAPACITY, collectGear, findClearableItems, findJunk, planGather } from "./inventory-cleaner";

const WEAPON = 1;
const ARMOR = 2;
const SHADER = 3;
const WEAPON_BUCKET = 10;
const ARMOR_BUCKET = 20;

const defs = definitions(
    definition({ hash: WEAPON, equippingBlock: { equipmentSlotTypeHash: EQUIPMENT_SLOTS.PRIMARY, ammoType: 1 }, inventory: { bucketTypeHash: WEAPON_BUCKET, maxStackSize: 1, tierType: 5 } }),
    definition({ hash: ARMOR, equippingBlock: { equipmentSlotTypeHash: EQUIPMENT_SLOTS.HELMET, ammoType: 0 }, inventory: { bucketTypeHash: ARMOR_BUCKET, maxStackSize: 1, tierType: 5 } }),
    definition({ hash: SHADER, inventory: { bucketTypeHash: 30, maxStackSize: 99, tierType: 5 } }),
);

const instance = (fields: Partial<ItemInstance>) => fields as ItemInstance;
const NO_JUNK_RULES = { dupes: false, minArmorTotal: 0, minGearTier: 0 };

describe("findClearableItems", () => {
    const inventory = [
        item({ itemHash: WEAPON, itemInstanceId: "1" }),
        item({ itemHash: ARMOR, itemInstanceId: "2" }),
        item({ itemHash: WEAPON, itemInstanceId: "3", state: ITEM_STATE.LOCKED }),
        item({ itemHash: WEAPON, itemInstanceId: "4", location: 4 }), // postmaster
        item({ itemHash: SHADER, quantity: 5 }),
    ];
    const ids = (options: Parameters<typeof findClearableItems>[2]) => findClearableItems(inventory, defs, options).map((i) => i.itemInstanceId);

    it("takes the unequipped weapons and armor, not the postmaster nor stacks", () => {
        expect(ids({ weapons: true, armor: true, keepLocked: false })).toEqual(["1", "2", "3"]);
    });

    it("leaves locked items when asked", () => {
        expect(ids({ weapons: true, armor: true, keepLocked: true })).toEqual(["1", "2"]);
    });

    it("only takes the chosen kinds", () => {
        expect(ids({ weapons: false, armor: true, keepLocked: false })).toEqual(["2"]);
    });
});

describe("collectGear", () => {
    it("gathers the vault's and characters' gear with its owner", () => {
        const gear = collectGear(
            [item({ itemHash: WEAPON, itemInstanceId: "1", location: 2 }), item({ itemHash: SHADER, location: 2, quantity: 3 })],
            { a: { items: [item({ itemHash: ARMOR, itemInstanceId: "2" }), item({ itemHash: ARMOR, itemInstanceId: "3", location: 4 })] } },
            defs,
        );
        expect(gear.map(({ item, ownerId }) => [item.itemInstanceId, ownerId])).toEqual([["1", "vault"], ["2", "a"]]);
    });
});

describe("findJunk", () => {
    const owned = (...items: ReturnType<typeof item>[]) => items.map((i) => ({ item: i, ownerId: "vault" }));

    it("keeps the best copy of a dupe and flags the others", () => {
        const gear = owned(
            item({ itemHash: WEAPON, itemInstanceId: "1" }),
            item({ itemHash: WEAPON, itemInstanceId: "2" }),
            item({ itemHash: WEAPON, itemInstanceId: "3" }),
        );
        const comps = components({ instances: { "1": instance({ primaryStat: { statHash: 0, value: 400 } }), "2": instance({ primaryStat: { statHash: 0, value: 500 } }) } });
        const junk = findJunk(gear, defs, comps, { ...NO_JUNK_RULES, dupes: true });
        expect(junk.map(({ item }) => item.itemInstanceId).sort()).toEqual(["1", "3"]);
        expect(junk[0].reasons).toEqual(["dupe"]);
    });

    it("keeps the newest copy when nothing else tells them apart", () => {
        const gear = owned(item({ itemHash: WEAPON, itemInstanceId: "5" }), item({ itemHash: WEAPON, itemInstanceId: "12" }));
        expect(findJunk(gear, defs, components(), { ...NO_JUNK_RULES, dupes: true }).map(({ item }) => item.itemInstanceId)).toEqual(["5"]);
    });

    it("keeps a locked copy, and never flags locked or protected items", () => {
        const gear = owned(
            item({ itemHash: WEAPON, itemInstanceId: "1", state: ITEM_STATE.LOCKED }),
            item({ itemHash: WEAPON, itemInstanceId: "2" }),
            item({ itemHash: WEAPON, itemInstanceId: "3" }),
        );
        const comps = components({ instances: { "2": instance({ primaryStat: { statHash: 0, value: 999 } }) } });
        const junk = findJunk(gear, defs, comps, { ...NO_JUNK_RULES, dupes: true }, new Set(["3"]));
        expect(junk.map(({ item }) => item.itemInstanceId)).toEqual(["2"]);
    });

    it("flags armor below the stat total and gear below the tier, with every reason", () => {
        const stats = (value: number) => ({ stats: { [ARMOR_STATS.MOBILITY]: { statHash: ARMOR_STATS.MOBILITY, value }, [ARMOR_STATS.INTELLECT]: { statHash: ARMOR_STATS.INTELLECT, value } } });
        const gear = owned(
            item({ itemHash: ARMOR, itemInstanceId: "1" }),
            item({ itemHash: ARMOR, itemInstanceId: "2" }),
            item({ itemHash: WEAPON, itemInstanceId: "3" }),
            item({ itemHash: WEAPON, itemInstanceId: "4" }),
        );
        const comps = components({
            stats: { "1": stats(20), "2": stats(40) },
            instances: { "1": instance({ gearTier: 1 }), "3": instance({ gearTier: 2 }), "4": instance({ gearTier: 0 }) },
        });
        const junk = findJunk(gear, defs, comps, { dupes: false, minArmorTotal: 60, minGearTier: 3 });
        expect(junk.map(({ item, reasons }) => [item.itemInstanceId, reasons])).toEqual([["1", ["lowStats", "lowTier"]], ["3", ["lowTier"]]]);
    });
});

describe("planGather", () => {
    it("brings items until their bucket is full and skips the rest", () => {
        const inventory = Array.from({ length: CHARACTER_BUCKET_CAPACITY - 1 }, (_, i) => item({ itemHash: WEAPON, itemInstanceId: `w${i}`, bucketHash: WEAPON_BUCKET }));
        const items = [
            { item: item({ itemHash: WEAPON, itemInstanceId: "1" }), ownerId: "vault" },
            { item: item({ itemHash: WEAPON, itemInstanceId: "2" }), ownerId: "other" },
            { item: item({ itemHash: ARMOR, itemInstanceId: "3" }), ownerId: "vault" },
            { item: item({ itemHash: ARMOR, itemInstanceId: "4" }), ownerId: "me" },
        ];
        const { moves, skipped } = planGather(items, "me", inventory, defs);
        expect(moves.map(({ item }) => item.itemInstanceId)).toEqual(["1", "3"]);
        expect(skipped.map(({ item }) => item.itemInstanceId)).toEqual(["2"]);
    });
});
