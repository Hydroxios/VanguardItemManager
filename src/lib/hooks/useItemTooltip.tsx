"use client";

import { useState, createContext, useContext, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { ItemDefinition } from "@/lib/types";
import { Anchor } from "@/lib/helpers/tooltip-position";
import { isAimingAt, PointerSample, recentMove } from "@/lib/helpers/hover-intent";

export interface ShowTooltipProps {
  item: ItemDefinition | undefined;
  itemInstanceId: string | undefined;
  /** Where the item is shown, "" when nowhere in particular */
  characterId: string;
  state: number;
  drawTransfert: boolean;
  /** The element the tooltip describes; the tooltip goes next to it */
  anchor: Anchor;
  /** The element itself, followed while the tooltip is open (scrolling, resizing); `anchor` is used once it's gone */
  anchorElement?: Element | null;
  /** A pinned tooltip stays open until closed (Escape, a click elsewhere, its close button) */
  pinned?: boolean;
}

interface TooltipState extends Required<ShowTooltipProps> {
  open: boolean;
}

interface TooltipActions {
  /** Opens the tooltip. Hovering never replaces a pinned tooltip; a click does. */
  showTooltip: (props: ShowTooltipProps) => void;
  /** Pins the tooltip on this item, or closes it when it's already pinned there */
  togglePinnedTooltip: (props: Omit<ShowTooltipProps, "pinned">) => void;
  /** Closes the tooltip, unless the "keep tooltip open" setting is on */
  hideTooltip: () => void;
  /** Closes the tooltip whatever the settings */
  closeTooltip: () => void;
  /** Closes an unpinned tooltip shortly, so the pointer can travel from the item to the tooltip */
  scheduleHide: () => void;
  cancelHide: () => void;
  /** Tells the provider which element is the open tooltip, to know when the pointer heads for it */
  registerTooltipElement: (element: HTMLElement | null) => void;
  /** Whether the pointer is on its way to the open tooltip */
  isAimingAtTooltip: () => boolean;
}

interface TooltipContextType extends TooltipActions {
  tooltipState: TooltipState;
  keepOpen: boolean;
  setKeepOpen: (keepOpen: boolean) => void;
}

/** How long the pointer can be off both the item and the tooltip before an unpinned tooltip closes */
const HIDE_DELAY = 150;
/** How long an unpinned tooltip stays open past `HIDE_DELAY` while the pointer keeps heading for it */
const MAX_AIM_DELAY = 700;
/** How often the pointer's heading is checked while it travels to the tooltip */
const AIM_CHECK_INTERVAL = 50;
/** Pointer positions older than this are of no use to read where it's heading */
const TRAIL_DURATION = 300;

const initialState: TooltipState = {
  item: undefined,
  itemInstanceId: undefined,
  anchor: { left: 0, top: 0, right: 0, bottom: 0 },
  anchorElement: null,
  open: false,
  pinned: false,
  characterId: "",
  state: 0,
  drawTransfert: true
};

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

// Separate context with stable callbacks only: its consumers don't re-render when the tooltip opens or moves
const TooltipActionsContext = createContext<TooltipActions | undefined>(undefined);

export const ItemTooltipProvider = ({ children }: { children: ReactNode }) => {
  const [tooltipState, setTooltipState] = useState<TooltipState>(initialState);
  const [keepOpen, setKeepOpen] = useState(false);

  const keepOpenRef = useRef(keepOpen);
  useEffect(() => { keepOpenRef.current = keepOpen; }, [keepOpen]);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = undefined;
  }, []);

  // Stable callbacks and a memoized value, so consumers (and memoized items) only
  // re-render when the tooltip state they read actually changes
  const showTooltip = useCallback(({ pinned = false, ...props }: ShowTooltipProps) => {
    cancelHide();
    setTooltipState(prev => (prev.open && prev.pinned && !pinned) ? prev : { ...props, anchorElement: props.anchorElement ?? null, pinned, open: true });
  }, [cancelHide]);

  const togglePinnedTooltip = useCallback((props: Omit<ShowTooltipProps, "pinned">) => {
    cancelHide();
    setTooltipState(prev => {
      const samePinned = prev.open && prev.pinned && prev.item?.hash === props.item?.hash && prev.itemInstanceId === props.itemInstanceId;
      return samePinned ? { ...prev, open: false } : { ...props, anchorElement: props.anchorElement ?? null, pinned: true, open: true };
    });
  }, [cancelHide]);

  const closeTooltip = useCallback(() => {
    cancelHide();
    setTooltipState(prev => prev.open ? { ...prev, open: false } : prev);
  }, [cancelHide]);

  const hideTooltip = useCallback(() => {
    if (!keepOpenRef.current) closeTooltip();
  }, [closeTooltip]);

  // Where the mouse has been lately, to tell where it's heading
  const trailRef = useRef<PointerSample[]>([]);
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const time = performance.now();
      const trail = trailRef.current.filter((sample) => time - sample.time <= TRAIL_DURATION);
      trail.push({ x: e.clientX, y: e.clientY, time });
      trailRef.current = trail;
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => document.removeEventListener("pointermove", onPointerMove);
  }, []);

  const tooltipElementRef = useRef<HTMLElement | null>(null);
  const registerTooltipElement = useCallback((element: HTMLElement | null) => { tooltipElementRef.current = element; }, []);

  const isAimingAtTooltip = useCallback(() => {
    const element = tooltipElementRef.current;
    const move = element && recentMove(trailRef.current, performance.now());
    return !!move && isAimingAt(move.from, move.to, element.getBoundingClientRect());
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    if (keepOpenRef.current) return;
    const leftAt = performance.now();
    // The tooltip stays while the pointer is on its way to it, even across other items
    const check = () => {
      if (isAimingAtTooltip() && performance.now() - leftAt < HIDE_DELAY + MAX_AIM_DELAY) {
        hideTimerRef.current = setTimeout(check, AIM_CHECK_INTERVAL);
        return;
      }
      hideTimerRef.current = undefined;
      setTooltipState(prev => prev.open && !prev.pinned ? { ...prev, open: false } : prev);
    };
    hideTimerRef.current = setTimeout(check, HIDE_DELAY);
  }, [cancelHide, isAimingAtTooltip]);

  useEffect(() => cancelHide, [cancelHide]);

  useEffect(() => {
    if (!keepOpen) hideTooltip();
  }, [keepOpen, hideTooltip])

  const actions = useMemo(
    () => ({ showTooltip, togglePinnedTooltip, hideTooltip, closeTooltip, scheduleHide, cancelHide, registerTooltipElement, isAimingAtTooltip }),
    [showTooltip, togglePinnedTooltip, hideTooltip, closeTooltip, scheduleHide, cancelHide, registerTooltipElement, isAimingAtTooltip]
  );

  const value = useMemo(
    () => ({ tooltipState, keepOpen, setKeepOpen, ...actions }),
    [tooltipState, keepOpen, actions]
  );

  return (
    <TooltipActionsContext.Provider value={actions}>
      <TooltipContext.Provider value={value}>
        {children}
      </TooltipContext.Provider>
    </TooltipActionsContext.Provider>
  );
};

export const useItemTooltip = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useItemTooltip must be used within an ItemTooltipProvider');
  }
  return context;
};

/** Only the tooltip callbacks; use this in components that don't read the tooltip state. */
export const useItemTooltipActions = () => {
  const context = useContext(TooltipActionsContext);
  if (context === undefined) {
    throw new Error('useItemTooltipActions must be used within an ItemTooltipProvider');
  }
  return context;
};

/** Marks the elements that open item tooltips, so a click on one isn't taken as a click outside the tooltip */
export const ITEM_TILE_ATTRIBUTE = "data-item-tile";

/** How often the pointer is checked while it is on an item, to tell a rest from a pass */
const INTENT_INTERVAL = 80;
/** Moving less than this between two checks is resting on the item: its tooltip opens */
const INTENT_SENSITIVITY = 6;
/** Moving less than this is a full stop: the tooltip opens even if the pointer was heading for another one */
const INTENT_STILL = 2;

/**
 * Handlers to spread on an item tile: the tooltip opens when the mouse rests on it, not while it sweeps across it on
 * its way elsewhere (or to the open tooltip). A click (or Enter) pins it, and touch only opens it on tap.
 * `getProps` returns undefined when the tile has nothing to show.
 */
export const useItemTooltipTrigger = (getProps: () => Omit<ShowTooltipProps, "anchor" | "anchorElement" | "pinned"> | undefined, disabled = false) => {
  const { showTooltip, togglePinnedTooltip, scheduleHide, cancelHide, isAimingAtTooltip } = useItemTooltipActions();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => () => clearTimeout(showTimerRef.current), []);

  const anchorOf = (element: Element): Anchor => {
    const { left, top, right, bottom } = element.getBoundingClientRect();
    return { left, top, right, bottom };
  };

  const pin = (element: Element) => {
    clearTimeout(showTimerRef.current);
    const props = getProps();
    if (props) togglePinnedTooltip({ ...props, anchor: anchorOf(element), anchorElement: element });
  };

  // Checks the pointer every INTENT_INTERVAL: it opens the tooltip once it slows down on the item, unless it is
  // still heading for the tooltip already open
  const watchIntent = (element: Element) => {
    let last = { ...pointerRef.current };
    const check = () => {
      const { x, y } = pointerRef.current;
      const moved = Math.hypot(x - last.x, y - last.y);
      last = { x, y };
      if (moved <= INTENT_STILL || (moved <= INTENT_SENSITIVITY && !isAimingAtTooltip())) {
        const props = getProps();
        if (props) showTooltip({ ...props, anchor: anchorOf(element), anchorElement: element });
        return;
      }
      showTimerRef.current = setTimeout(check, INTENT_INTERVAL);
    };
    clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(check, INTENT_INTERVAL);
  };

  if (disabled) return {};

  return {
    [ITEM_TILE_ATTRIBUTE]: "",
    tabIndex: 0,
    role: "button",
    "aria-haspopup": "dialog" as const,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      // Crossing items on the way to the tooltip must not close it
      if (!isAimingAtTooltip()) cancelHide();
      pointerRef.current = { x: e.clientX, y: e.clientY };
      watchIntent(e.currentTarget);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") pointerRef.current = { x: e.clientX, y: e.clientY };
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(showTimerRef.current);
      scheduleHide();
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => pin(e.currentTarget),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      pin(e.currentTarget);
    },
  };
};
