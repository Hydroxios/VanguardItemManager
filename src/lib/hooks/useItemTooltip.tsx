"use client";

import { useState, createContext, useContext, ReactNode } from 'react';

interface TooltipState {
  item: any;
  itemInstance: any;
  itemInstances: any;
  itemPerks: any;
  itemStats: any;
  positions: { x: number, y: number };
  statsDefinition: any;
  perksDefinition: any;
  open: boolean;
  characterId: any;
  characters: any;
  classDefinition: any;
  armor: boolean;
}

interface TooltipContextType {
  tooltipState: TooltipState;
  showTooltip: (props: Omit<TooltipState, 'open' | 'positions'> & { x: number, y: number }) => void;
  hideTooltip: () => void;
}

const initialState: TooltipState = {
  item: null,
  itemInstance: null,
  itemInstances: null,
  itemPerks: null,
  itemStats: null,
  positions: { x: 0, y: 0 },
  statsDefinition: null,
  perksDefinition: null,
  open: false,
  characterId: null,
  characters: null,
  classDefinition: null,
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