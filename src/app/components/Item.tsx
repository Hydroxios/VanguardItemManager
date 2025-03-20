"use client"

import { useState } from "react";

import ItemTooltip from "./ItemTooltip";

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
  onDoubleClick,
}: ItemProps) => {
  
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false)
  const [tooltipPositions, setTooltipPositions] = useState<{x: number, y: number}>({x: 0, y: 0})

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
    setTooltipPositions({ x: e.clientX + 2, y: e.clientY - 100}); // Set positions to the left of the cursor
    setTooltipOpen((open) => !open);
  }

  if (!item) return <></>;

  return (
    <div
      key={item.hash}
      style={{
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        height: 64,
        cursor: "pointer"
      }}
      onDoubleClick={() => {
        setTooltipOpen(false);
        if(onDoubleClick){
          onDoubleClick()
        }
      }}
      draggable // Make the div draggable
      onDragStart={handleDragStart}
      onClick={(e) => toggleTooltip(e)}
    >
      <ItemTooltip
        item={item}
        itemInstance={itemInstance}
        itemPerks={perks}
        itemStats={stats}
        positions={tooltipPositions}
        statsDefinition={statsDefinition}
        perksDefinition={perksDefinition}
        open={tooltipOpen}
        characterId={characterId}
        characters={characters}
        classDefinition={classDefinition}
        armor={armor}
        itemInstances={itemInstances}
      />
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
          />
        )}
        {item.iconWatermark && (
          <img
            src={"https://bungie.net" + item.iconWatermark}
            height={64}
            width={64}
            style={{ position: "absolute", top: 2, left: 2 }}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
};

export default Item;
