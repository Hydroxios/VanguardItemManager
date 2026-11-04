import { Anchor } from "./tooltip-position";

export interface Point {
    x: number
    y: number
}

/** A pointer position and when it was there, from `performance.now()` */
export interface PointerSample extends Point {
    time: number
}

/** Slack around the tooltip's near side, so a pointer grazing its corner still counts as heading for it */
export const AIM_SLACK = 24;

/** How far back the pointer's heading is read: long enough to ignore jitter, short enough to follow turns */
export const AIM_WINDOW = 120;

/** Below this distance over the aim window, the pointer is resting rather than heading anywhere */
export const AIM_MIN_DISTANCE = 4;

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const inTriangle = (p: Point, a: Point, b: Point, c: Point) => {
    const d1 = cross(a, b, p);
    const d2 = cross(b, c, p);
    const d3 = cross(c, a, p);
    const negative = d1 < 0 || d2 < 0 || d3 < 0;
    const positive = d1 > 0 || d2 > 0 || d3 > 0;
    return !(negative && positive);
};

/**
 * Whether a pointer that went from `from` to `to` is heading for `rect`: `to` lies in the triangle between `from` and
 * the side of `rect` that faces it. This is what lets the pointer cross other items on its way to a tooltip.
 */
export const isAimingAt = (from: Point, to: Point, rect: Anchor): boolean => {
    if (to.x >= rect.left && to.x <= rect.right && to.y >= rect.top && to.y <= rect.bottom) return true;
    if (Math.hypot(to.x - from.x, to.y - from.y) < AIM_MIN_DISTANCE) return false;

    const top = rect.top - AIM_SLACK;
    const bottom = rect.bottom + AIM_SLACK;
    const left = rect.left - AIM_SLACK;
    const right = rect.right + AIM_SLACK;
    // The side facing the pointer's starting point
    const [c1, c2]: [Point, Point] =
        from.x <= rect.left ? [{ x: rect.left, y: top }, { x: rect.left, y: bottom }]
            : from.x >= rect.right ? [{ x: rect.right, y: top }, { x: rect.right, y: bottom }]
                : from.y <= rect.top ? [{ x: left, y: rect.top }, { x: right, y: rect.top }]
                    : [{ x: left, y: rect.bottom }, { x: right, y: rect.bottom }];
    return inTriangle(to, from, c1, c2);
};

/** The pointer's heading over the last `AIM_WINDOW` ms of `trail` (oldest first), or undefined without enough samples */
export const recentMove = (trail: PointerSample[], now: number): { from: Point, to: Point } | undefined => {
    const to = trail[trail.length - 1];
    if (!to || now - to.time > AIM_WINDOW) return undefined;
    const from = trail.find((sample) => to.time - sample.time <= AIM_WINDOW) ?? to;
    return from === to ? undefined : { from, to };
};
