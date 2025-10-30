"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { transferItem } from "@/lib/bungie";
import Item from "./Item";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { ItemDefinition, useDefinitions } from "@/lib/hooks/useDefinitions";
import useAuth from "@/lib/hooks/useAuth";
import { Item as ItemInstance,ItemPerks, ItemStats, Perk, useProfile } from "@/lib/hooks/useProfile";

interface VaultProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  characterId: string;
  refresh: () => Promise<void>;
}

// Group types for categorizing items
const ITEM_TYPES = {
  WEAPONS: [
    1498876634, // Kinetic/Primary slot
    2465295065, // Energy slot
    953998645,  // Power/Heavy slot
  ],
  ARMOR: [
    3448274439, // Helmet
    3551918588, // Arms
    14239492,   // Chest
    20886954,   // Legs
    1585787867, // Class item
  ],
  MISC: [] // Will contain everything else
};

// Define element types mapping
const ELEMENT_TYPES = {
  kinetic: 1,
  arc: 2,
  solar: 3,
  void: 4,
  stasis: 6,
  strand: 7
};

// Element icon paths
const ELEMENT_ICONS = {
  kinetic: "kinetic.svg",
  arc: "arc.svg",
  solar: "solar.svg",
  void: "void.svg",
  stasis: "stasis.svg",
  strand: "strand.png"
};

interface ProcessedItem {
  item: ItemDefinition,
  itemInstance: ItemInstance,
  ornamentItem: ItemDefinition | undefined,
  perks: ItemPerks,
  stats: ItemStats
  state: number
}

const Vault: React.FC<VaultProps> = ({
  isOpen,
  setIsOpen,
  characterId,
  refresh
}) => {
  const [processedItems, setProcessedItems] = useState<{
    weapons: ProcessedItem[],
    armor: ProcessedItem[],
    misc: ProcessedItem[]
  }>({ weapons: [], armor: [], misc: [] });
  
  const [activeTab, setActiveTab] = useState<'weapons' | 'armor' | 'misc'>('weapons');
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string>('all');
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [weaponTypes, setWeaponTypes] = useState<{[key: string]: string}>({});
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [isElementDropdownOpen, setIsElementDropdownOpen] = useState<boolean>(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [vaultHeight, setVaultHeight] = useState<number>(50); // Default height in vh
  const [isResizing, setIsResizing] = useState<boolean>(false);
  
  const resizeRef = useRef<HTMLDivElement>(null);

  const { addNotification } = useNotifications();
  const { itemDefinitions, perksDefinitions } = useDefinitions()

  const { token } = useAuth()
  const { user, profileInventory, itemComponents } = useProfile()

  // Process inventory items into categories
  useEffect(() => {
    if (!profileInventory || profileInventory.length === 0) return;
    
    const weapons: ProcessedItem[] = [];
    const armor: ProcessedItem[] = [];
    const misc: ProcessedItem[] = [];
    const types: {[key: string]: string} = { all: 'All Weapons' };
    
    profileInventory.forEach((item) => {
      // Only process items in the vault (location 2)
      if (item.location !== 2) return;
      
      const itemDef = itemDefinitions[item.itemHash];
      if (!itemDef) return;
      
      const processedItem = {
        item: itemDef,
        itemInstance: item,
        ornamentItem: item.overrideStyleItemHash ? itemDefinitions[item.overrideStyleItemHash] : undefined,
        perks: itemComponents.perks[item.itemInstanceId],
        stats: itemComponents.stats[item.itemInstanceId],
        state: item.state,
      };
      
      // Handle items with equippingBlock (weapons and armor)
      if (item.itemInstanceId && itemDef.equippingBlock) {
        const slotHash = itemDef.equippingBlock.equipmentSlotTypeHash;
        
        if (ITEM_TYPES.WEAPONS.includes(slotHash)) {
          weapons.push(processedItem);
          
          // Track weapon types for filtering
          if (itemDef.itemTypeDisplayName) {
            const typeName = itemDef.itemTypeDisplayName;
            types[typeName] = typeName;
          }
        } else if (ITEM_TYPES.ARMOR.includes(slotHash)) {
          armor.push(processedItem);
        } else {
          misc.push(processedItem);
        }
      } else {
        // Items without itemInstanceId or equippingBlock (materials, consumables, etc.)
        misc.push(processedItem);
      }
    });
    
    setProcessedItems({
      weapons: weapons.sort((a, b) => a.item.displayProperties.name.localeCompare(b.item.displayProperties.name)),
      armor: armor.sort((a, b) => a.item.displayProperties.name.localeCompare(b.item.displayProperties.name)),
      misc: misc.sort((a, b) => a.item.displayProperties.name.localeCompare(b.item.displayProperties.name))
    });
    
    setWeaponTypes(types);
  }, []);
  
  // Handle item transfer from vault to character
  const handleTransfer = useCallback(async (item: any) => {
    try {
      // For materials and other stackable items
      if (item.item.inventory && item.item.inventory.stackUniqueLabel) {
        const quantity = item.itemInstance.quantity || 1;
        await transferItem(token as string, user.membershipType, item.item.hash, item.itemInstance.itemInstanceId || '0', characterId, false, quantity);
      } else {
        // For weapons, armor and other non-stackable items
        await transferItem(token as string, user.membershipType, item.item.hash, item.itemInstance.itemInstanceId, characterId, false);
      }
      
      addNotification(
        `Transferred ${item.item.displayProperties.name}`,
        "Item moved to your character",
        "success",
        `https://www.bungie.net${item.item.displayProperties.icon}`,
        3000
      );
      await refresh();
    } catch (err: any) {
      addNotification(
        `Error transferring ${item.item.displayProperties.name}`,
        err.message,
        "error",
        `https://www.bungie.net${item.item.displayProperties.icon}`,
        5000
      );
    }
  }, [characterId, addNotification, refresh]);
  
  // Handle drag start for items
  const handleDragStart = useCallback((event: React.DragEvent, item: any) => {
    event.dataTransfer.setData(
      "text/plain",
      "st:" + item.item.hash + ":" + (item.itemInstance.itemInstanceId || '0')
    );
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const filteredItems = useMemo(() => {
    let itemsToFilter = activeTab === 'weapons' 
        ? processedItems.weapons 
        : activeTab === 'armor' 
        ? processedItems.armor 
        : processedItems.misc;

    // Apply weapon type filter if we're on the weapons tab
    if (activeTab === 'weapons') {
        // Apply weapon type filter
        if (weaponTypeFilter !== 'all') {
            itemsToFilter = itemsToFilter.filter(item => 
                item.item.itemTypeDisplayName === weaponTypeFilter
            );
        }
        // Apply element filter
        if (elementFilter !== 'all') {
            const elementTypeValue = ELEMENT_TYPES[elementFilter as keyof typeof ELEMENT_TYPES];
            itemsToFilter = itemsToFilter.filter(item => 
                item.item.defaultDamageType === elementTypeValue
            );
        }
    }

    // Apply search filter if search query exists
    if (searchQuery.trim() === "") {
        return itemsToFilter;
    }

    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(' ').filter(term => term.length > 0);

    const filters = {
        perk: searchTerms.find(term => term.startsWith('perk:'))?.substring(5),
        tier: searchTerms.find(term => term.startsWith('tier:'))?.substring(5),
        is: searchTerms.find(term => term.startsWith('is:'))?.substring(3),
        name: searchTerms.filter(term => !term.includes(':')).join(' ')
    };

    return itemsToFilter.filter(item => {
        if (filters.name && !item.item.displayProperties.name.toLowerCase().includes(filters.name)) {
            return false;
        }

        if (filters.perk) {
            const perkQuery = filters.perk;
            const instanceId = item.itemInstance.itemInstanceId;
            const itemPerkData = instanceId ? itemComponents.perks[instanceId] : null;
            
            const hasMatchingPerk = itemPerkData?.perks.some((perk: any) => 
                perk.visible && 
                perk.isActive && 
                perksDefinitions[perk.perkHash]?.displayProperties?.name?.toLowerCase().includes(perkQuery)
            );

            if (!hasMatchingPerk) {
                // Fallback to checking item name for perk as a convenience
                if (!item.item.displayProperties.name.toLowerCase().includes(perkQuery)) {
                    return false;
                }
            }
        }

        if (filters.tier) {
            const tierQuery = parseInt(filters.tier, 10);
            if (isNaN(tierQuery) || itemComponents.instances[item.itemInstance.itemInstanceId]?.gearTier !== tierQuery) {
                return false;
            }
        }

        if (filters.is) {
            const q = filters.is;
            if (q === "featured" && !item.item.isFeaturedItem) {
                return false;
            }
            if (q === "unfeatured" && item.item.isFeaturedItem) {
                return false;
            }
            if(q === "exotic" && item.item.inventory.tierType !== 6){
              return false;
            }
        }

        return true;
    });

}, [activeTab, processedItems, weaponTypeFilter, elementFilter, searchQuery, itemComponents, perksDefinitions]);
  
  // Render items using flex instead of grid
  const renderItems = useCallback((items: any[]) => {
    return (
      <div 
        className="flex flex-wrap content-start"
        style={{ 
          padding: 0, 
          margin: 0,
          width: '100%',
          gap: 0
        }}
      >
        {items.length > 0 ? (
          items.map((item, index) => (
            <div 
              key={index} 
              className="cursor-pointer hover:z-10 hover:scale-105 transition-transform relative"
              style={{ 
                padding: '1px 0 1px 1px',
                margin: 0,
                boxSizing: 'border-box',
                width: 'calc(100% / 8)',
                maxWidth: '64px'
              }}
              onDoubleClick={() => handleTransfer(item)}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
            >
              {/* Show quantity for stackable items */}
              {item.itemInstance.quantity > 1 && (
                <div className="absolute bottom-0 right-0 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                  {item.itemInstance.quantity}
                </div>
              )}
              <Item 
                itemHash={item.item.hash}
                itemInstanceId={item.itemInstance.itemInstanceId}
                ornamentItem={item.ornamentItem}
                state={item.state}
                perks={item.perks || {}}
                stats={item.stats || {}}
                characterId={characterId}
                armor={item.item.equippingBlock ? ITEM_TYPES.ARMOR.includes(item.item.equippingBlock?.equipmentSlotTypeHash) : false}
                quantity={item.itemInstance.quantity || 1}
              />
            </div>
          ))
        ) : (
          <div className="w-full text-center p-4">
            <p className="text-gray-400">No items match the current filter</p>
          </div>
        )}
      </div>
    );
  }, [handleTransfer, handleDragStart, characterId]);
  
  // Reset filters when changing tabs
  useEffect(() => {
    if (activeTab !== 'weapons') {
      setWeaponTypeFilter('all');
      setElementFilter('all');
    }
  }, [activeTab]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.weapon-type-filter')) {
        setIsFilterDropdownOpen(false);
      }
      if (!target.closest('.element-filter')) {
        setIsElementDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Prevent scrollbar blinking during animation
  useEffect(() => {
    const handleScrollbarDuringAnimation = () => {
      if (isOpen || isAnimatingOut) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
    
    handleScrollbarDuringAnimation();
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isAnimatingOut]);
  
  // Close with animation
  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimatingOut(false);
    }, 300); // Match the animation duration
  }, [setIsOpen]);
  
  // Load saved height from localStorage or use default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHeight = localStorage.getItem('vaultHeight');
      if (savedHeight) {
        setVaultHeight(Number(savedHeight));
      }
    }
  }, []);
  
  // Handle resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate height based on mouse position
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      
      // Convert to vh units (min 25vh, max 80vh)
      const newHeightVh = Math.min(Math.max(25, (windowHeight - mouseY) / windowHeight * 100), 80);
      setVaultHeight(newHeightVh);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('resizing');
      
      // Save height to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('vaultHeight', vaultHeight.toString());
      }
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('resizing');
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [isResizing, vaultHeight]);
  
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
      style={{
        animation: isAnimatingOut ? 'slideDown 0.3s ease-out forwards' : 'slideUp 0.3s ease-out forwards',
        height: `${vaultHeight}vh`,
        background: 'linear-gradient(to bottom, rgba(15, 15, 25, 0.98), rgba(25, 25, 35, 0.98))',
        borderTop: '1px solid #7e57c2',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Resize Handle */}
      <div 
        ref={resizeRef}
        className="absolute top-0 left-0 right-0 h-4 bg-transparent cursor-ns-resize z-10 transform -translate-y-full hover:opacity-100 group"
        onMouseDown={startResizing}
      >
        <div className="w-24 h-1.5 bg-purple-700 rounded-full opacity-40 group-hover:opacity-100 transition-opacity mx-auto flex items-center justify-center">
          <div className="w-10 h-0.5 bg-white opacity-60 rounded-full mt-0.5"></div>
        </div>
        
        {/* Height indicator when resizing */}
        {isResizing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-purple-800 text-white text-xs py-1 px-2 rounded shadow-lg">
            {Math.round(vaultHeight)}%
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center border-b border-gray-700 bg-[rgba(30,30,40,0.5)] py-1">
        <div className="flex items-center gap-1 ml-3">
          <img 
            src="./vault.svg" 
            className="h-5 w-5 mr-1" 
            alt="Vault" 
          />
          <h2 className="text-base font-medium">Vault</h2>
        </div>
        <div className="flex">
          <button 
            className={`px-3 py-0.5 mx-0.5 rounded transition-colors text-sm ${activeTab === 'weapons' ? 'bg-purple-800 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setActiveTab('weapons')}
          >
            Weapons ({processedItems.weapons.length})
          </button>
          <button 
            className={`px-3 py-0.5 mx-0.5 rounded transition-colors text-sm ${activeTab === 'armor' ? 'bg-purple-800 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setActiveTab('armor')}
          >
            Armor ({processedItems.armor.length})
          </button>
          <button 
            className={`px-3 py-0.5 mx-0.5 rounded transition-colors text-sm ${activeTab === 'misc' ? 'bg-purple-800 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setActiveTab('misc')}
          >
            Misc ({processedItems.misc.length})
          </button>
        </div>
        <button 
          className="text-gray-400 hover:text-white transition-colors mr-3"
          onClick={handleClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center p-1 bg-[rgba(25,25,35,0.5)] border-b border-gray-700">
        <div className="flex-1"></div>
        
        {activeTab === 'weapons' && (
          <>
            <div className="relative weapon-type-filter mr-2">
              <button
                className="flex items-center gap-1 bg-[rgba(40,40,60,0.8)] px-3 py-1 rounded text-sm text-gray-200 hover:bg-[rgba(50,50,70,0.9)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFilterDropdownOpen(!isFilterDropdownOpen);
                  setIsElementDropdownOpen(false);
                }}
              >
                <span>Type: {weaponTypeFilter === 'all' ? 'All Weapons' : weaponTypeFilter}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isFilterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-[rgba(30,30,40,0.95)] border border-gray-700 rounded shadow-lg z-10 max-h-64 overflow-y-auto">
                  {Object.entries(weaponTypes).map(([type, label]) => (
                    <button
                      key={type}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-[rgba(126,87,194,0.3)] ${weaponTypeFilter === type ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                      onClick={() => {
                        setWeaponTypeFilter(type);
                        setIsFilterDropdownOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative element-filter">
              <button
                className="flex items-center gap-1 bg-[rgba(40,40,60,0.8)] px-3 py-1 rounded text-sm text-gray-200 hover:bg-[rgba(50,50,70,0.9)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsElementDropdownOpen(!isElementDropdownOpen);
                  setIsFilterDropdownOpen(false);
                }}
              >
                {elementFilter !== 'all' && (
                  <img 
                    src={ELEMENT_ICONS[elementFilter as keyof typeof ELEMENT_ICONS]} 
                    className="h-4 w-4 mr-1" 
                    alt={elementFilter}
                  />
                )}
                <span>Element: {elementFilter === 'all' ? 'All' : elementFilter.charAt(0).toUpperCase() + elementFilter.slice(1)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isElementDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-[rgba(30,30,40,0.95)] border border-gray-700 rounded shadow-lg z-10">
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-[rgba(126,87,194,0.3)] ${elementFilter === 'all' ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                    onClick={() => {
                      setElementFilter('all');
                      setIsElementDropdownOpen(false);
                    }}
                  >
                    All
                  </button>
                  {Object.keys(ELEMENT_TYPES).map((element) => (
                    <button
                      key={element}
                      className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-[rgba(126,87,194,0.3)] ${elementFilter === element ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                      onClick={() => {
                        setElementFilter(element);
                        setIsElementDropdownOpen(false);
                      }}
                    >
                      <img 
                        src={ELEMENT_ICONS[element as keyof typeof ELEMENT_ICONS]} 
                        className="h-4 w-4 mr-2" 
                        alt={element}
                      />
                      {element.charAt(0).toUpperCase() + element.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        <div className="relative mx-3 w-56">
          <input
            type="text"
            placeholder="Search items, perk:name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[rgba(40,40,60,0.8)] text-gray-200 pl-9 pr-3 py-1 rounded text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              onClick={() => setSearchQuery("")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden vault-items bg-[rgba(20,20,30,0.8)]" style={{ padding: 0, margin: 0 }}>
        {filteredItems.length > 0 ? (
          renderItems(filteredItems)
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No items found in vault</p>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100%);
          }
        }
        
        /* Style for when resizing is active */
        body.resizing {
          cursor: ns-resize;
          user-select: none;
        }
        
        /* Apply scrollbar styles to both vault items and dropdowns */
        .vault-items::-webkit-scrollbar,
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          position: absolute;
          right: 0;
        }
        
        .vault-items::-webkit-scrollbar-track,
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(20, 20, 30, 0.5);
        }
        
        .vault-items::-webkit-scrollbar-thumb,
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(126, 87, 194, 0.5);
          border-radius: 2px;
          transition: background 0.3s ease;
        }
        
        .vault-items::-webkit-scrollbar-thumb:hover,
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(126, 87, 194, 0.8);
        }
        
        .vault-items,
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 87, 194, 0.5) rgba(20, 20, 30, 0.5);
        }
      `}</style>
    </div>
  );
};

export default Vault; 