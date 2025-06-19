"use client"

import { useState, useRef, useEffect } from "react";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";

interface ItemProps {
  item: any;
  itemInstance: any;
  itemInstances :any
  ornamentItem?: any | undefined;
  state: number;
  perks :any;
  stats :any;
  perksDefinition :any;
  statsDefinition :any;
  characterId :any;
  characters :any;
  classDefinition :any;
  armor :boolean
  membershipId?: string;
  membershipType?: number;
  token?: string;
  onDoubleClick?: () => void;
}

const Item = ({
  item,
  itemInstance,
  itemInstances,
  ornamentItem,
  state,
  perks,
  stats,
  perksDefinition,
  statsDefinition,
  characterId,
  characters,
  classDefinition,
  armor,
  membershipId,
  membershipType,
  token,
  onDoubleClick,
}: ItemProps) => {
  
  const { showTooltip, hideTooltip, tooltipState } = useItemTooltip();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

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
      item.hash +
        ":" +
        itemInstance.itemInstanceId +
        ":" +
        item.equippingBlock.equipmentSlotTypeHash
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
      item,
      itemInstance,
      itemInstances,
      itemPerks: perks,
      itemStats: stats,
      statsDefinition,
      perksDefinition,
      characterId,
      characters,
      classDefinition,
      armor,
      x: tooltipX,
      y: tooltipY
    });
    setTooltipVisible(true);
  };

  if (!item) return <></>;

  return (
    <div
      ref={itemRef}
      key={item.hash}
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
        {ornamentItem ? (
          <img
            src={"https://bungie.net" + ornamentItem.displayProperties.icon}
            height={64}
            width={64}
            style={{
              border:
                "2px solid " +
                (state & 4 ? "#FFBB00" : state & 8 ? "red" : "white"),
            }}
            alt={ornamentItem.displayProperties.name || "Item"}
          />
        ) : (
          <img
            src={"https://bungie.net" + item.displayProperties.icon}
            height={64}
            width={64}
            style={{
              border:
                "2px solid " +
                (state & 4 ? "#FFBB00" : state & 8 ? "red" : "white"),
            }}
            alt={item.displayProperties.name || "Item"}
          />
        )}
        {item.iconWatermark && (
          <img
            src={"https://bungie.net" + item.iconWatermark}
            height={64}
            width={64}
            style={{ position: "absolute", top: 2, left: 2 }}
            draggable={false}
            alt="Watermark"
          />
        )}
        {/* Display quantity for stackable items */}
        {itemInstance && itemInstance.quantity && itemInstance.quantity > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 1,
              right: 3,
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "white",
              fontSize: "12px",
              padding: "0 3px",
              borderRadius: "3px",
              fontWeight: "bold"
            }}
          >
            {itemInstance.quantity}
          </div>
        )}
      </div>
    </div>
  );
};

export default Item;
