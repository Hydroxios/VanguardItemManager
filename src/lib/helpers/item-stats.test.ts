import { describe, expect, it } from "vitest";
import { ARMOR_STATS, WEAPON_STATS } from "@/lib/constants";
import { StatGroupDefinitions } from "@/lib/types";
import { components, definition, definitions } from "@/test/fixtures";
import { ARMOR_STAT_BAR_MAX, getArmorStatRows, getWeaponStatRows, interpolateStat, recoilDirection } from "./item-stats";

const linear = [{ value: 0, weight: 0 }, { value: 100, weight: 100 }];

describe("interpolateStat", () => {
    it("follows the curve between its points", () => {
        expect(interpolateStat(50, [{ value: 0, weight: 10 }, { value: 100, weight: 30 }])).toBe(20);
    });

    it("rounds halves to even", () => {
        expect(interpolateStat(25, [{ value: 0, weight: 0 }, { value: 100, weight: 10 }])).toBe(2);
        expect(interpolateStat(35, [{ value: 0, weight: 0 }, { value: 100, weight: 10 }])).toBe(4);
    });

    it("stays within the curve", () => {
        expect(interpolateStat(-5, [{ value: 0, weight: 3 }, { value: 100, weight: 30 }])).toBe(3);
        expect(interpolateStat(150, [{ value: 0, weight: 3 }, { value: 100, weight: 30 }])).toBe(30);
    });
});

describe("recoilDirection", () => {
    it("goes straight up at 100 and strays more as the value drops", () => {
        expect(recoilDirection(100).angle).toBeCloseTo(0);
        expect(recoilDirection(100).spread).toBe(0);
        expect(recoilDirection(40).spread).toBeGreaterThan(recoilDirection(80).spread);
    });
});

describe("getWeaponStatRows", () => {
    const statGroupDefinitions: StatGroupDefinitions = {
        10: {
            hash: 10,
            maximumValue: 100,
            scaledStats: [
                { statHash: WEAPON_STATS.RANGE, maximumValue: 100, displayAsNumeric: false, displayInterpolation: linear },
                { statHash: WEAPON_STATS.AIM_ASSISTANCE, maximumValue: 100, displayAsNumeric: false, displayInterpolation: linear },
                { statHash: WEAPON_STATS.ROUNDS_PER_MINUTE, maximumValue: 1000, displayAsNumeric: true, displayInterpolation: linear },
                { statHash: WEAPON_STATS.RECOIL_DIRECTION, maximumValue: 100, displayAsNumeric: true, displayInterpolation: linear },
                { statHash: WEAPON_STATS.ZOOM, maximumValue: 100, displayAsNumeric: false, displayInterpolation: linear },
            ],
        },
    };
    const itemDefinitions = definitions(
        definition({ hash: 1, investmentStats: [{ statTypeHash: WEAPON_STATS.AIM_ASSISTANCE, value: 20 }] }),
        definition({ hash: 2, investmentStats: [{ statTypeHash: WEAPON_STATS.RANGE, value: 10 }] }),
        definition({ hash: 3, investmentStats: [{ statTypeHash: WEAPON_STATS.RANGE, value: 5 }] }),
    );
    const weapon = definition({
        stats: { statGroupHash: 10, stats: {} },
        investmentStats: [{ statTypeHash: WEAPON_STATS.AIM_ASSISTANCE, value: 50 }],
    });
    const itemComponents = components({
        stats: {
            w: {
                stats: {
                    [WEAPON_STATS.RANGE]: { statHash: WEAPON_STATS.RANGE, value: 60 },
                    [WEAPON_STATS.ROUNDS_PER_MINUTE]: { statHash: WEAPON_STATS.ROUNDS_PER_MINUTE, value: 450 },
                    [WEAPON_STATS.RECOIL_DIRECTION]: { statHash: WEAPON_STATS.RECOIL_DIRECTION, value: 75 },
                },
            },
        },
        sockets: { w: { sockets: [{ plugHash: 1 }, { plugHash: 2 }, { plugHash: 3 }] } },
    });
    const context = {
        definition: weapon,
        itemInstanceId: "w",
        itemComponents,
        itemDefinitions,
        statGroupDefinitions,
        masterwork: itemDefinitions[2],
        mods: [itemDefinitions[3]],
    };

    it("lists stats in the stat group's order and fills in hidden ones from investments", () => {
        const rows = getWeaponStatRows(context);
        expect(rows.map((row) => [row.statHash, row.value])).toEqual([
            [WEAPON_STATS.RANGE, 60],
            [WEAPON_STATS.AIM_ASSISTANCE, 70],
            [WEAPON_STATS.ROUNDS_PER_MINUTE, 450],
            [WEAPON_STATS.RECOIL_DIRECTION, 75],
        ]);
    });

    it("picks how each stat is drawn", () => {
        const rows = getWeaponStatRows(context);
        expect(rows.map((row) => row.display)).toEqual(["bar", "bar", "number", "recoil"]);
    });

    it("splits out what the masterwork and the mods add", () => {
        const range = getWeaponStatRows(context)[0];
        expect(range.masterwork).toBe(10);
        expect(range.mods).toBe(5);
    });

    it("compares with another item's stats", () => {
        const rows = getWeaponStatRows({
            ...context,
            compareStats: { [WEAPON_STATS.RANGE]: { statHash: WEAPON_STATS.RANGE, value: 70 } },
        });
        expect(rows[0].compare).toBe(-10);
        expect(rows[1].compare).toBeUndefined();
    });

    it("scales charge time on milliseconds, not by its name", () => {
        const rows = getWeaponStatRows({
            ...context,
            definition: definition({}),
            itemComponents: components({ stats: { w: { stats: { [WEAPON_STATS.CHARGE_TIME]: { statHash: WEAPON_STATS.CHARGE_TIME, value: 733 } } } } }),
        });
        expect(rows).toEqual([expect.objectContaining({ statHash: WEAPON_STATS.CHARGE_TIME, max: 1000, display: "bar" })]);
    });
});

describe("getArmorStatRows", () => {
    it("lists the armor stats the piece has, on the armor scale", () => {
        const rows = getArmorStatRows({
            definition: definition({}),
            itemInstanceId: "a",
            itemComponents: components({
                stats: {
                    a: {
                        stats: {
                            [ARMOR_STATS.RECOVERY]: { statHash: ARMOR_STATS.RECOVERY, value: 20 },
                            [ARMOR_STATS.MOBILITY]: { statHash: ARMOR_STATS.MOBILITY, value: 30 },
                        },
                    },
                },
            }),
            itemDefinitions: {},
            statGroupDefinitions: {},
            mods: [],
        });
        expect(rows.map((row) => row.statHash)).toEqual([ARMOR_STATS.MOBILITY, ARMOR_STATS.RECOVERY]);
        expect(rows.every((row) => row.max === ARMOR_STAT_BAR_MAX)).toBe(true);
    });
});
