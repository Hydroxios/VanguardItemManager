import { describe, expect, it } from "vitest";
import { ARMOR_SLOTS, ARMOR_STATS, SOCKET_CATEGORIES, TIER_TYPES } from "@/lib/constants";
import { components, definition, definitions, item, plug } from "@/test/fixtures";
import { assignMods, baseArmorStats, collectArmor, findStatModPlug, OptimizerOptions, OptimizerPiece, optimizeArmor, pruneDominated } from "./armor-optimizer";

const [HELMET, ARMS, CHEST, LEGS, CLASS_ITEM] = ARMOR_SLOTS;
const { MOBILITY, RESILIENCE } = ARMOR_STATS;

let nextId = 1;
const piece = (slot: number, stats: number[], fields: Partial<OptimizerPiece> = {}): OptimizerPiece => {
    const id = String(nextId++);
    return { item: item({ itemInstanceId: id, itemHash: Number(id) }), ownerId: "vault", slot, stats, isExotic: false, ...fields };
};

const options = (fields: Partial<OptimizerOptions> = {}): OptimizerOptions => ({
    minimums: [0, 0, 0, 0, 0, 0],
    weights: [1, 1, 1, 1, 1, 1],
    exotic: "any",
    statMods: 0,
    ...fields,
});

const baseline = [0, 0, 0, 0, 0, 0];

/** One piece per slot with the same stats, so builds only differ by the pieces under test */
const filler = (stats = [5, 5, 5, 5, 5, 5]) => [HELMET, ARMS, CHEST, LEGS, CLASS_ITEM].map((slot) => piece(slot, stats));

describe("pruneDominated", () => {
    it("leaves out pieces another one beats on every stat", () => {
        const good = piece(HELMET, [10, 10, 0, 0, 0, 0]);
        const worse = piece(HELMET, [5, 10, 0, 0, 0, 0]);
        const different = piece(HELMET, [0, 0, 20, 0, 0, 0]);
        expect(pruneDominated([good, worse, different])).toEqual([good, different]);
    });

    it("keeps one of two identical pieces", () => {
        const a = piece(HELMET, [10, 0, 0, 0, 0, 0]);
        const b = piece(HELMET, [10, 0, 0, 0, 0, 0]);
        expect(pruneDominated([a, b])).toEqual([a]);
    });

    it("doesn't let a legendary piece push out an exotic, nor a piece outside the wanted set one inside", () => {
        const legendary = piece(HELMET, [20, 20, 0, 0, 0, 0]);
        const exotic = piece(HELMET, [10, 10, 0, 0, 0, 0], { isExotic: true });
        const setPiece = piece(HELMET, [10, 10, 0, 0, 0, 0], { setHash: 7 });
        expect(pruneDominated([legendary, exotic, setPiece], 7)).toEqual([legendary, exotic, setPiece]);
    });
});

describe("optimizeArmor", () => {
    it("picks the highest total first", () => {
        const [, arms, chest, legs, classItem] = filler();
        const best = piece(HELMET, [30, 0, 0, 0, 0, 0]);
        const other = piece(HELMET, [0, 20, 0, 0, 0, 0]);
        const { builds } = optimizeArmor([best, other, arms, chest, legs, classItem], baseline, options());
        expect(builds[0].pieces[0]).toBe(best);
        expect(builds[0].score).toBe(30 + 4 * 30);
        expect(builds).toHaveLength(2);
    });

    it("weighs the stats as asked, each capped at 200", () => {
        const [, arms, chest, legs, classItem] = filler([0, 0, 0, 0, 0, 0]);
        const mobility = piece(HELMET, [30, 0, 0, 0, 0, 0]);
        const resilience = piece(HELMET, [0, 20, 0, 0, 0, 0]);
        const { builds } = optimizeArmor([mobility, resilience, arms, chest, legs, classItem], [190, 0, 0, 0, 0, 0], options({ weights: [0, 1, 0, 0, 0, 0] }));
        expect(builds[0].pieces[0]).toBe(resilience);
        const all = optimizeArmor([mobility, resilience, arms, chest, legs, classItem], [190, 0, 0, 0, 0, 0], options());
        // Mobility tops out at 200: only 10 of its 30 count
        expect(all.builds[0].pieces[0]).toBe(resilience);
    });

    it("drops the builds under a minimum, and adds the mods that reach it", () => {
        const [, arms, chest, legs, classItem] = filler([0, 0, 0, 0, 0, 0]);
        const mobility = piece(HELMET, [30, 0, 0, 0, 0, 0]);
        const resilience = piece(HELMET, [0, 15, 0, 0, 0, 0]);
        const pieces = [mobility, resilience, arms, chest, legs, classItem];

        const withoutMods = optimizeArmor(pieces, baseline, options({ minimums: [0, 15, 0, 0, 0, 0] }));
        expect(withoutMods.builds.map((build) => build.pieces[0])).toEqual([resilience]);

        const withMods = optimizeArmor(pieces, baseline, options({ minimums: [0, 15, 0, 0, 0, 0], statMods: 2 }));
        expect(withMods.builds[0].pieces[0]).toBe(mobility);
        expect(withMods.builds[0].mods).toEqual([1, 1]);
        expect(withMods.builds[0].stats.slice(0, 2)).toEqual([30, 20]);
    });

    it("finds nothing when the minimums are out of reach", () => {
        expect(optimizeArmor(filler(), baseline, options({ minimums: [200, 0, 0, 0, 0, 0], statMods: 5 })).builds).toEqual([]);
    });

    it("never takes two exotics, and follows the exotic choice", () => {
        const [, , chest, legs, classItem] = filler([0, 0, 0, 0, 0, 0]);
        const exoticHelmet = piece(HELMET, [30, 0, 0, 0, 0, 0], { isExotic: true });
        const exoticArms = piece(ARMS, [30, 0, 0, 0, 0, 0], { isExotic: true });
        const helmet = piece(HELMET, [0, 0, 0, 0, 0, 0]);
        const arms = piece(ARMS, [0, 0, 0, 0, 0, 0]);
        const pieces = [exoticHelmet, exoticArms, helmet, arms, chest, legs, classItem];
        const exotics = (build: { pieces: OptimizerPiece[] }) => build.pieces.filter((p) => p.isExotic).length;

        const any = optimizeArmor(pieces, baseline, options());
        expect(any.builds.every((build) => exotics(build) <= 1)).toBe(true);
        expect(exotics(any.builds[0])).toBe(1);

        expect(optimizeArmor(pieces, baseline, options({ exotic: "none" })).builds.every((build) => exotics(build) === 0)).toBe(true);

        const chosen = optimizeArmor(pieces, baseline, options({ exotic: exoticArms.item.itemHash }));
        expect(chosen.builds.length).toBeGreaterThan(0);
        expect(chosen.builds.every((build) => build.pieces.includes(exoticArms))).toBe(true);
    });

    it("keeps the builds with enough pieces of the wanted set", () => {
        const [, , , legs, classItem] = filler([0, 0, 0, 0, 0, 0]);
        const helmet = piece(HELMET, [30, 0, 0, 0, 0, 0]);
        const setHelmet = piece(HELMET, [0, 0, 0, 0, 0, 0], { setHash: 7 });
        const setArms = piece(ARMS, [0, 0, 0, 0, 0, 0], { setHash: 7 });
        const chest = piece(CHEST, [0, 0, 0, 0, 0, 0]);
        const { builds } = optimizeArmor([helmet, setHelmet, setArms, chest, legs, classItem], baseline, options({ set: { hash: 7, count: 2 } }));
        expect(builds.map((build) => build.pieces.map((p) => p.item.itemInstanceId))).toEqual([
            [setHelmet, setArms, chest, legs, classItem].map((p) => p.item.itemInstanceId),
        ]);
    });

    it("needs a piece for every slot", () => {
        expect(optimizeArmor(filler().slice(1), baseline, options()).builds).toEqual([]);
    });

    it("goes through a large vault and keeps the best builds", () => {
        const random = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const next = random(42);
        const pieces = ARMOR_SLOTS.flatMap((slot) => Array.from({ length: 60 }, () =>
            piece(slot, Array.from({ length: 6 }, () => Math.floor(next() * 31)))));
        const { builds } = optimizeArmor(pieces, baseline, options({ minimums: [60, 60, 0, 0, 0, 0], statMods: 2 }));
        expect(builds.length).toBeGreaterThan(0);
        expect(builds.length).toBeLessThanOrEqual(50);
        builds.forEach((build, index) => {
            expect(build.stats[0]).toBeGreaterThanOrEqual(60);
            expect(build.stats[1]).toBeGreaterThanOrEqual(60);
            if (index > 0) expect(build.score).toBeLessThanOrEqual(builds[index - 1].score);
        });
    });
});

describe("assignMods", () => {
    it("puts the mods on the pieces with the most free energy", () => {
        const pieces = filler();
        const build = { pieces, stats: [], mods: [1, 0], score: 0 };
        const energy = new Map(pieces.map((p, index) => [p, index]));
        const assigned = assignMods(build, (p) => energy.get(p) ?? 0);
        expect([...assigned.entries()]).toEqual([[pieces[4].item.itemInstanceId, 1], [pieces[3].item.itemInstanceId, 0]]);
    });
});

const MOD_SOCKETS = { socketCategories: [{ socketCategoryHash: SOCKET_CATEGORIES.ARMOR_MODS, socketIndexes: [0, 1] }], socketEntries: [{ socketTypeHash: 0, singleInitialItemHash: 1 }, { socketTypeHash: 0, singleInitialItemHash: 1 }] };
const empty = definition({ hash: 1 });
const mobilityMod = definition({ hash: 10, investmentStats: [{ statTypeHash: MOBILITY, value: 10 }], plug: { plugCategoryIdentifier: "", energyCost: { energyCost: 3 } } });
const cheapMobilityMod = definition({ hash: 11, investmentStats: [{ statTypeHash: MOBILITY, value: 10 }], plug: { plugCategoryIdentifier: "", energyCost: { energyCost: 1 } } });
const minorResilienceMod = definition({ hash: 12, investmentStats: [{ statTypeHash: RESILIENCE, value: 5 }], plug: { plugCategoryIdentifier: "", energyCost: { energyCost: 1 } } });
const utilityMod = definition({ hash: 13, plug: { plugCategoryIdentifier: "", energyCost: { energyCost: 4 } } });
const helmetDef = definition({ hash: 500, sockets: MOD_SOCKETS, inventory: { bucketTypeHash: 1, maxStackSize: 1, tierType: TIER_TYPES.LEGENDARY }, equippingBlock: { equipmentSlotTypeHash: HELMET, ammoType: 0 }, classType: 1 });
const defs = definitions(empty, mobilityMod, cheapMobilityMod, minorResilienceMod, utilityMod, helmetDef);

describe("baseArmorStats", () => {
    it("takes the stat mods out of the instance stats", () => {
        const comps = components({
            stats: { a: { stats: { [MOBILITY]: { statHash: MOBILITY, value: 40 }, [RESILIENCE]: { statHash: RESILIENCE, value: 25 } } } },
            sockets: { a: { sockets: [{ plugHash: 10 }, { plugHash: 12 }] } },
        });
        expect(baseArmorStats("a", helmetDef, comps, defs).slice(0, 2)).toEqual([30, 20]);
    });
});

describe("collectArmor", () => {
    it("keeps the armor of the character's class", () => {
        const comps = components({ stats: { a: { stats: {} }, b: { stats: {} } } });
        const gear = [
            { item: item({ itemHash: 500, itemInstanceId: "a" }), ownerId: "vault" },
            { item: item({ itemHash: 500, itemInstanceId: "b" }), ownerId: "vault" },
        ];
        expect(collectArmor(gear, 1, defs, comps)).toHaveLength(2);
        expect(collectArmor(gear, 0, defs, comps)).toHaveLength(0);
    });
});

describe("findStatModPlug", () => {
    const context = (sockets: { plugHash?: number }[], energyCapacity = 10) => ({
        definition: helmetDef,
        itemInstanceId: "a",
        characterId: "c",
        itemDefinitions: defs,
        plugSets: { profile: {}, characters: {} },
        itemComponents: components({
            instances: { a: { energy: { energyCapacity, energyUsed: 0, energyUnused: 0 } } as never },
            sockets: { a: { sockets } },
            reusablePlugs: { a: { plugs: { 0: [plug(10), plug(11), plug(12)], 1: [plug(10), plug(11), plug(12)] } } },
        }),
    });

    it("takes the cheapest +10 mod of the stat in a free socket", () => {
        expect(findStatModPlug(0, context([{ plugHash: 1 }, { plugHash: 1 }]))).toEqual({ socketIndex: 0, plugHash: 11 });
    });

    it("leaves the other mods in place and replaces a stat mod", () => {
        expect(findStatModPlug(0, context([{ plugHash: 13 }, { plugHash: 12 }]))).toEqual({ socketIndex: 1, plugHash: 11 });
    });

    it("gives up without a fitting mod or the energy for it", () => {
        expect(findStatModPlug(1, context([{ plugHash: 1 }, { plugHash: 1 }]))).toBeUndefined();
        expect(findStatModPlug(0, context([{ plugHash: 13 }, { plugHash: 1 }], 4))).toBeUndefined();
    });
});
