"use client";

import { useState, createContext, useContext, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { ItemDefinition } from './useDefinitions';

interface TooltipState {
  item: ItemDefinition | undefined;
  itemInstanceId: string | undefined;
  positions: { x: number, y: number };
  open: boolean;
  characterId: any;
  armor: boolean;
  state: number;
  drawTransfert: boolean;
}

interface TooltipContextType {
  tooltipState: TooltipState;
  showTooltip: (props: Omit<TooltipState, 'open' | 'positions'> & { x: number, y: number }) => void;
  hideTooltip: () => void;
  keepOpen: boolean;
  setKeepOpen: (keepOpen: boolean) => void;
}

const initialState: TooltipState = {
  item: undefined,
  itemInstanceId: undefined,
  positions: { x: 0, y: 0 },
  open: false,
  characterId: null,
  armor: false,
  state: 0,
  drawTransfert: true
};

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

type TooltipActions = Pick<TooltipContextType, 'showTooltip' | 'hideTooltip'>;
// Separate context with stable callbacks only: its consumers don't re-render when the tooltip opens or moves
const TooltipActionsContext = createContext<TooltipActions | undefined>(undefined);

export const ItemTooltipProvider = ({ children }: { children: ReactNode }) => {
  const [tooltipState, setTooltipState] = useState<TooltipState>(initialState);
  const [keepOpen, setKeepOpen] = useState(false);

  const keepOpenRef = useRef(keepOpen);
  useEffect(() => { keepOpenRef.current = keepOpen; }, [keepOpen]);

  // Stable callbacks and a memoized value, so consumers (and memoized items) only
  // re-render when the tooltip state they read actually changes
  const showTooltip = useCallback((props: Omit<TooltipState, 'open' | 'positions'> & { x: number, y: number }) => {
    const { x, y, ...rest } = props;
    setTooltipState({
      ...rest,
      positions: { x, y },
      open: true
    });
  }, []);

  const hideTooltip = useCallback(() => {
    if (!keepOpenRef.current) {
      setTooltipState(prev => prev.open ? { ...prev, open: false } : prev);
    }
  }, []);

  useEffect(() => {
    if (!keepOpen) hideTooltip();
  }, [keepOpen, hideTooltip])

  const value = useMemo(
    () => ({ tooltipState, showTooltip, hideTooltip, keepOpen, setKeepOpen }),
    [tooltipState, showTooltip, hideTooltip, keepOpen]
  );

  const actions = useMemo(() => ({ showTooltip, hideTooltip }), [showTooltip, hideTooltip]);

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

/** Only the show/hide callbacks; use this in components that don't read the tooltip state. */
export const useItemTooltipActions = () => {
  const context = useContext(TooltipActionsContext);
  if (context === undefined) {
    throw new Error('useItemTooltipActions must be used within an ItemTooltipProvider');
  }
  return context;
};
