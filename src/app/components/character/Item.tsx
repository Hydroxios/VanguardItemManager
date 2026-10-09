"use client"

import React, { useState } from "react";
import { useItemTooltipActions, useItemTooltipTrigger } from "@/lib/hooks/useItemTooltip";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import ItemContextMenu from "./ItemContextMenu";
import Image from "next/image";
import { ItemDefinition, ItemPerks, ItemStats } from "@/lib/types";
import { ITEM_TYPES } from "@/lib/constants";

interface ItemProps {
  itemHash: number;
  itemInstanceId: string;
  ornamentItem?: ItemDefinition;
  state: number;
  perks?: ItemPerks;
  stats?: ItemStats;
  characterId: string;
  onDoubleClick?: () => void;
  quantity?: number;
  size?: number; // Add size prop
  tooltipDisabled?: boolean;
  /** Replaces the fast transfer menu on right click */
  onContextMenu?: () => void;
}

const Item = ({
  itemHash,
  itemInstanceId,
  ornamentItem,
  state,
  characterId,
  onDoubleClick,
  quantity = 1,
  size = 64, // Default size to 64
  tooltipDisabled = false,
  onContextMenu
}: ItemProps) => {

  const { closeTooltip } = useItemTooltipActions();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { itemComponents } = useProfile()
  const { itemDefinitions, itemConstantsDefinitions } = useDefinitions()

  // Subclass icons are diamonds: no square frame around them
  const isSubclass = itemDefinitions[itemHash]?.itemType === ITEM_TYPES.SUBCLASS;
  const border = isSubclass ? "none" : "2px solid " + (state & 4 && !(state & 8) ? "#FFBB00" : state & 8 ? "red" : "white");

  const tooltipTrigger = useItemTooltipTrigger(() => ({
    item: itemDefinitions[itemHash],
    itemInstanceId,
    characterId,
    state,
    drawTransfert: true,
  }), tooltipDisabled);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(
      "text/plain",
      itemHash +
      ":" +
      itemInstanceId +
      ":" +
      (itemDefinitions[itemHash]?.equippingBlock?.equipmentSlotTypeHash ?? "")
    );
    event.dataTransfer.effectAllowed = "move";
    closeTooltip();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    closeTooltip();
    if (onContextMenu) onContextMenu();
    // Subclasses never leave the character: no fast transfer for them
    else if (!isSubclass) setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      {contextMenu && (
        <ItemContextMenu
          itemHash={itemHash}
          itemInstanceId={itemInstanceId}
          characterId={characterId}
          onClose={() => setContextMenu(null)}
          position={contextMenu}
        />
      )}
      <div
        {...tooltipTrigger}
        aria-label={itemDefinitions[itemHash]?.displayProperties?.name}
        key={itemHash}
        style={{
          boxShadow: isSubclass ? undefined : "0 4px 8px rgba(0, 0, 0, 0.3)",
          height: size,
          cursor: "pointer",
          width: size,
        }}
        onDoubleClick={() => {
          closeTooltip();
          if (onDoubleClick) {
            onDoubleClick()
          }
        }}
        // Subclasses never leave the character: they can't be dragged (not even as a plain image)
        draggable={!isSubclass}
        onDragStart={isSubclass ? (e) => e.preventDefault() : handleDragStart}
        onContextMenu={handleContextMenu}
      >
        <div
          style={{
            position: "relative",
            zIndex: 0,
          }}
        >
          {ornamentItem ? (
            <div style={{ width: size, height: size }}>
              <Image
                src={"https://www.bungie.net" + ornamentItem.displayProperties.icon}
                height={size}
                width={size}
                style={{
                  border,
                }}
                alt={ornamentItem.displayProperties.name || "Item"}
              />
              {state & 4 && !(state & 8) ? (
                <svg className="mw-border-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  {/* Glint travels along the square path; base border is the CSS border on the Image */}
                  <rect x="1" y="1" width="98" height="98" pathLength="1000" className="mw-glint" />
                </svg>
              ) : null}
            </div>
          ) : (
            <div style={{ width: size, height: size }}>
              <Image
                src={"https://www.bungie.net" + itemDefinitions[itemHash].displayProperties.icon}
                height={size}
                width={size}
                style={{
                  border,
                }}
                alt={itemDefinitions[itemHash].displayProperties.name || "Item"}
              />
              {state & 4 && !(state & 8) ? (
                <svg className="mw-border-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  <rect x="1" y="1" width="98" height="98" pathLength="1000" className="mw-glint" />
                </svg>
              ) : null}
            </div>
          )}
          {itemComponents.instances[itemInstanceId] && (itemDefinitions[itemHash].iconWatermark || itemDefinitions[itemHash].iconWatermarkFeatured) && (
            <>
              <Image
                src={"https://www.bungie.net" + (itemDefinitions[itemHash].isFeaturedItem ? itemDefinitions[itemHash].iconWatermarkFeatured : itemDefinitions[itemHash].iconWatermark)}
                height={size} // Use size prop
                width={size} // Use size prop
                style={{ position: "absolute", top: -1, left: -1, width: size, height: size, zIndex: 1 }} // Ensure watermark scales with size
                draggable={false}
                alt="Watermark"
              />
              {itemComponents.instances[itemInstanceId] && itemComponents.instances[itemInstanceId].gearTier && itemConstantsDefinitions["1"] ? (
                <Image
                  src={"https://www.bungie.net" + itemConstantsDefinitions["1"].gearTierOverlayImagePaths[Math.max(itemComponents.instances[itemInstanceId].gearTier - 1, 0)]}
                  height={size * 0.875} // Scale overlay relative to size (56/64 = 0.875)
                  width={size * 0.875} // Scale overlay relative to size
                  style={{ position: "absolute", top: size * 0.046875, left: size * 0, zIndex: 1 }} // Scale position relative to size (3/64 = 0.046875)
                  draggable={false}
                  alt="Gear Tier"
                />
              ) : ""}
            </>
          )}
          {!isSubclass && <div style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: size - 4,
            height: size - 4,
            boxShadow: `inset 0 0 12px rgba(0,0,0,0.9)`,
            pointerEvents: "none"
          }} />}
          {/* Display quantity for stackable items */}
          {quantity > 1 && (
            <div style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              background: 'black',
              color: (quantity < itemDefinitions[itemHash].inventory.maxStackSize ? "white" : "gold"),
              fontSize: '0.75rem',
              padding: '0 4px',
              pointerEvents: 'none',
            }}>
              {quantity}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(Item);
