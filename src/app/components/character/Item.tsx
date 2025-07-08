"use client"

import React, { useState, useRef, useEffect } from "react";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import LoadingItem from "./LoadingItem";

interface ItemProps {
  itemHash: number;
  itemInstanceId: string;
  ornamentItem?: any | undefined;
  state: number;
  perks :any;
  stats :any;
  characterId :any;
  armor :boolean
  onDoubleClick?: () => void;
  quantity?: number;
}

const Item = ({
  itemHash,
  itemInstanceId,
  ornamentItem,
  state,
  characterId,
  armor,
  onDoubleClick,
  quantity = 1,
}: ItemProps) => {
  
  const { showTooltip, hideTooltip } = useItemTooltip();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { itemDefinitions } = useDefinitions()

  // Handle mouse movement globally to detect if we should keep tooltip open
  useEffect(() => {
    if (!tooltipVisible) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Get tooltip element bounds
      const tooltipElement = document.querySelector('.item-tooltip') as HTMLElement;
      if (!tooltipElement || !itemRef.current) return;

      const tooltipRect = tooltipElement.getBoundingClientRect();
      const itemRect = itemRef.current.getBoundingClientRect();

      // Check if mouse is over item or tooltip
      const isOverTooltip = e.clientX >= tooltipRect.left && 
                           e.clientX <= tooltipRect.right && 
                           e.clientY >= tooltipRect.top && 
                           e.clientY <= tooltipRect.bottom;

      const isOverItem = e.clientX >= itemRect.left && 
                        e.clientX <= itemRect.right && 
                        e.clientY >= itemRect.top && 
                        e.clientY <= itemRect.bottom;

      // Only hide tooltip if mouse is not over the item or the tooltip
      if (!isOverTooltip && !isOverItem) {
        hideTooltip();
        setTooltipVisible(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [tooltipVisible, hideTooltip]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(
      "text/plain",
        itemHash +
        ":" +
        itemInstanceId +
        ":" +
        itemDefinitions[itemHash].equippingBlock.equipmentSlotTypeHash
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const toggleTooltip = (e: React.MouseEvent<HTMLDivElement>) => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate initial tooltip position with better defaults
    // Position to the right of the cursor by default, with a small offset
    let tooltipX = e.clientX + 10;
    
    // If we're in the right 30% of the screen, position the tooltip to the left of the cursor
    if (e.clientX > viewportWidth * 0.7) {
      tooltipX = e.clientX - 285; // 275px width + 10px margin
    }
    
    // Start tooltip slightly above cursor to prevent immediate overlap
    let tooltipY = e.clientY - 20;
    
    // If we're in the bottom 30% of the screen, position the tooltip higher
    if (e.clientY > viewportHeight * 0.7) {
      tooltipY = e.clientY - 300; // Approximate height adjustment
      // Ensure it doesn't go off the top of the screen
      tooltipY = Math.max(10, tooltipY);
    }

    // Show tooltip at calculated position
    showTooltip({
      item: itemDefinitions[itemHash],
      itemInstanceId: itemInstanceId,
      characterId,
      armor,
      x: tooltipX,
      y: tooltipY
    });
    setTooltipVisible(true);
  };

  return (
    <div
      ref={itemRef}
      key={itemHash}
      style={{
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        height: 64,
        cursor: "pointer"
      }}
      onDoubleClick={() => {
        hideTooltip();
        setTooltipVisible(false);
        if(onDoubleClick){
          onDoubleClick()
        }
      }}
      draggable // Make the div draggable
      onDragStart={handleDragStart}
      onClick={(e) => toggleTooltip(e)}
      // Remove onMouseLeave which was causing the tooltip to disappear
    >
      <div
        style={{
          position: "relative",
          zIndex: 0
        }}
      >
        {!imageLoaded && <LoadingItem />}
        {ornamentItem ? (
          <img
            src={"https://bungie.net" + ornamentItem.displayProperties.icon}
            height={64}
            width={64}
            style={{
              border:
                "2px solid " +
                (state & 4 ? "#FFBB00" : state & 8 ? "red" : "white"),
              display: imageLoaded ? undefined : "none"
            }}
            alt={ornamentItem.displayProperties.name || "Item"}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        ) : (
          <img
            src={"https://bungie.net" + itemDefinitions[itemHash].displayProperties.icon}
            height={64}
            width={64}
            style={{
              border:
                "2px solid " +
                (state & 4 ? "#FFBB00" : state & 8 ? "red" : "white"),
              display: imageLoaded ? undefined : "none"
            }}
            alt={itemDefinitions[itemHash].displayProperties.name || "Item"}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        )}
        {itemDefinitions[itemHash].iconWatermark && imageLoaded && (
          <img
            src={"https://bungie.net" + itemDefinitions[itemHash].iconWatermark}
            height={64}
            width={64}
            style={{ position: "absolute", top: 2, left: 2 }}
            draggable={false}
            alt="Watermark"
          />
        )}
        {/* Display quantity for stackable items */}
        {quantity > 1 && imageLoaded && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            background: 'rgba(0,0,0,0.75)',
            color: 'white',
            fontSize: '0.75rem',
            padding: '0 4px',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}>
            {quantity}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Item);
