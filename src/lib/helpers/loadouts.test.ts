import { describe, expect, it } from "vitest";
import { ARMOR_STATS, EQUIPMENT_SLOTS, UNSET_PLUG_HASH } from "@/lib/constants";
import { components, definition, definitions, item } from "@/test/fixtures";
import { loadoutEquipChanges } from "./loadouts";

const { MOBILITY, DISCIPLINE } = ARMOR_STATS;

const statMod = (hash: number, statTypeHash: number, value: number) =>
    definition({ hash, investmentStats: [{ statTypeHash, value, isConditionallyActive: false }] });
const armorDef = (hash: number, slot: number) => definition({ hash, inventory: { bucketTypeHash: slot } } as never);
const stats = (values: Record<number, number>) =>
    ({ stats: Object.fromEntries(Object.entries(values).map(([statHash, value]) => [statHash, { statHash: Number(statHash), value }])) });

const defs = definitions(
    armorDef(10, EQUIPMENT_SLOTS.HELMET),
    armorDef(11, EQUIPMENT_SLOTS.HELMET),
    statMod(1, MOBILITY, 10),
    statMod(2, DISCIPLINE, 10),
);

describe("loadoutEquipChanges", () => {
    it("puts the loadout's mods in its items and updates their stats", () => {
        const helmet = item({ itemHash: 10, itemInstanceId: "h" });
        const { components: changed, statDelta } = loadoutEquipChanges({
            loadoutItems: [{ itemInstanceId: "h", plugItemHashes: [2, UNSET_PLUG_HASH] }],
            equipped: [helmet],
            itemsById: new Map([["h", helmet]]),
            itemComponents: components({
                sockets: { h: { sockets: [{ plugHash: 1 }, { plugHash: 1 }] } },
                stats: { h: stats({ [MOBILITY]: 30, [DISCIPLINE]: 20 }) },
            }),
            itemDefinitions: defs,
            classType: 0,
        });
        // The unset socket keeps its plug
        expect(changed.h.sockets?.sockets.map((socket) => socket.plugHash)).toEqual([2, 1]);
        expect(changed.h.stats?.stats[MOBILITY].value).toBe(20);
        expect(changed.h.stats?.stats[DISCIPLINE].value).toBe(30);
        expect(statDelta[MOBILITY]).toBe(-10);
        expect(statDelta[DISCIPLINE]).toBe(10);
    });

    it("replaces the armor of the slot in the character's stats", () => {
        const worn = item({ itemHash: 10, itemInstanceId: "a" });
        const incoming = item({ itemHash: 11, itemInstanceId: "b" });
        const { components: changed, statDelta } = loadoutEquipChanges({
            loadoutItems: [{ itemInstanceId: "b" }],
            equipped: [worn],
            itemsById: new Map([["a", worn], ["b", incoming]]),
            itemComponents: components({
                stats: { a: stats({ [MOBILITY]: 30 }), b: stats({ [MOBILITY]: 12 }) },
            }),
            itemDefinitions: defs,
            classType: 0,
        });
        expect(changed).toEqual({});
        expect(statDelta[MOBILITY]).toBe(-18);
    });
});
