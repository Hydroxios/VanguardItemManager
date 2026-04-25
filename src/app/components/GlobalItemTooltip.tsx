"use client";

import { useLayoutEffect, useState } from "react";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import { useDebug } from "@/app/components/debug/DebugProvider";
import DebugInfos from "@/app/components/debug/DebugInfos";
import { ItemDefinition, useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import useAuth from "@/lib/hooks/useAuth";
import TooltipHeader from "./tooltip/TooltipHeader";
import TooltipStats from "./tooltip/TooltipStats";
import TooltipPerks from "./tooltip/TooltipPerks";
import TooltipActions from "./tooltip/TooltipActions";
import TooltipSubclass from "./tooltip/TooltipSubclass";

const GlobalItemTooltip = () => {
  const { tooltipState, hideTooltip, keepOpen } = useItemTooltip();
  const {
    item,
    itemInstanceId,
    positions,
    open,
    characterId,
    armor,
    state,
    drawTransfert,
  } = tooltipState;

  // UI state
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const [tooltipHeight, setTooltipHeight] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tooltipWidth, setTooltipWidth] = useState(275); // Default width

  const { debugMode } = useDebug();
  const {
    statsDefinitions,
    perksDefinitions,
    objectiveDefinitions,
    classDefinitions,
    itemConstantsDefinitions,
  } = useDefinitions();
  const { itemComponents, characters, user, moveItem } = useProfile();
  const { token } = useAuth();

  // Check if an item is a material
  const isMaterial = (item: ItemDefinition) => {
    // Materials typically don't have equippingBlock
    return (
      item && (item.itemCategoryHashes.includes(40))
    );
  };

  // Adjust tooltip position to stay within viewport bounds
  useLayoutEffect(() => {
    if (!open || !item) return;

    // Set initial position
    let newX = positions.x;
    let newY = positions.y;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Reference to tooltip element for measuring
    const tooltipElement = document.querySelector(
      ".item-tooltip"
    ) as HTMLElement;
    if (tooltipElement) {
      // Get tooltip dimensions
      const tooltipRect = tooltipElement.getBoundingClientRect();
      setTooltipHeight(tooltipRect.height);
      setTooltipWidth(tooltipRect.width);

      // Adjust X position if needed
      if (newX + tooltipRect.width > viewportWidth) {
        newX = viewportWidth - tooltipRect.width - 10; // 10px margin
      }
      if (newX < 0) {
        newX = 10;
      }

      // Adjust Y position if needed
      if (newY + tooltipRect.height > viewportHeight) {
        // Position above the cursor if it would overflow at the bottom
        newY = viewportHeight - tooltipRect.height - 10; // 10px margin
      }
      if (newY < 0) {
        newY = 20;
      }

      setAdjustedPosition({ x: newX, y: newY });
    } else {
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [open, item, positions, tooltipHeight]);

  if (!open || !item) {
    return null;
  }

  const materialItem = isMaterial(item);

  return (
    <div
      className={`flex flex-col fixed items-start bg-black bg-opacity-90 z-[1005] pointer-events-auto item-tooltip max-h-[90vh] overflow-y-auto overflow-x-hidden`}
      style={{
        top: adjustedPosition.y,
        left: adjustedPosition.x,
        width: "min(400px, calc(100vw - 20px))",
  minWidth: "min(350px, calc(100vw - 20px))",
      }}
      onMouseLeave={() => {
        if (!keepOpen) {
          hideTooltip();
        }
      }}
    >
      <TooltipHeader
        item={item}
        itemInstanceId={itemInstanceId}
        itemComponents={itemComponents}
        itemConstantsDefinitions={itemConstantsDefinitions}
        objectiveDefinitions={objectiveDefinitions}
        state={state}
      />

      <div className="flex flex-col" style={{ width: "100%" }}>
        {materialItem || item.itemType === 16 ? (
          <div className={`p-4 text-gray-200 ${item.itemType === 16 ? "text-center" : ""}`}>
            {item.displayProperties.description}
          </div>
        ) : (
          <>
            <TooltipStats
              item={item}
              itemInstanceId={itemInstanceId}
              itemComponents={itemComponents}
              statsDefinitions={statsDefinitions}
              armor={armor}
            />
            <TooltipPerks
              item={item}
              itemInstanceId={itemInstanceId}
              itemComponents={itemComponents}
              perksDefinitions={perksDefinitions}
              itemType={armor ? "armor" : "weapon"}
            />
          </>
        )}
      </div>

      {item.itemType === 16 && (
        <TooltipSubclass
          item={item}
          itemInstanceId={itemInstanceId}
        />
      )}
      <div className={`border-t w-full border-gray-500 py-2 ${item.itemType === 16 ? "max-w-none px-6 text-center" : "max-w-[400px]"}`}>
        {item.flavorText}
      </div>

      {item.itemType !== 16 && (
        <TooltipActions
          item={item}
          itemInstanceId={itemInstanceId}
          itemComponents={itemComponents}
          characterId={characterId}
          characters={characters}
          token={token}
          user={user}
          classDefinitions={classDefinitions}
          drawTransfert={drawTransfert}
          armor={armor}
          moveItem={moveItem}
        />
      )}

      {debugMode && (
        <DebugInfos
          data={{
            itemInstance: itemComponents.instances[itemInstanceId!],
            ...itemComponents.perks[itemInstanceId!],
            ...(itemComponents.stats[itemInstanceId!] ?? {}),
            item,
            perksDefinitions: [
              itemComponents?.perks?.[itemInstanceId!]?.perks?.map(
                (p: any) => perksDefinitions[p.perkHash]
              ),
            ],
          }}
        />
      )}
    </div>
  );
};

export default GlobalItemTooltip;
