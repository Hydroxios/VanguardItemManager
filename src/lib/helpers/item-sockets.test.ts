import { describe, expect, it } from "vitest";
import { ITEM_TYPES, MATERIAL_CATEGORY, SOCKET_CATEGORIES, TIER_TYPES } from "@/lib/constants";
import { ItemDefinition } from "@/lib/types";
import { components, definition, definitions, plug } from "@/test/fixtures";
import { getArmorSockets, getItemKind, getWeaponSockets, isEnhancedPerk } from "./item-sockets";

const plugDef = (hash: number, plugCategoryIdentifier: string, fields: Partial<ItemDefinition> = {}) => definition({
    hash,
    displayProperties: { name: `Plug ${hash}`, description: `Does ${hash}`, icon: `/${hash}.png`, hasIcon: true },
    plug: { plugCategoryIdentifier },
    ...fields,
});

describe("getItemKind", () => {
    it("tells weapons, armor, subclasses and materials apart", () => {
        expect(getItemKind(definition({ itemType: ITEM_TYPES.WEAPON }))).toBe("weapon");
        expect(getItemKind(definition({ itemType: ITEM_TYPES.ARMOR }))).toBe("armor");
        expect(getItemKind(definition({ itemType: ITEM_TYPES.SUBCLASS }))).toBe("subclass");
        expect(getItemKind(definition({ itemType: 0, itemCategoryHashes: [MATERIAL_CATEGORY] }))).toBe("material");
    });

    it("doesn't need item categories", () => {
        expect(getItemKind(definition({ itemType: 8 }))).toBe("generic");
    });
});

describe("getWeaponSockets", () => {
    const defs = definitions(
        plugDef(1, "intrinsics"),
        plugDef(2, "barrels"),
        plugDef(3, "frames"),
        plugDef(4, "frames", { inventory: { tierType: TIER_TYPES.COMMON, maxStackSize: 1, bucketTypeHash: 0 } }),
        plugDef(5, "origins"),
        plugDef(6, "v400.plugs.weapons.masterworks.stat.range"),
        plugDef(7, "v400.weapon.mod_guns"),
        plugDef(8, "v400.plugs.weapons.masterworks.trackers"),
        plugDef(9, "crafting.plugs.weapons.mods.memories"),
    );
    const weapon = definition({
        sockets: {
            socketEntries: [],
            socketCategories: [
                { socketCategoryHash: SOCKET_CATEGORIES.WEAPON_INTRINSIC, socketIndexes: [0] },
                { socketCategoryHash: SOCKET_CATEGORIES.WEAPON_PERKS, socketIndexes: [1, 2, 3, 4] },
                { socketCategoryHash: SOCKET_CATEGORIES.WEAPON_MODS, socketIndexes: [5, 6, 7, 8] },
            ],
        },
    });
    const itemComponents = components({
        sockets: {
            w: {
                sockets: [
                    { plugHash: 1 }, { plugHash: 2 }, { plugHash: 3 }, { plugHash: 5 }, { plugHash: 8 },
                    { plugHash: 6 }, { plugHash: 7 }, { plugHash: 8 }, { plugHash: 9 },
                ],
            },
        },
        reusablePlugs: { w: { plugs: { 2: [plug(4), plug(3)] } } },
    });

    it("reads each socket by its category, whatever the perks component says", () => {
        const sockets = getWeaponSockets(weapon, "w", itemComponents, defs);
        expect(sockets.intrinsic?.hash).toBe(1);
        expect(sockets.columns.map((column) => column.current.hash)).toEqual([2, 3, 5]);
        expect(sockets.columns.map((column) => column.origin)).toEqual([false, false, true]);
        expect(sockets.masterwork?.hash).toBe(6);
        expect(sockets.mods.map((mod) => mod.hash)).toEqual([7]);
    });

    it("lists the perks a column can switch to in the roll's order", () => {
        const { columns } = getWeaponSockets(weapon, "w", itemComponents, defs);
        expect(columns[1].options.map((option) => option.hash)).toEqual([4, 3]);
        expect(columns[0].options.map((option) => option.hash)).toEqual([2]);
    });

    it("leaves out hidden sockets", () => {
        const hidden = components({ sockets: { w: { sockets: [{ plugHash: 1, isVisible: false }] } } });
        expect(getWeaponSockets(weapon, "w", hidden, defs).intrinsic).toBeUndefined();
    });

    it("spots enhanced perks", () => {
        expect(isEnhancedPerk(defs[4])).toBe(true);
        expect(isEnhancedPerk(defs[3])).toBe(false);
    });
});

describe("getArmorSockets", () => {
    it("keeps the perks worth showing, the mods and the masterwork plug", () => {
        const defs = definitions(
            plugDef(1, "intrinsics"),
            plugDef(2, "intrinsics", { displayProperties: { name: "Empty", description: "", icon: "/e.png", hasIcon: true }, perks: [] }),
            plugDef(3, "enhancements.v2_general"),
            plugDef(4, "v460.plugs.armor.masterworks"),
        );
        const armor = definition({
            sockets: {
                socketEntries: [],
                socketCategories: [
                    { socketCategoryHash: SOCKET_CATEGORIES.ARMOR_PERKS, socketIndexes: [0, 1] },
                    { socketCategoryHash: SOCKET_CATEGORIES.ARMOR_MODS, socketIndexes: [2] },
                    { socketCategoryHash: SOCKET_CATEGORIES.ARMOR_TIER, socketIndexes: [3] },
                ],
            },
        });
        const itemComponents = components({ sockets: { a: { sockets: [{ plugHash: 1 }, { plugHash: 2 }, { plugHash: 3 }, { plugHash: 4 }] } } });

        const sockets = getArmorSockets(armor, "a", itemComponents, defs);
        expect(sockets.perks.map((perk) => perk.hash)).toEqual([1]);
        expect(sockets.mods.map((mod) => mod.hash)).toEqual([3]);
        expect(sockets.masterwork?.hash).toBe(4);
    });
});
