import React, { useState } from "react";
import { pullFromPostmaster, transferItem } from "@/lib/bungie";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { Item, useProfile } from "@/lib/hooks/useProfile";
import useAuth from "@/lib/hooks/useAuth";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";

interface PostmasterProps {
  characterId: string;
  refresh: () => Promise<void>;
}

const Postmaster: React.FC<PostmasterProps> = ({
  characterId,
  refresh,
}) => {
  const { addNotification } = useNotifications();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isCollectingAll, setIsCollectingAll] = useState(false);

  const { token } = useAuth()
  const { itemDefinitions } = useDefinitions()
  const { user, characterInventories } = useProfile()
  const { showTooltip, tooltipState } = useItemTooltip()

  // Filter for postmaster items from the current character's inventory
  const postmasterItems = characterInventories[characterId]?.items.filter(
    (item) => item.bucketHash === 215593132
  ) || [];


  // Mark all items as seen when expanding
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Collect from postmaster to character inventory
  const collectItem = async (item: Item, needRefresh?: boolean) => {
    try {

      await pullFromPostmaster(
        token as string,
        user.membershipType,
        characterId,
        item.itemHash,
        item.itemInstanceId,
        item.quantity ?? 1
      )
      const itemDef = itemDefinitions[item.itemHash];
      const itemName = itemDef?.displayProperties?.name || "Item";
      const itemIcon = itemDef?.displayProperties?.icon || "";
      
      addNotification(
        `Collected ${itemName}`,
        "",
        "success",
        `https://www.bungie.net${itemIcon}`,
        5000
      );
      
      if(needRefresh){
        await refresh();
      }
    } catch (err: any) {
      const itemDef = itemDefinitions[item.itemHash];
      const itemName = itemDef?.displayProperties?.name || "Item";
      const itemIcon = itemDef?.displayProperties?.icon || "";
      
      addNotification(
        `Error collecting ${itemName}`,
        err.message,
        "error",
        `https://www.bungie.net${itemIcon}`,
        5000
      );
    }
  };

  // Collect all postmaster items
  const collectAllItems = async () => {
    setIsCollectingAll(true);
    for (let i = 0; i < postmasterItems.length; i++) {
      const isLast = i === postmasterItems.length - 1;
      await collectItem(postmasterItems[i], isLast);
    }
    setIsCollectingAll(false);
  };

  // Render a postmaster item
  const renderPostmasterItem = (item: any) => {
    const itemDefinition = itemDefinitions[item.itemHash];
    if (!itemDefinition) return null;

    // Determine item rarity color
    let rarityColor = "gray";
    if (itemDefinition.inventory?.tierType) {
      switch (itemDefinition.inventory.tierType) {
        case 6: // Exotic
          rarityColor = "yellow-500";
          break;
        case 5: // Legendary
          rarityColor = "purple-500";
          break;
        case 4: // Rare
          rarityColor = "blue-500";
          break;
        case 3: // Uncommon
          rarityColor = "green-500";
          break;
        default:
          rarityColor = "gray-500";
      }
    }

    return (
      <div
        key={item.itemInstanceId || `${item.itemHash}-${item.quantity}`}
        className="relative w-12 h-12 flex items-center justify-center cursor-pointer group"
        onDoubleClick={() => collectItem(item)}
      >
        <div className={`absolute inset-0 border border-${rarityColor} opacity-70`}></div>
        <div className="w-full h-full flex items-center justify-center">
          {itemDefinition?.displayProperties?.icon && (
            <img
              src={`https://www.bungie.net${itemDefinition.displayProperties.icon}`}
              alt={itemDefinition.displayProperties.name || "Item"}
              className="w-10 h-10 object-contain"
              title={itemDefinition.displayProperties.name}
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

  // Render empty slot
  const renderEmptySlot = (index: number) => {
    return (
      <div
        key={`empty-${index}`}
        className="relative w-12 h-12 flex items-center justify-center"
      >
        <div className="w-full h-full flex items-center justify-center opacity-20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H21V18H3V6Z" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M3 6L12 12L21 6" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
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
    <div className={`${isCollapsed ? 'w-[200px]' : 'w-fit'} shadow-lg overflow-hidden p-[2px] border-2 border-[rgb(138,138,138)]`}>
      <div 
        className="flex justify-between items-center bg-[#5a5a5a] bg-opacity-45 p-2 cursor-pointer backdrop-blur-sm hover:bg-opacity-30 transition-all"
        onClick={toggleCollapse}
      >
        <h3 className="text-white text-xs uppercase tracking-wider flex items-center">
          Postmaster
        </h3>
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
          <span className="text-gray-400 text-xs mr-2">
            {postmasterItems.length}/21
          </span>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-2 bg-[#5a5a5a] bg-opacity-45 p-2 cursor-pointer backdrop-blur-sm hover:bg-opacity-30 transition-all">
          <div className="grid grid-cols-7 gap-1 ">
            {createGridItems()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Postmaster; 