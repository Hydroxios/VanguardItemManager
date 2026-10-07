import { describe, expect, it } from "vitest";
import { definition, definitions } from "@/test/fixtures";
import { countFragments, getFragmentCapacity, getSubclassSocketGroups, planSubclassChanges, SubclassSocketGroup } from "./subclass";

// Sockets: 0 super, 1-2 aspects, 3-6 fragments. Empty plugs: 900 (aspects), 901 (fragments).
const EMPTY_ASPECT = 900, EMPTY_FRAGMENT = 901;
const SUPER_A = 1, SUPER_B = 2;
const ASPECT_X = 10, ASPECT_Y = 11, ASPECT_Z = 12;
const FRAG_1 = 21, FRAG_2 = 22, FRAG_3 = 23, FRAG_4 = 24;

const entry = (singleInitialItemHash: number) => ({ socketTypeHash: 0, singleInitialItemHash });
const subclass = definition({
    sockets: {
        socketEntries: [entry(0), entry(EMPTY_ASPECT), entry(EMPTY_ASPECT), entry(EMPTY_FRAGMENT), entry(EMPTY_FRAGMENT), entry(EMPTY_FRAGMENT), entry(EMPTY_FRAGMENT)],
        socketCategories: [
            { socketCategoryHash: 100, socketIndexes: [0] },
            { socketCategoryHash: 200, socketIndexes: [1, 2] },
            { socketCategoryHash: 300, socketIndexes: [3, 4, 5, 6] },
        ],
    },
});
const aspect = (hash: number, capacityValue: number) =>
    definition({ hash, plug: { plugCategoryIdentifier: "hunter.arc.aspects", energyCapacity: { capacityValue } } });
const defs = definitions(
    definition({ hash: 0, plug: { plugCategoryIdentifier: "hunter.arc.supers" } }),
    definition({ hash: EMPTY_ASPECT, plug: { plugCategoryIdentifier: "hunter.arc.aspects" } }),
    definition({ hash: EMPTY_FRAGMENT, plug: { plugCategoryIdentifier: "shared.arc.fragments" } }),
    aspect(ASPECT_X, 2), aspect(ASPECT_Y, 3), aspect(ASPECT_Z, 1),
);
const groups: SubclassSocketGroup[] = getSubclassSocketGroups(subclass, defs, () => true);

/** Replays the insertions on the current plugs, the way the game would. */
const apply = (current: (number | undefined)[], steps: { socketIndex: number, plugHash: number }[]) => {
    const state = [...current];
    steps.forEach((step) => { state[step.socketIndex] = step.plugHash; });
    return state;
};

describe("getSubclassSocketGroups", () => {
    it("tells aspects and fragments from the other sockets", () => {
        expect(groups.map((group) => group.kind)).toEqual(["other", "aspects", "fragments"]);
    });

    it("drops the sockets that aren't shown, and the groups left empty", () => {
        expect(getSubclassSocketGroups(subclass, defs, (socketIndex) => socketIndex !== 0).map((group) => group.kind))
            .toEqual(["aspects", "fragments"]);
    });
});

describe("fragment capacity", () => {
    it("adds what the aspects open", () => {
        expect(getFragmentCapacity(groups, { 1: ASPECT_X, 2: ASPECT_Y }, defs)).toBe(5);
        expect(getFragmentCapacity(groups, { 1: ASPECT_X, 2: EMPTY_ASPECT }, defs)).toBe(2);
    });

    it("is unknown when no aspect says", () => {
        expect(getFragmentCapacity(groups, { 1: EMPTY_ASPECT, 2: EMPTY_ASPECT }, defs)).toBeUndefined();
    });

    it("counts the fragments that aren't empty", () => {
        expect(countFragments(groups, { 3: FRAG_1, 4: EMPTY_FRAGMENT, 5: FRAG_2 }, subclass)).toBe(2);
    });
});

describe("planSubclassChanges", () => {
    it("does nothing when the setup is already in place", () => {
        const current = [SUPER_A, ASPECT_X, ASPECT_Y, FRAG_1, FRAG_2, EMPTY_FRAGMENT, EMPTY_FRAGMENT];
        const desired = { 0: SUPER_A, 1: ASPECT_X, 2: ASPECT_Y, 3: FRAG_1, 4: FRAG_2 };
        expect(planSubclassChanges(subclass, groups, current, desired, 5)).toEqual([]);
    });

    it("treats aspects and fragments as sets, so swapping positions costs nothing", () => {
        const current = [SUPER_A, ASPECT_X, ASPECT_Y, FRAG_1, FRAG_2, EMPTY_FRAGMENT, EMPTY_FRAGMENT];
        const desired = { 0: SUPER_A, 1: ASPECT_Y, 2: ASPECT_X, 3: FRAG_2, 4: FRAG_1 };
        expect(planSubclassChanges(subclass, groups, current, desired, 5)).toEqual([]);
    });

    it("changes the super and abilities directly", () => {
        const current = [SUPER_A, ASPECT_X, ASPECT_Y, EMPTY_FRAGMENT, EMPTY_FRAGMENT, EMPTY_FRAGMENT, EMPTY_FRAGMENT];
        const desired = { 0: SUPER_B, 1: ASPECT_X, 2: ASPECT_Y };
        expect(planSubclassChanges(subclass, groups, current, desired, 5)).toEqual([{ socketIndex: 0, plugHash: SUPER_B }]);
    });

    it("takes out the fragments that no longer fit before switching to aspects that open fewer sockets", () => {
        // X+Y open 4 fragment sockets here; X+Z open 3, so the fragment in the 4th socket must leave first
        const current = [SUPER_A, ASPECT_X, ASPECT_Y, FRAG_1, FRAG_2, FRAG_3, FRAG_4];
        const desired = { 0: SUPER_A, 1: ASPECT_X, 2: ASPECT_Z, 3: FRAG_1, 4: FRAG_2, 5: FRAG_3 };
        const steps = planSubclassChanges(subclass, groups, current, desired, 3);

        const removal = steps.findIndex((step) => step.socketIndex === 6 && step.plugHash === EMPTY_FRAGMENT);
        const aspectChange = steps.findIndex((step) => step.socketIndex === 2 && step.plugHash === ASPECT_Z);
        expect(removal).toBeGreaterThanOrEqual(0);
        expect(removal).toBeLessThan(aspectChange);
        expect(apply(current, steps)).toEqual([SUPER_A, ASPECT_X, ASPECT_Z, FRAG_1, FRAG_2, FRAG_3, EMPTY_FRAGMENT]);
    });

    it("places new fragments only in the sockets the aspects open, after the aspects", () => {
        const current = [SUPER_A, EMPTY_ASPECT, EMPTY_ASPECT, EMPTY_FRAGMENT, EMPTY_FRAGMENT, EMPTY_FRAGMENT, EMPTY_FRAGMENT];
        const desired = { 0: SUPER_A, 1: ASPECT_X, 2: EMPTY_ASPECT, 3: FRAG_1, 4: FRAG_2, 5: FRAG_3 };
        const steps = planSubclassChanges(subclass, groups, current, desired, 2);

        expect(steps[0]).toEqual({ socketIndex: 1, plugHash: ASPECT_X });
        expect(apply(current, steps)).toEqual([SUPER_A, ASPECT_X, EMPTY_ASPECT, FRAG_1, FRAG_2, EMPTY_FRAGMENT, EMPTY_FRAGMENT]);
    });

    it("moves a kept fragment out of a socket that closes, into one that stays open", () => {
        const current = [SUPER_A, ASPECT_X, ASPECT_Y, EMPTY_FRAGMENT, EMPTY_FRAGMENT, EMPTY_FRAGMENT, FRAG_4];
        const desired = { 0: SUPER_A, 1: ASPECT_X, 2: EMPTY_ASPECT, 3: FRAG_4 };
        const steps = planSubclassChanges(subclass, groups, current, desired, 2);
        expect(apply(current, steps)).toEqual([SUPER_A, ASPECT_X, EMPTY_ASPECT, FRAG_4, EMPTY_FRAGMENT, EMPTY_FRAGMENT, EMPTY_FRAGMENT]);
        expect(steps.findIndex((step) => step.socketIndex === 6)).toBeLessThan(steps.findIndex((step) => step.socketIndex === 3));
    });
});
