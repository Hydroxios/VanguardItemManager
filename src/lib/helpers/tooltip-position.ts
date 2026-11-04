/** A screen rectangle, as `getBoundingClientRect` gives it */
export interface Anchor {
    left: number
    top: number
    right: number
    bottom: number
}

interface Size {
    width: number
    height: number
}

/** Space kept between the tooltip and the viewport edges */
export const VIEWPORT_MARGIN = 10;
/** Space kept between the tooltip and the element it describes */
export const ANCHOR_GAP = 8;

/**
 * Where to put a tooltip next to the element it describes: on its right when it fits, else on its left, else on the
 * side with the most room. It never covers the element unless the viewport is too narrow for either side, and it stays
 * in the viewport, aligned with the element's top when it can.
 */
export const placeTooltip = (anchor: Anchor, size: Size, viewport: Size): { left: number, top: number } => {
    const roomRight = viewport.width - VIEWPORT_MARGIN - (anchor.right + ANCHOR_GAP);
    const roomLeft = anchor.left - ANCHOR_GAP - VIEWPORT_MARGIN;

    let left: number;
    if (size.width <= roomRight) left = anchor.right + ANCHOR_GAP;
    else if (size.width <= roomLeft) left = anchor.left - ANCHOR_GAP - size.width;
    else left = roomRight >= roomLeft ? anchor.right + ANCHOR_GAP : anchor.left - ANCHOR_GAP - size.width;

    const clamp = (value: number, max: number) => Math.max(VIEWPORT_MARGIN, Math.min(value, max));
    return {
        left: clamp(left, viewport.width - VIEWPORT_MARGIN - size.width),
        top: clamp(anchor.top, viewport.height - VIEWPORT_MARGIN - size.height),
    };
};
