import { describe, expect, it } from "vitest";
import { SOCKET_CATEGORIES } from "@/lib/constants";
import { MaterialRequirementSetDefinitions } from "@/lib/types";
import { components, definition, definitions, plug } from "@/test/fixtures";
import { getAvailablePlugs, getEnergyCapacity, getLockedPlugs, getModSockets, getPerkOptions, getPerkSockets, isFreePlug } from "./mods";

describe("getModSockets", () => {
    it("lists armor mod sockets and the weapon sockets that hold actual mods", () => {
        const defs = definitions(
            definition({ hash: 1, plug: { plugCategoryIdentifier: "v400.weapon.mod_empty" } }),
            definition({ hash: 2, plug: { plugCategoryIdentifier: "v400.plugs.weapons.masterworks" } }),
        );
        const weapon = definition({
            sockets: {
                socketEntries: [{ socketTypeHash: 0, singleInitialItemHash: 1 }, { socketTypeHash: 0, singleInitialItemHash: 2 }],
                socketCategories: [{ socketCategoryHash: SOCKET_CATEGORIES.WEAPON_MODS, socketIndexes: [0, 1] }],
            },
        });
        expect(getModSockets(weapon, defs)).toEqual([{ socketIndex: 0, categoryHash: SOCKET_CATEGORIES.WEAPON_MODS }]);

        const armor = definition({
            sockets: {
                socketEntries: [],
                socketCategories: [
                    { socketCategoryHash: 1, socketIndexes: [0] },
                    { socketCategoryHash: SOCKET_CATEGORIES.ARMOR_MODS, socketIndexes: [3, 4] },
                ],
            },
        });
        expect(getModSockets(armor, defs).map((socket) => socket.socketIndex)).toEqual([3, 4]);
        expect(getModSockets(undefined, defs)).toEqual([]);
    });
});

describe("getAvailablePlugs", () => {
    const def = definition({
        sockets: {
            socketEntries: [{ socketTypeHash: 0, singleInitialItemHash: 1, reusablePlugSetHash: 50, reusablePlugItems: [{ plugItemHash: 99 }] }],
            socketCategories: [],
        },
    });

    it("puts the empty plug first, then the unlocked plugs of the item, account and character", () => {
        const itemComponents = components({ reusablePlugs: { a: { plugs: { 0: [plug(2)] } } } });
        const plugSets = { profile: { 50: [plug(3), plug(4, { canInsert: false })] }, characters: { c1: { 50: [plug(5)] } } };
        expect(getAvailablePlugs(0, { definition: def, itemInstanceId: "a", characterId: "c1", itemComponents, plugSets }))
            .toEqual([1, 2, 3, 5]);
    });

    it("falls back to the definition's list when nothing is unlocked", () => {
        const plugSets = { profile: {}, characters: {} };
        expect(getAvailablePlugs(0, { definition: def, itemInstanceId: "a", characterId: "c1", itemComponents: components(), plugSets }))
            .toEqual([1, 99]);
    });

    it("keeps the plug in place even when it's no longer unlocked", () => {
        const itemComponents = components({ sockets: { a: { sockets: [{ plugHash: 77 }] } } });
        const plugSets = { profile: {}, characters: {} };
        expect(getAvailablePlugs(0, { definition: def, itemInstanceId: "a", characterId: "c1", itemComponents, plugSets })).toContain(77);
    });
});

describe("getLockedPlugs", () => {
    const def = definition({
        sockets: { socketEntries: [{ socketTypeHash: 0, singleInitialItemHash: 1, reusablePlugSetHash: 50 }], socketCategories: [] },
    });

    it("lists the plugs the plug sets hold but the player can't insert yet", () => {
        const plugSets = {
            profile: { 50: [plug(3), plug(4, { canInsert: false }), plug(6, { enabled: false })] },
            characters: { c1: { 50: [plug(4, { canInsert: false }), plug(5)] } },
        };
        const context = { definition: def, itemInstanceId: "a", characterId: "c1", itemComponents: components(), plugSets };
        const available = getAvailablePlugs(0, context);
        expect(getLockedPlugs(0, available, context)).toEqual([4, 6]);
    });

    it("is empty when nothing is listed", () => {
        const context = { definition: def, itemInstanceId: "a", characterId: "c1", itemComponents: components(), plugSets: { profile: {}, characters: {} } };
        expect(getLockedPlugs(0, [], context)).toEqual([]);
    });
});

describe("getEnergyCapacity", () => {
    it("prefers the instance's energy, then the plug that sets it", () => {
        const defs = definitions(definition({ hash: 5, plug: { plugCategoryIdentifier: "", energyCapacity: { capacityValue: 9 } } }));
        const fromInstance = components({ instances: { a: { energy: { energyCapacity: 10, energyUsed: 0, energyUnused: 10 } } as never } });
        const fromPlug = components({ sockets: { a: { sockets: [{ plugHash: 1 }, { plugHash: 5 }] } } });
        expect(getEnergyCapacity("a", fromInstance, defs)).toBe(10);
        expect(getEnergyCapacity("a", fromPlug, defs)).toBe(9);
        expect(getEnergyCapacity("a", components(), defs)).toBeUndefined();
    });
});

describe("isFreePlug", () => {
    const requirements: MaterialRequirementSetDefinitions = {
        1: { hash: 1, materials: [{ itemHash: 1, count: 0 }, { itemHash: 2, count: 5, omitFromRequirements: true }] },
        2: { hash: 2, materials: [{ itemHash: 1, count: 500 }] },
    };
    const withRequirement = (hash?: number) => definition({ plug: { plugCategoryIdentifier: "", insertionMaterialRequirementHash: hash } });

    it("is free without counted materials", () => {
        expect(isFreePlug(withRequirement(undefined), requirements)).toBe(true);
        expect(isFreePlug(withRequirement(1), requirements)).toBe(true);
        expect(isFreePlug(withRequirement(3), requirements)).toBe(true);
    });

    it("costs when a material is counted", () => {
        expect(isFreePlug(withRequirement(2), requirements)).toBe(false);
    });
});

describe("weapon perks", () => {
    const itemComponents = components({
        sockets: { a: { sockets: [{ plugHash: 1 }, { plugHash: 3 }, { plugHash: 5, isVisible: false }] } },
        reusablePlugs: { a: { plugs: { 0: [plug(1), plug(2)], 1: [plug(3)], 2: [plug(5), plug(6)] } } },
    });

    it("offers the roll's perks, current one included", () => {
        expect(getPerkOptions(0, "a", itemComponents)).toEqual([1, 2]);
        expect(getPerkOptions(1, "a", itemComponents)).toEqual([3]);
    });

    it("lists the visible perk sockets that offer a choice", () => {
        const weapon = definition({
            sockets: { socketEntries: [], socketCategories: [{ socketCategoryHash: SOCKET_CATEGORIES.WEAPON_PERKS, socketIndexes: [0, 1, 2] }] },
        });
        expect(getPerkSockets(weapon, "a", itemComponents)).toEqual([0]);
    });
});
