"use client";

import { useLayoutEffect, useRef } from "react";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import { useDebug } from "@/app/components/debug/DebugProvider";
import DebugInfos from "@/app/components/debug/DebugInfos";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import TooltipHeader from "./tooltip/TooltipHeader";
import TooltipStats from "./tooltip/TooltipStats";
import TooltipPerks from "./tooltip/TooltipPerks";
import TooltipActions from "./tooltip/TooltipActions";
import TooltipSubclass from "./tooltip/TooltipSubclass";
import { ItemDefinition } from "@/lib/types";

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

  const tooltipRef = useRef<HTMLDivElement>(null);

  const { debugMode } = useDebug();
  const {
    statsDefinitions,
    perksDefinitions,
    objectiveDefinitions,
    classDefinitions,
    itemConstantsDefinitions,
  } = useDefinitions();
  const { itemComponents, characters } = useProfile();

  // Check if an item is a material
  const isMaterial = (item: ItemDefinition) => {
    // Materials typically don't have equippingBlock
    return (
      item && (item.itemCategoryHashes.includes(40))
    );
  };

  // Keep the tooltip within the viewport. It is measured once rendered, then moved before the browser paints,
  // straight on the element so placing it doesn't cost another render
  useLayoutEffect(() => {
    const tooltipElement = tooltipRef.current;
    if (!open || !item || !tooltipElement) return;

    let newX = positions.x;
    let newY = positions.y;
    const tooltipRect = tooltipElement.getBoundingClientRect();

    if (newX + tooltipRect.width > window.innerWidth) {
      newX = window.innerWidth - tooltipRect.width - 10; // 10px margin
    }
    if (newX < 0) {
      newX = 10;
    }
    if (newY + tooltipRect.height > window.innerHeight) {
      // Move it up when it would overflow at the bottom
      newY = window.innerHeight - tooltipRect.height - 10; // 10px margin
    }
    if (newY < 0) {
      newY = 20;
    }

    tooltipElement.style.left = `${newX}px`;
    tooltipElement.style.top = `${newY}px`;
  }, [open, item, positions]);

  if (!open || !item) {
    return null;
  }

  const materialItem = isMaterial(item);

  return (
    <div
      ref={tooltipRef}
      className={`flex flex-col fixed items-start bg-black bg-opacity-90 z-[1005] pointer-events-auto item-tooltip max-h-[90vh] overflow-y-auto overflow-x-hidden`}
      style={{
        // left and top are set by the layout effect above
        // Subclasses size to their content; other items keep a fixed width
        width: item.itemType === 16 ? undefined : "min(400px, calc(100vw - 20px))",
        maxWidth: "min(720px, calc(100vw - 20px))",
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
          characterId={characterId}
          characters={characters}
          classDefinitions={classDefinitions}
          drawTransfert={drawTransfert}
          armor={armor}
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
                (p) => perksDefinitions[p.perkHash]
              ),
            ],
          }}
        />
      )}
    </div>
  );
};

export default GlobalItemTooltip;
