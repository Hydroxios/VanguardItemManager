import React, { useState } from "react";
import usePullFromPostmaster from "@/lib/hooks/usePullFromPostmaster";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import Image from "next/image";
import { Item } from "@/lib/types";
import { BUCKETS } from "@/lib/constants";
import { useItemTooltipActions, useItemTooltipTrigger } from "@/lib/hooks/useItemTooltip";


/** A postmaster tile: its tooltip offers to pull it, as does a double click */
const PostmasterItem = ({ item, characterId, onCollect }: { item: Item; characterId: string; onCollect: () => void }) => {
  const { itemDefinitions } = useDefinitions();
  const { closeTooltip } = useItemTooltipActions();
  const itemDefinition = itemDefinitions[item.itemHash];
  const tooltipTrigger = useItemTooltipTrigger(() => itemDefinition && ({
    item: itemDefinition,
    itemInstanceId: item.itemInstanceId,
    characterId,
    state: item.state,
    drawTransfert: true,
  }));
  if (!itemDefinition) return null;

  // Determine item rarity color
  let rarityColor = "border-gray-500";
  if (itemDefinition.inventory?.tierType) {
    switch (itemDefinition.inventory.tierType) {
      case 6: // Exotic
        rarityColor = "border-yellow-500";
        break;
      case 5: // Legendary
        rarityColor = "border-purple-500";
        break;
      case 4: // Rare
        rarityColor = "border-blue-500";
        break;
      case 3: // Uncommon
        rarityColor = "border-green-500";
        break;
      default:
        rarityColor = "border-gray-500";
    }
  }

  return (
    <div
      {...tooltipTrigger}
      aria-label={itemDefinition.displayProperties?.name}
      className="relative w-12 h-12 flex items-center justify-center cursor-pointer group"
      onDoubleClick={() => {
        closeTooltip();
        onCollect();
      }}
    >
      <div className={`absolute inset-0 border ${rarityColor} opacity-70`}></div>
      <div className="w-full h-full flex items-center justify-center">
        {itemDefinition?.displayProperties?.icon && (
          <Image
            height={56}
            width={56}
            src={`https://www.bungie.net${itemDefinition.displayProperties.icon}`}
            alt={itemDefinition.displayProperties.name || "Item"}
            className="w-10 h-10 object-contain"
          />
        )}
      </div>
      {item.quantity > 1 && (
        <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 px-1 rounded text-xs text-white">
          {item.quantity}
        </div>
      )}
    </div>
  );
};

interface PostmasterProps {
  characterId: string;
}

const Postmaster: React.FC<PostmasterProps> = ({
  characterId,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isCollectingAll, setIsCollectingAll] = useState(false);

  const { characterInventories } = useProfile()

  // Filter for postmaster items from the current character's inventory
  const postmasterItems = characterInventories[characterId]?.items.filter(
    (item) => item.bucketHash === BUCKETS.POSTMASTER
  ) || [];


  // Mark all items as seen when expanding
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const pull = usePullFromPostmaster();
  const collectItem = (item: Item) => pull(item, characterId);

  // Collect all postmaster items
  const collectAllItems = async () => {
    setIsCollectingAll(true);
    for (let i = 0; i < postmasterItems.length; i++) {
      await collectItem(postmasterItems[i]);
    }
    setIsCollectingAll(false);
  };

  const renderPostmasterItem = (item: Item) => (
    <PostmasterItem
      key={item.itemInstanceId || `${item.itemHash}-${item.quantity}`}
      item={item}
      characterId={characterId}
      onCollect={() => collectItem(item)}
    />
  );

  // Render empty slot
  const renderEmptySlot = (index: number) => {
    return (
      <div
        key={`empty-${index}`}
        className="relative w-12 h-12 flex items-center justify-center"
      >
        <div className="w-full h-full flex items-center justify-center opacity-20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H21V18H3V6Z" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M3 6L12 12L21 6" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    );
  };

  // Create grid of items with empty slots
  const createGridItems = () => {
    const maxSlots = 21; // Typical postmaster capacity 
    const gridItems = [];

    // Add actual items
    for (let i = 0; i < Math.min(postmasterItems.length, maxSlots); i++) {
      gridItems.push(renderPostmasterItem(postmasterItems[i]));
    }

    // Fill remaining slots
    for (let i = postmasterItems.length; i < maxSlots; i++) {
      gridItems.push(renderEmptySlot(i));
    }

    return gridItems;
  };

  return (
    <div className={`w-fit hover:shadow-lg overflow-hidden p-[2px] transition-all duration-150`}>
      <div
        className={`flex justify-between items-center p-1 cursor-pointer hover:backdrop-blur-sm hover:bg-gray-300/10 transition-all`}
        onClick={toggleCollapse}
      >
        <div className="flex items-center justify-center gap-2">
          <Image alt="postmaster" src={"/postmaster.png"} height={40} width={40} />
          {!isCollapsed && (
            <h3 className="text-white text-xs uppercase tracking-wider flex items-center">
              Postmaster
            </h3>
          )}
        </div>
        <div className="flex items-center">
          {!isCollapsed && postmasterItems.length > 1 && (
            <button
              className="mr-2 px-2 py-0.5 bg-yellow-400 text-black text-xs hover:bg-yellow-500 focus:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={e => { e.stopPropagation(); collectAllItems(); }}
              disabled={isCollectingAll}
            >
              {isCollectingAll ? 'Collecting...' : 'Collect All'}
            </button>
          )}
          <span className="text-white text-xs mr-2">
            {postmasterItems.length}/21
          </span>
          <svg
            className={`w-4 h-4 text-white transition-transform duration-150 ${isCollapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Arrow points right by default, rotates to point left on collapse */}
            <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {!isCollapsed && (
        <div className="w-[80%] h-[1px] bg-gray-400 opacity-30 mx-auto"></div>
      )}
      {!isCollapsed && (
        <div className="p-2 cursor-pointer hover:backdrop-blur-sm hover:bg-gray-300/10 transition-all">
          <div className="grid grid-cols-7 gap-1 ">
            {createGridItems()}
          </div>
        </div>
      )}

    </div>
  );
};

export default Postmaster; 