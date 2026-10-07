import { describe, expect, it } from "vitest";
import { ARMOR_STATS } from "@/lib/constants";
import { components, definition, definitions } from "@/test/fixtures";
import { armorStatsWithPlugs, plugStatBonus, plugsStats, subclassPlugStats, sumStats } from "./stats";

const { MOBILITY, RESILIENCE, RECOVERY, DISCIPLINE } = ARMOR_STATS;
const TITAN = 0, HUNTER = 1;

const statMod = (hash: number, statTypeHash: number, value: number, isConditionallyActive = false) =>
    definition({ hash, investmentStats: [{ statTypeHash, value, isConditionallyActive }] });

describe("subclassPlugStats", () => {
    it("keeps conditional bonuses, which the game always applies to fragments", () => {
        const fragment = definition({ investmentStats: [{ statTypeHash: DISCIPLINE, value: 10, isConditionallyActive: true }] });
        expect(subclassPlugStats(fragment, TITAN)).toHaveLength(1);
    });

    it("only keeps the class ability penalty of the character's class", () => {
        const sparkOfFocus = definition({
            investmentStats: [
                { statTypeHash: RESILIENCE, value: -10, isConditionallyActive: true },
                { statTypeHash: MOBILITY, value: -10, isConditionallyActive: true },
                { statTypeHash: RECOVERY, value: -10, isConditionallyActive: true },
            ],
        });
        expect(subclassPlugStats(sparkOfFocus, HUNTER).map((stat) => stat.statTypeHash)).toEqual([MOBILITY]);
        expect(subclassPlugStats(sparkOfFocus, undefined)).toEqual([]);
    });

    it("ignores stats that aren't armor stats", () => {
        expect(subclassPlugStats(definition({ investmentStats: [{ statTypeHash: 1, value: 5 }] }), TITAN)).toEqual([]);
        expect(subclassPlugStats(undefined, TITAN)).toEqual([]);
    });
});

describe("plugStatBonus", () => {
    it("adds the unconditional bonuses of a plug for one stat", () => {
        const defs = definitions(definition({
            hash: 1,
            investmentStats: [
                { statTypeHash: MOBILITY, value: 10 },
                { statTypeHash: MOBILITY, value: 5, isConditionallyActive: true },
                { statTypeHash: RECOVERY, value: 3 },
            ],
        }));
        expect(plugStatBonus(1, MOBILITY, defs)).toBe(10);
        expect(plugStatBonus(undefined, MOBILITY, defs)).toBe(0);
    });
});

describe("armorStatsWithPlugs", () => {
    const defs = definitions(statMod(10, MOBILITY, 10), statMod(20, RECOVERY, 10));
    const itemComponents = components({
        stats: { a: { stats: { [MOBILITY]: { statHash: MOBILITY, value: 30 }, [RECOVERY]: { statHash: RECOVERY, value: 12 } } } },
        sockets: { a: { sockets: [{ plugHash: 10 }] } },
    });

    it("swaps the bonus of the plug in place for the new one", () => {
        const totals = armorStatsWithPlugs("a", { 0: 20 }, itemComponents, defs);
        expect(totals[MOBILITY]).toBe(20);
        expect(totals[RECOVERY]).toBe(22);
    });

    it("changes nothing when the plug is already in place", () => {
        const totals = armorStatsWithPlugs("a", { 0: 10 }, itemComponents, defs);
        expect(totals[MOBILITY]).toBe(30);
        expect(totals[RECOVERY]).toBe(12);
    });

    it("returns every armor stat, at 0 for an unknown item", () => {
        const totals = armorStatsWithPlugs("unknown", {}, itemComponents, defs);
        expect(Object.values(totals)).toEqual(Object.values(ARMOR_STATS).map(() => 0));
    });
});

describe("plugsStats and sumStats", () => {
    it("adds the plugs' stats then sums the parts", () => {
        const defs = definitions(statMod(1, DISCIPLINE, 10, true), statMod(2, DISCIPLINE, -10));
        const fromPlugs = plugsStats([1, 2, 1, undefined], defs, TITAN);
        expect(fromPlugs[DISCIPLINE]).toBe(10);
        expect(sumStats([fromPlugs, { [DISCIPLINE]: 5, [MOBILITY]: 2 }])[DISCIPLINE]).toBe(15);
    });
});
