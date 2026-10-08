"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Item from "./Item";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import useTransferItem from "@/lib/hooks/useTransferItem";
import { useProfile } from "@/lib/hooks/useProfile";
import { DamageType, getDamageType, getDamageTypeIcon, DAMAGE_TYPES_LIST } from "@/lib/helpers/damage-type";
import Image from "next/image";
import { ItemDefinition, Item as ItemInstance, ItemPerks, ItemStats } from "@/lib/types";
import { ARMOR_SLOTS, WEAPON_SLOTS } from "@/lib/constants";
import { findDupes, isEmptySearch, matchesSearch, parseSearch } from "@/lib/search";

interface VaultProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  characterId: string;
}



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
}) => {
  const [activeTab, setActiveTab] = useState<'weapons' | 'armor' | 'misc'>('weapons');
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string>('all');
  const [elementFilter, setElementFilter] = useState<DamageType | 'all'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [isElementDropdownOpen, setIsElementDropdownOpen] = useState<boolean>(false);
  const [showDuplicates, setShowDuplicates] = useState<boolean>(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Height in vh, as last resized; the vault only renders on the client, after login
  const [vaultHeight, setVaultHeight] = useState<number>(() => Number(localStorage.getItem('vaultHeight')) || 50);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const resizeRef = useRef<HTMLDivElement>(null);

  const { itemDefinitions, perksDefinitions } = useDefinitions()

  const { profileInventory, itemComponents } = useProfile()
  const { transfer } = useTransferItem()

  // Vault items sorted by category, and the weapon types found for the type filter
  const { processedItems, weaponTypes } = useMemo(() => {
    // An empty vault must still clear the grid, so don't return early here
    const weapons: ProcessedItem[] = [];
    const armor: ProcessedItem[] = [];
    const misc: ProcessedItem[] = [];
    const types: { [key: string]: string } = { all: 'All Weapons' };

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

        if (WEAPON_SLOTS.includes(slotHash)) {
          weapons.push(processedItem);

          // Track weapon types for filtering
          if (itemDef.itemTypeDisplayName) {
            const typeName = itemDef.itemTypeDisplayName;
            types[typeName] = typeName;
          }
        } else if (ARMOR_SLOTS.includes(slotHash)) {
          armor.push(processedItem);
        } else {
          misc.push(processedItem);
        }
      } else {
        // Items without itemInstanceId or equippingBlock (materials, consumables, etc.)
        misc.push(processedItem);
      }
    });

    const byName = (a: ProcessedItem, b: ProcessedItem) => a.item.displayProperties.name.localeCompare(b.item.displayProperties.name);
    return {
      processedItems: { weapons: weapons.sort(byName), armor: armor.sort(byName), misc: misc.sort(byName) },
      weaponTypes: types,
    };
  }, [profileInventory, itemDefinitions, itemComponents]);

  // Handle item transfer from vault to character
  const handleTransfer = useCallback((item: ProcessedItem) => {
    const instanceId = item.itemInstance.itemInstanceId;
    transfer({
      itemHash: item.item.hash,
      itemInstanceId: instanceId,
      toId: characterId,
      fromId: "vault",
      // Stacks (materials, consumables) move as a whole
      quantity: instanceId ? 1 : item.itemInstance.quantity || 1,
    });
  }, [characterId, transfer]);

  // Handle drag start for items
  const handleDragStart = useCallback((event: React.DragEvent, item: ProcessedItem) => {
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

    // Apply duplicate filter
    if (showDuplicates) {
      const hashCounts = new Map<number, number>();
      itemsToFilter.forEach(item => {
        const hash = item.item.hash;
        hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
      });
      itemsToFilter = itemsToFilter.filter(item => (hashCounts.get(item.item.hash) || 0) > 1);
    }

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
        itemsToFilter = itemsToFilter.filter(item =>
          item.item.defaultDamageType === elementFilter
        );
      }
    }

    // Apply search filter if search query exists
    const search = parseSearch(searchQuery);
    if (isEmptySearch(search)) return itemsToFilter;

    const searchable = (item: ProcessedItem) => ({ item: item.itemInstance, definition: item.item });
    const allItems = [...processedItems.weapons, ...processedItems.armor, ...processedItems.misc].map(searchable);
    const context = { itemComponents, perksDefinitions, dupes: findDupes(allItems) };
    return itemsToFilter.filter((item) => matchesSearch(search, searchable(item), context));

  }, [activeTab, processedItems, weaponTypeFilter, elementFilter, searchQuery, itemComponents, perksDefinitions, showDuplicates]);

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

  // The weapon filters only apply to the weapons tab: leaving it resets them
  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab !== 'weapons') {
      setWeaponTypeFilter('all');
      setElementFilter('all');
    }
  };

  // Close with animation
  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimatingOut(false);
    }, 300); // Match the animation duration
  }, [setIsOpen]);

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
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#1a1a1a]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out"
      style={{
        height: `${vaultHeight}vh`,
        animation: isAnimatingOut ? 'slideDown 0.3s ease-out forwards' : 'slideUp 0.3s ease-out forwards',
      }}
    >
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="absolute top-0 left-0 right-0 h-3 bg-transparent cursor-ns-resize z-10 hover:bg-white/5 group flex items-center justify-center -translate-y-1/2"
        onMouseDown={startResizing}
      >
        <div className="w-16 h-1 bg-white/20 rounded-full group-hover:bg-purple-500/50 transition-colors shadow-sm"></div>

        {/* Height indicator when resizing */}
        {isResizing && (
          <div className="absolute bottom-full mb-2 bg-black/80 text-white text-xs py-1 px-2 rounded-lg backdrop-blur-sm border border-white/10">
            {Math.round(vaultHeight)}%
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 p-3 select-none">
        <div className="flex items-center gap-3 ml-2">
          <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Image src="./vault.svg" className="h-5 w-5 opacity-80" alt="Vault" height={20} width={20} />
          </div>
          <h2 className="text-lg font-semibold text-white tracking-wide">Vault</h2>
        </div>

        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          {(['weapons', 'armor', 'misc'] as const).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              onClick={() => changeTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`ml-2 text-xs ${activeTab === tab ? 'text-purple-200' : 'text-gray-600'}`}>
                {processedItems[tab].length}
              </span>
            </button>
          ))}
        </div>

        <button
          className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 mr-1"
          onClick={handleClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center p-3 border-b border-white/5 bg-black/10 gap-3">
        <div className="flex-1"></div>

        {activeTab === 'weapons' && (
          <>
            {/* Type Filter */}
            <div className="relative weapon-type-filter">
              <button
                className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFilterDropdownOpen(!isFilterDropdownOpen);
                  setIsElementDropdownOpen(false);
                }}
              >
                <span className="text-gray-500">Type:</span>
                <span className="font-medium">{weaponTypeFilter === 'all' ? 'All' : weaponTypeFilter}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto custom-scrollbar">
                  {Object.entries(weaponTypes).map(([type, label]) => (
                    <button
                      key={type}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${weaponTypeFilter === type
                        ? 'bg-purple-500/10 text-purple-300'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
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

            {/* Element Filter */}
            <div className="relative element-filter">
              <button
                className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsElementDropdownOpen(!isElementDropdownOpen);
                  setIsFilterDropdownOpen(false);
                }}
              >
                {elementFilter !== 'all' && (
                  <Image
                    height={16}
                    width={16}
                    src={getDamageTypeIcon(elementFilter)}
                    className="h-4 w-4"
                    alt={getDamageType(elementFilter)}
                  />
                )}
                <span className="text-gray-500">Element:</span>
                <span className="font-medium">{elementFilter === 'all' ? 'All' : getDamageType(elementFilter)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform ${isElementDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isElementDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20">
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${elementFilter === 'all'
                      ? 'bg-purple-500/10 text-purple-300'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    onClick={() => {
                      setElementFilter('all');
                      setIsElementDropdownOpen(false);
                    }}
                  >
                    All
                  </button>
                  {DAMAGE_TYPES_LIST.map((type) => (
                    <button
                      key={type}
                      className={`flex items-center w-full text-left px-4 py-2 text-sm transition-colors ${elementFilter === type
                        ? 'bg-purple-500/10 text-purple-300'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      onClick={() => {
                        setElementFilter(type);
                        setIsElementDropdownOpen(false);
                      }}
                    >
                      <Image
                        src={getDamageTypeIcon(type)}
                        className="h-4 w-4 mr-2"
                        alt={getDamageType(type)}
                        height={16}
                        width={16}
                      />
                      {getDamageType(type)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Duplicates Toggle */}
        <button
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${showDuplicates
            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            : 'bg-black/20 text-gray-400 border-white/5 hover:text-white hover:bg-white/5'
            }`}
          onClick={() => setShowDuplicates(!showDuplicates)}
          title="Show Duplicates"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Duplicates</span>
        </button>

        {/* Search Input */}
        <div className="relative w-64 group">
          <input
            type="text"
            placeholder="Search items, perk:name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 text-white pl-10 pr-8 py-1.5 rounded-lg text-sm border border-white/5 focus:outline-none focus:border-purple-500/50 focus:bg-black/40 transition-all placeholder-gray-600"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white p-0.5 rounded-full hover:bg-white/10"
              onClick={() => setSearchQuery("")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-hidden vault-items bg-black/20" style={{ padding: '8px' }}>
        <div className="h-full overflow-y-auto custom-scrollbar p-2">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>No items match the current filter</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center content-start">
              {filteredItems.map((item, index) => (
                <div
                  key={item.itemInstance.itemInstanceId || `${item.item.hash}-${index}`}
                  className="aspect-square cursor-pointer hover:z-10 hover:scale-110 transition-all duration-200 relative group shadow-lg hover:shadow-purple-500/20 border border-transparent hover:border-white/20"
                  style={{ width: 56, height: 56 }}
                  onDoubleClick={() => handleTransfer(item)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                >
                  <div className="w-full h-full flex items-center justify-center bg-black/20">
                    <Item
                      itemHash={item.item.hash}
                      itemInstanceId={item.itemInstance.itemInstanceId}
                      ornamentItem={item.ornamentItem}
                      state={item.state}
                      perks={item.perks || {}}
                      stats={item.stats || {}}
                      characterId={characterId}
                      quantity={item.itemInstance.quantity || 1}
                      size={56}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        
        body.resizing {
          cursor: ns-resize;
          user-select: none;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div >
  );
};

export default Vault;