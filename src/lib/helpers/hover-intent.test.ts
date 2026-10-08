import { describe, expect, it } from "vitest";
import { AIM_WINDOW, isAimingAt, recentMove } from "./hover-intent";

// A tooltip on the right of the pointer
const tooltip = { left: 300, top: 100, right: 700, bottom: 500 };

describe("isAimingAt", () => {
    it("is true when heading for the tooltip, even across other items", () => {
        expect(isAimingAt({ x: 100, y: 300 }, { x: 150, y: 320 }, tooltip)).toBe(true);
        expect(isAimingAt({ x: 100, y: 300 }, { x: 150, y: 260 }, tooltip)).toBe(true);
    });

    it("is false when moving away or along the tooltip", () => {
        expect(isAimingAt({ x: 100, y: 300 }, { x: 60, y: 300 }, tooltip)).toBe(false);
        expect(isAimingAt({ x: 100, y: 300 }, { x: 110, y: 380 }, tooltip)).toBe(false);
    });

    it("is false when the pointer barely moved", () => {
        expect(isAimingAt({ x: 100, y: 300 }, { x: 101, y: 300 }, tooltip)).toBe(false);
    });

    it("is true once inside the tooltip", () => {
        expect(isAimingAt({ x: 400, y: 300 }, { x: 400, y: 300 }, tooltip)).toBe(true);
    });

    it("handles a tooltip on the left", () => {
        expect(isAimingAt({ x: 900, y: 300 }, { x: 850, y: 300 }, tooltip)).toBe(true);
        expect(isAimingAt({ x: 900, y: 300 }, { x: 950, y: 300 }, tooltip)).toBe(false);
    });
});

describe("recentMove", () => {
    it("reads the heading over the aim window", () => {
        const trail = [
            { x: 0, y: 0, time: 0 },
            { x: 10, y: 0, time: 100 },
            { x: 20, y: 0, time: 150 },
            { x: 30, y: 0, time: 200 },
        ];
        expect(recentMove(trail, 200)).toEqual({ from: trail[1], to: trail[3] });
    });

    it("is undefined when the pointer has been still", () => {
        expect(recentMove([{ x: 0, y: 0, time: 0 }], AIM_WINDOW * 2)).toBeUndefined();
        expect(recentMove([], 0)).toBeUndefined();
    });
});
