"use client";

import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
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

export const ItemTooltipProvider = ({ children }: { children: ReactNode }) => {
  const [tooltipState, setTooltipState] = useState<TooltipState>(initialState);
  const [keepOpen, setKeepOpen] = useState(false);

  useEffect(() => {
    if (!keepOpen && tooltipState.open) hideTooltip();
  }, [keepOpen])

  const showTooltip = (props: Omit<TooltipState, 'open' | 'positions'> & { x: number, y: number }) => {
    const { x, y, ...rest } = props;
    setTooltipState({
      ...rest,
      positions: { x, y },
      open: true
    });
  };

  const hideTooltip = () => {
    if (!keepOpen) {
      setTooltipState(prev => ({ ...prev, open: false }));
    }
  };

  return (
    <TooltipContext.Provider value={{ tooltipState, showTooltip, hideTooltip, keepOpen, setKeepOpen }}>
      {children}
    </TooltipContext.Provider>
  );
};

export const useItemTooltip = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useItemTooltip must be used within an ItemTooltipProvider');
  }
  return context;
}; 