"use client";

import { useState, createContext, useContext, ReactNode } from 'react';
import { ClassDefinitions, PerksDefinitions, StatsDefinitions } from './useDefinitions';

interface TooltipState {
  item: any;
  itemInstanceId: any;
  positions: { x: number, y: number };
  open: boolean;
  characterId: any;
  armor: boolean;
}

interface TooltipContextType {
  tooltipState: TooltipState;
  showTooltip: (props: Omit<TooltipState, 'open' | 'positions'> & { x: number, y: number }) => void;
  hideTooltip: () => void;
}

const initialState: TooltipState = {
  item: null,
  itemInstanceId: null,
  positions: { x: 0, y: 0 },
  open: false,
  characterId: null,
  armor: false
};

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const ItemTooltipProvider = ({ children }: { children: ReactNode }) => {
  const [tooltipState, setTooltipState] = useState<TooltipState>(initialState);

  const showTooltip = (props: Omit<TooltipState, 'open' | 'positions'> & { x: number, y: number }) => {
    const { x, y, ...rest } = props;
    setTooltipState({
      ...rest,
      positions: { x, y },
      open: true
    });
  };

  const hideTooltip = () => {
    setTooltipState(prev => ({ ...prev, open: false }));
  };

  return (
    <TooltipContext.Provider value={{ tooltipState, showTooltip, hideTooltip }}>
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