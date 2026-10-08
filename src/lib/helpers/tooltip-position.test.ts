import { describe, expect, it } from "vitest";
import { ANCHOR_GAP, placeTooltip, VIEWPORT_MARGIN } from "./tooltip-position";

const viewport = { width: 1200, height: 800 };
const size = { width: 400, height: 300 };

describe("placeTooltip", () => {
    it("goes on the right of the element when it fits", () => {
        expect(placeTooltip({ left: 100, top: 200, right: 164, bottom: 264 }, size, viewport))
            .toEqual({ left: 164 + ANCHOR_GAP, top: 200 });
    });

    it("goes on the left when the right is too narrow, without covering the element", () => {
        const anchor = { left: 900, top: 200, right: 964, bottom: 264 };
        const { left } = placeTooltip(anchor, size, viewport);
        expect(left + size.width).toBeLessThanOrEqual(anchor.left);
    });

    it("stays in the viewport vertically", () => {
        expect(placeTooltip({ left: 100, top: 700, right: 164, bottom: 764 }, size, viewport).top)
            .toBe(viewport.height - VIEWPORT_MARGIN - size.height);
        expect(placeTooltip({ left: 100, top: -50, right: 164, bottom: 14 }, size, viewport).top).toBe(VIEWPORT_MARGIN);
    });

    it("picks the roomier side and clamps when neither side fits", () => {
        const narrow = { width: 600, height: 800 };
        const { left } = placeTooltip({ left: 150, top: 0, right: 214, bottom: 64 }, size, narrow);
        expect(left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
        expect(left + size.width).toBeLessThanOrEqual(narrow.width - VIEWPORT_MARGIN);
    });
});
