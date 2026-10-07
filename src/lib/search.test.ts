import { describe, expect, it } from "vitest";
import { ARMOR_STATS, EQUIPMENT_SLOTS } from "@/lib/constants";
import { DamageType } from "@/lib/helpers/damage-type";
import { ItemInstance, PerksDefinitions } from "@/lib/types";
import { components, definition, item } from "@/test/fixtures";
import { findDupes, isEmptySearch, ITEM_STATE, matchesSearch, parseSearch, SearchableItem, SearchContext } from "./search";

const weapon = (hash: number, name: string, fields: { slot?: number, element?: number, tierType?: number } = {}) => definition({
    hash,
    displayProperties: { name } as never,
    equippingBlock: { equipmentSlotTypeHash: fields.slot ?? EQUIPMENT_SLOTS.ENERGETIC, ammoType: 0 },
    defaultDamageType: fields.element ?? DamageType.Solar,
    inventory: { maxStackSize: 1, bucketTypeHash: 0, tierType: fields.tierType ?? 5 },
});

const fatebringer: SearchableItem = { item: item({ itemHash: 1, itemInstanceId: "f", state: ITEM_STATE.LOCKED }), definition: weapon(1, "Fatebringer") };
const sunshot: SearchableItem = {
    item: item({ itemHash: 2, itemInstanceId: "s", state: ITEM_STATE.CRAFTED }),
    definition: weapon(2, "Sunshot", { tierType: 6 }),
};
const helmet: SearchableItem = {
    item: item({ itemHash: 3, itemInstanceId: "h" }),
    definition: weapon(3, "Iron Helm", { slot: EQUIPMENT_SLOTS.HELMET, element: 0 }),
};

const instance = (fields: Partial<ItemInstance>) => fields as ItemInstance;
const perksDefinitions = { 10: { displayProperties: { name: "Incandescent" } } } as unknown as PerksDefinitions;
const context: SearchContext = {
    perksDefinitions,
    itemComponents: components({
        instances: {
            f: instance({ gearTier: 5, primaryStat: { statHash: 0, value: 550 } }),
            s: instance({ gearTier: 3, primaryStat: { statHash: 0, value: 540 }, damageType: DamageType.Arc }),
            h: instance({ gearTier: 5, primaryStat: { statHash: 0, value: 545 } }),
        },
        perks: { s: { perks: [{ perkHash: 10, isActive: true, visible: true, iconPath: "" }] } },
        stats: {
            h: {
                stats: {
                    [ARMOR_STATS.RESILIENCE]: { statHash: ARMOR_STATS.RESILIENCE, value: 30 },
                    [ARMOR_STATS.STRENGTH]: { statHash: ARMOR_STATS.STRENGTH, value: 40 },
                },
            },
        },
    }),
    dupes: new Set([1]),
};

const search = (query: string) => [fatebringer, sunshot, helmet]
    .filter((searchable) => matchesSearch(parseSearch(query), searchable, context))
    .map(({ definition }) => definition.displayProperties.name);

describe("parseSearch", () => {
    it("separates the name from the filters", () => {
        const parsed = parseSearch("  Fate  bringer perk:Incan is:exotic tier:5 >=550 ");
        expect(parsed.name).toBe("fate bringer");
        expect(parsed.perks).toEqual(["incan"]);
        expect(parsed.is).toEqual(["exotic"]);
        expect(parsed.tiers).toEqual([5]);
        expect(parsed.power).toEqual([{ comparison: ">=", value: 550 }]);
    });

    it("reads slots, elements and stats, under their aliases too", () => {
        const parsed = parseSearch("slot:helmet is:power element:void is:solar stat:mobility>=10 stat:total<60");
        expect(parsed.slots).toEqual([EQUIPMENT_SLOTS.HELMET, EQUIPMENT_SLOTS.HEAVY]);
        expect(parsed.elements).toEqual([DamageType.Void, DamageType.Solar]);
        expect(parsed.stats).toEqual([
            { statHashes: [ARMOR_STATS.MOBILITY], comparison: ">=", value: 10 },
            { statHashes: Object.values(ARMOR_STATS), comparison: "<", value: 60 },
        ]);
    });

    it("drops half-typed or invalid filters", () => {
        const parsed = parseSearch("perk: tier:x slot:nope stat:luck>=5 power:abc");
        expect(isEmptySearch(parsed)).toBe(true);
    });

    it("treats unknown keys as words of the name", () => {
        expect(parseSearch("vex:mythoclast").name).toBe("vex:mythoclast");
    });
});

describe("matchesSearch", () => {
    it("matches the name, case-insensitively", () => {
        expect(search("FATE")).toEqual(["Fatebringer"]);
    });

    it("matches active perks, or the perk name in the item name", () => {
        expect(search("perk:incandescent")).toEqual(["Sunshot"]);
        expect(search("perk:sun")).toEqual(["Sunshot"]);
    });

    it("filters on item kind and state", () => {
        expect(search("is:weapon")).toEqual(["Fatebringer", "Sunshot"]);
        expect(search("is:armor")).toEqual(["Iron Helm"]);
        expect(search("is:exotic")).toEqual(["Sunshot"]);
        expect(search("is:locked")).toEqual(["Fatebringer"]);
        expect(search("is:unlocked")).toEqual(["Sunshot", "Iron Helm"]);
        expect(search("is:crafted")).toEqual(["Sunshot"]);
        expect(search("is:dupe")).toEqual(["Fatebringer"]);
    });

    it("ignores unknown is: values", () => {
        expect(search("is:exo")).toHaveLength(3);
    });

    it("prefers the instance's element over the definition's", () => {
        expect(search("element:arc")).toEqual(["Sunshot"]);
        expect(search("is:solar")).toEqual(["Fatebringer"]);
    });

    it("compares power and tier", () => {
        expect(search(">=545")).toEqual(["Fatebringer", "Iron Helm"]);
        expect(search("power:<545")).toEqual(["Sunshot"]);
        expect(search("tier:5 slot:energy")).toEqual(["Fatebringer"]);
    });

    it("compares armor stats, one or summed", () => {
        expect(search("stat:health>=30")).toEqual(["Iron Helm"]);
        expect(search("stat:resilience>30")).toEqual([]);
        expect(search("stat:total=70")).toEqual(["Iron Helm"]);
    });

    it("requires every filter to match", () => {
        expect(search("is:weapon is:locked >=550")).toEqual(["Fatebringer"]);
        expect(search("is:weapon is:crafted is:locked")).toEqual([]);
    });
});

describe("findDupes", () => {
    it("counts instanced items only", () => {
        const stack = { item: item({ itemHash: 5 }), definition: definition({ hash: 5 }) };
        const copy = { ...fatebringer, item: { ...fatebringer.item, itemInstanceId: "f2" } };
        expect(findDupes([fatebringer, copy, sunshot, stack, stack])).toEqual(new Set([1]));
    });
});
