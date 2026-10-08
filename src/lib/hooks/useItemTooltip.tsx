"use client";

import { useState, createContext, useContext, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { ItemDefinition } from "@/lib/types";
import { Anchor } from "@/lib/helpers/tooltip-position";

export interface ShowTooltipProps {
  item: ItemDefinition | undefined;
  itemInstanceId: string | undefined;
  /** Where the item is shown, "" when nowhere in particular */
  characterId: string;
  state: number;
  drawTransfert: boolean;
  /** The element the tooltip describes; the tooltip goes next to it */
  anchor: Anchor;
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
}

interface TooltipContextType extends TooltipActions {
  tooltipState: TooltipState;
  keepOpen: boolean;
  setKeepOpen: (keepOpen: boolean) => void;
}

/** How long the pointer can be off both the item and the tooltip before an unpinned tooltip closes */
const HIDE_DELAY = 150;

const initialState: TooltipState = {
  item: undefined,
  itemInstanceId: undefined,
  anchor: { left: 0, top: 0, right: 0, bottom: 0 },
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
    setTooltipState(prev => (prev.open && prev.pinned && !pinned) ? prev : { ...props, pinned, open: true });
  }, [cancelHide]);

  const togglePinnedTooltip = useCallback((props: Omit<ShowTooltipProps, "pinned">) => {
    cancelHide();
    setTooltipState(prev => {
      const samePinned = prev.open && prev.pinned && prev.item?.hash === props.item?.hash && prev.itemInstanceId === props.itemInstanceId;
      return samePinned ? { ...prev, open: false } : { ...props, pinned: true, open: true };
    });
  }, [cancelHide]);

  const closeTooltip = useCallback(() => {
    cancelHide();
    setTooltipState(prev => prev.open ? { ...prev, open: false } : prev);
  }, [cancelHide]);

  const hideTooltip = useCallback(() => {
    if (!keepOpenRef.current) closeTooltip();
  }, [closeTooltip]);

  const scheduleHide = useCallback(() => {
    cancelHide();
    if (keepOpenRef.current) return;
    hideTimerRef.current = setTimeout(() => {
      setTooltipState(prev => prev.open && !prev.pinned ? { ...prev, open: false } : prev);
    }, HIDE_DELAY);
  }, [cancelHide]);

  useEffect(() => cancelHide, [cancelHide]);

  useEffect(() => {
    if (!keepOpen) hideTooltip();
  }, [keepOpen, hideTooltip])

  const actions = useMemo(
    () => ({ showTooltip, togglePinnedTooltip, hideTooltip, closeTooltip, scheduleHide, cancelHide }),
    [showTooltip, togglePinnedTooltip, hideTooltip, closeTooltip, scheduleHide, cancelHide]
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

/** How long the mouse rests on an item before its tooltip opens */
const HOVER_DELAY = 200;

/**
 * Handlers to spread on an item tile: the tooltip opens when the mouse rests on it, a click (or Enter) pins it,
 * and touch only opens it on tap. `getProps` returns undefined when the tile has nothing to show.
 */
export const useItemTooltipTrigger = (getProps: () => Omit<ShowTooltipProps, "anchor" | "pinned"> | undefined, disabled = false) => {
  const { showTooltip, togglePinnedTooltip, scheduleHide, cancelHide } = useItemTooltipActions();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(showTimerRef.current), []);

  const anchorOf = (element: Element): Anchor => {
    const { left, top, right, bottom } = element.getBoundingClientRect();
    return { left, top, right, bottom };
  };

  const pin = (element: Element) => {
    clearTimeout(showTimerRef.current);
    const props = getProps();
    if (props) togglePinnedTooltip({ ...props, anchor: anchorOf(element) });
  };

  if (disabled) return {};

  return {
    [ITEM_TILE_ATTRIBUTE]: "",
    tabIndex: 0,
    role: "button",
    "aria-haspopup": "dialog" as const,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      cancelHide();
      const element = e.currentTarget;
      clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => {
        const props = getProps();
        if (props) showTooltip({ ...props, anchor: anchorOf(element) });
      }, HOVER_DELAY);
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
