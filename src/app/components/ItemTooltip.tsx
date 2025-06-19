"use client"

import { useEffect } from 'react';
import { useItemTooltip } from '@/lib/hooks/useItemTooltip';

/*
 * This file exists as a temporary bridge to the new GlobalItemTooltip implementation.
 * It should be removed once all references to it have been updated.
 * 
 * For new code, use the useItemTooltip hook directly.
 */

interface ItemTooltipProps {
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

const ItemTooltip = (props: ItemTooltipProps) => {
  const { showTooltip, hideTooltip } = useItemTooltip();
  
  // When props change, update the global tooltip
  useEffect(() => {
    if (props.open) {
      const { positions, open, ...rest } = props;
      showTooltip({
        ...rest,
        x: positions.x,
        y: positions.y
      });
    } else {
      hideTooltip();
    }
  }, [props, showTooltip, hideTooltip]);
  
  // This component doesn't render anything itself
  return null;
};

export default ItemTooltip; 