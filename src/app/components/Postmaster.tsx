import React, { useState } from "react";
import { pullFromPostmaster, transferItem } from "@/lib/bungie";
import { useNotifications } from "./NotificationsProvider";

interface PostmasterProps {
  items: any[];
  db: any;
  token: string;
  membershipType: number;
  characterId: string;
  refresh: () => Promise<void>;
}

const Postmaster: React.FC<PostmasterProps> = ({
  items,
  db,
  token,
  membershipType,
  characterId,
  refresh,
}) => {
  const { addNotification } = useNotifications();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [seenItems, setSeenItems] = useState<Set<string>>(new Set());

  // Filter for postmaster items - location 4 and/or bucketHash 215593132
  const postmasterItems = items.filter((item) => {
    return item.location === 4 || item.bucketHash === 215593132;
  });

  // No postmaster items
  if (postmasterItems.length === 0) {
    return null;
  }

  // Mark all items as seen when expanding
  const toggleCollapse = () => {
    if (isCollapsed) {
      // Mark all current items as seen when expanding
      const newSeen = new Set(seenItems);
      postmasterItems.forEach(item => {
        newSeen.add(item.itemInstanceId || `${item.itemHash}-${item.quantity}`);
      });
      setSeenItems(newSeen);
    }
    setIsCollapsed(!isCollapsed);
  };

  // Collect from postmaster to character inventory
  const collectItem = async (item: any) => {
    try {

      await pullFromPostmaster(
        token,
        membershipType,
        characterId,
        item.itemHash,
        item.itemInstanceId,
        1        
      )
      const itemDef = db[item.itemHash];
      const itemName = itemDef?.displayProperties?.name || "Item";
      const itemIcon = itemDef?.displayProperties?.icon || "";
      
      addNotification(
        `Collected ${itemName}`,
        "",
        "success",
        `https://www.bungie.net${itemIcon}`,
        5000
      );
      
      await refresh();
    } catch (err: any) {
      const itemDef = db[item.itemHash];
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

  // Render a postmaster item
  const renderPostmasterItem = (item: any) => {
    const itemDefinition = db[item.itemHash];
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
        onClick={() => collectItem(item)}
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
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 p-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          Click to collect
        </div>
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
            <path d="M3 6H21V18H3V6Z" stroke="#888" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M3 6L12 12L21 6" stroke="#888" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
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
    <div className={`${isCollapsed ? 'w-[200px]' : 'w-fit'} bg-black bg-opacity-80 rounded shadow-lg overflow-hidden`}>
      <div 
        className="flex justify-between items-center border-b border-gray-600 p-2 cursor-pointer hover:bg-gray-800"
        onClick={toggleCollapse}
      >
        <h3 className="text-white text-xs uppercase tracking-wider flex items-center">
          Postmaster
        </h3>
        <div className="flex items-center">
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
        <div className="p-2">
          <div className="grid grid-cols-7 gap-1">
            {createGridItems()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Postmaster; 