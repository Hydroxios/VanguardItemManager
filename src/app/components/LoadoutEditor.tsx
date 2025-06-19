"use client";

import { useState, useEffect } from "react";
import { createLoadout, updateLoadout } from "@/lib/bungie";
import { clearLoadout } from "@/lib/api/bungieApiClient";
import { useNotifications } from "./NotificationsProvider";

interface LoadoutEditorProps {
  isOpen: boolean;
  onClose: () => void;
  loadout?: {
    loadoutIndex: number;
    name: string;
    iconHash: number;
    colorHash: number;
    items: any[];
  };
  loadoutIconDefinition: any;
  loadoutsColorDefinition: any;
  token: string;
  membershipType: number;
  characterId: string;
  itemInstances: any;
  equipment: any;
  inventory: any;
  itemDefinitions?: any;
  refreshChar: () => Promise<void>;
}

const LoadoutEditor: React.FC<LoadoutEditorProps> = ({
  isOpen,
  onClose,
  loadout,
  loadoutIconDefinition,
  loadoutsColorDefinition,
  token,
  membershipType,
  characterId,
  itemInstances,
  equipment,
  inventory,
  itemDefinitions = {},
  refreshChar,
}) => {
  const [name, setName] = useState<string>("");
  const [selectedIconHash, setSelectedIconHash] = useState<number | null>(null);
  const [selectedColorHash, setSelectedColorHash] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ itemInstanceId: string, plugItemHashes: number[] }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showIconSelector, setShowIconSelector] = useState<boolean>(false);
  const [showColorSelector, setShowColorSelector] = useState<boolean>(false);
  
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (loadout) {
      setName(loadout.name);
      setSelectedIconHash(loadout.iconHash);
      setSelectedColorHash(loadout.colorHash);
      setSelectedItems(loadout.items.map(item => ({
        itemInstanceId: item.itemInstanceId,
        plugItemHashes: item.plugItemHashes || []
      })));
    } else {
      setName("New Loadout");
      setSelectedIconHash(Object.keys(loadoutIconDefinition)[0] ? parseInt(Object.keys(loadoutIconDefinition)[0]) : null);
      setSelectedColorHash(Object.keys(loadoutsColorDefinition)[0] ? parseInt(Object.keys(loadoutsColorDefinition)[0]) : null);
      
      // Initialize with equipped items
      const initialItems: { itemInstanceId: string, plugItemHashes: number[] }[] = [];
      
      if (equipment) {
        // Add equipped weapons and armor
        for (const key in equipment) {
          if (equipment[key].current && equipment[key].current.itemInstance) {
            initialItems.push({
              itemInstanceId: equipment[key].current.itemInstance.itemInstanceId,
              plugItemHashes: []  // Default empty plugs array
            });
          }
        }
      }
      
      setSelectedItems(initialItems);
    }
  }, [loadout, equipment, loadoutIconDefinition, loadoutsColorDefinition]);

  const handleSubmit = async () => {
    if (!selectedIconHash || !selectedColorHash) {
      addNotification("Error", "Please select an icon and color", "error", "", 5000);
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (loadout) {
        // Update existing loadout
        await updateLoadout(
          token,
          membershipType,
          characterId,
          loadout.loadoutIndex,
          name,
          selectedIconHash,
          selectedColorHash,
          selectedItems
        );
        addNotification("Success", "Loadout updated successfully", "success", "", 5000);
      } else {
        // Create new loadout
        await createLoadout(
          token,
          membershipType,
          characterId,
          name,
          selectedIconHash,
          selectedColorHash,
          selectedItems
        );
        addNotification("Success", "Loadout created successfully", "success", "", 5000);
      }
      
      await refreshChar();
      onClose();
    } catch (error: any) {
      addNotification("Error", error.message || "Failed to save loadout", "error", "", 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearLoadout = async () => {
    if (!loadout) return; // Only works on existing loadouts
    
    try {
      setIsSubmitting(true);
      
      await clearLoadout(
        token,
        membershipType,
        characterId,
        loadout.loadoutIndex
      );
      
      addNotification("Success", "Loadout items cleared successfully", "success", "", 5000);
      await refreshChar();
      onClose();
    } catch (error: any) {
      addNotification("Error", error.message || "Failed to clear loadout", "error", "", 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemSelect = (itemInstanceId: string) => {
    const itemExists = selectedItems.some(item => item.itemInstanceId === itemInstanceId);
    
    if (itemExists) {
      // Remove item if already selected
      setSelectedItems(prev => prev.filter(item => item.itemInstanceId !== itemInstanceId));
    } else {
      // Add item
      setSelectedItems(prev => [
        ...prev,
        { itemInstanceId, plugItemHashes: [] }
      ]);
    }
  };

  // Helper function to get item details
  const getItemDetails = (itemInstanceId: string) => {
    if (!itemInstances || !itemInstanceId) return null;
    
    const instance = itemInstances[itemInstanceId];
    if (!instance) return null;
    
    // Find the actual item data either in equipment or inventory
    let itemData = null;
    
    if (equipment) {
      for (const key in equipment) {
        if (equipment[key].current && 
            equipment[key].current.itemInstance && 
            equipment[key].current.itemInstance.itemInstanceId === itemInstanceId) {
          itemData = equipment[key].current;
          break;
        }
      }
    }
    
    if (!itemData && inventory) {
      for (const key in inventory) {
        if (inventory[key].items) {
          const foundItem = inventory[key].items.find((i: any) => 
            i.itemInstance && i.itemInstance.itemInstanceId === itemInstanceId
          );
          if (foundItem) {
            itemData = foundItem;
            break;
          }
        }
      }
    }
    
    return {
      instance,
      itemData
    };
  };

  // Helper function to get item definition by hash
  const getItemDefinition = (itemHash: number) => {
    if (!itemDefinitions || !itemHash) return null;
    return itemDefinitions[itemHash] || null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
      <div className="bg-[#1a1a2e] border border-[#7e57c2] shadow-xl p-5 rounded w-[700px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <h2 className="text-white text-xl font-semibold">
            {loadout ? "Edit Loadout" : "Create New Loadout"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Loadout Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#2a2a40] text-white border border-gray-700 px-3 py-2 rounded"
            placeholder="Enter loadout name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-300 mb-2">Icon</label>
            <div className="flex items-center gap-2">
              <div 
                className="w-12 h-12 bg-[#2a2a40] border border-gray-700 rounded flex items-center justify-center cursor-pointer"
                onClick={() => setShowIconSelector(!showIconSelector)}
              >
                {selectedIconHash && loadoutIconDefinition[selectedIconHash] ? (
                  <img 
                    src={`https://bungie.net${loadoutIconDefinition[selectedIconHash].iconImagePath}`} 
                    alt="Icon" 
                    width={40} 
                    height={40} 
                  />
                ) : (
                  <span className="text-gray-400">+</span>
                )}
              </div>
              <button 
                onClick={() => setShowIconSelector(!showIconSelector)}
                className="text-[#7e57c2] hover:text-purple-400"
              >
                {showIconSelector ? "Hide Icons" : "Select Icon"}
              </button>
            </div>
            
            {showIconSelector && (
              <div className="mt-2 grid grid-cols-6 gap-2 p-2 bg-[#222236] border border-gray-700 rounded max-h-[200px] overflow-y-auto">
                {Object.entries(loadoutIconDefinition).map(([hash, icon]: [string, any]) => (
                  <div 
                    key={hash}
                    className={`w-10 h-10 rounded cursor-pointer ${selectedIconHash === parseInt(hash) ? 'border-2 border-[#7e57c2]' : 'border border-gray-700'}`}
                    onClick={() => setSelectedIconHash(parseInt(hash))}
                  >
                    <img 
                      src={`https://bungie.net${icon.iconImagePath}`}
                      alt={`Icon ${hash}`}
                      width={40}
                      height={40}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Color</label>
            <div className="flex items-center gap-2">
              <div 
                className="w-12 h-12 bg-[#2a2a40] border border-gray-700 rounded flex items-center justify-center cursor-pointer"
                onClick={() => setShowColorSelector(!showColorSelector)}
              >
                {selectedColorHash && loadoutsColorDefinition[selectedColorHash] ? (
                  <img 
                    src={`https://bungie.net${loadoutsColorDefinition[selectedColorHash].colorImagePath}`} 
                    alt="Color" 
                    width={40} 
                    height={40} 
                  />
                ) : (
                  <span className="text-gray-400">+</span>
                )}
              </div>
              <button 
                onClick={() => setShowColorSelector(!showColorSelector)}
                className="text-[#7e57c2] hover:text-purple-400"
              >
                {showColorSelector ? "Hide Colors" : "Select Color"}
              </button>
            </div>
            
            {showColorSelector && (
              <div className="mt-2 grid grid-cols-6 gap-2 p-2 bg-[#222236] border border-gray-700 rounded max-h-[200px] overflow-y-auto">
                {Object.entries(loadoutsColorDefinition).map(([hash, color]: [string, any]) => (
                  <div 
                    key={hash}
                    className={`w-10 h-10 rounded cursor-pointer ${selectedColorHash === parseInt(hash) ? 'border-2 border-[#7e57c2]' : 'border border-gray-700'}`}
                    onClick={() => setSelectedColorHash(parseInt(hash))}
                  >
                    <img 
                      src={`https://bungie.net${color.colorImagePath}`}
                      alt={`Color ${hash}`}
                      width={40}
                      height={40}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Selected Items ({selectedItems.length})</label>
          <div className="grid grid-cols-8 gap-2 mb-2">
            {selectedItems.map((item, index) => {
              const itemDetails = getItemDetails(item.itemInstanceId);
              if (!itemDetails) return null;
              
              const { itemData } = itemDetails;
              
              // Try to get item definition in different ways
              const itemHash = itemData?.item?.hash || 
                               itemData?.itemHash || 
                               itemDetails.instance?.itemHash;
                               
              const itemDef = itemData?.item || 
                              (itemHash && getItemDefinition(itemHash));
              
              return (
                <div 
                  key={item.itemInstanceId}
                  className="relative"
                >
                  <div className="relative w-10 h-10 border border-[#7e57c2] rounded overflow-hidden">
                    {itemDef ? (
                      <img 
                        src={`https://bungie.net${itemDef.displayProperties.icon}`}
                        alt={itemDef.displayProperties.name || "Item"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a40]">
                        <span className="text-xs text-white">Item</span>
                      </div>
                    )}
                    
                    {/* Display item tier as a colored border or background */}
                    {itemDef && itemDef.inventory && typeof itemDef.inventory.tierType === 'number' && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-1"
                        style={{
                          backgroundColor: 
                            itemDef.inventory.tierType === 6 ? '#FFCC00' : // Exotic
                            itemDef.inventory.tierType === 5 ? '#9C5AC5' : // Legendary
                            itemDef.inventory.tierType === 4 ? '#2571EC' : // Rare
                            itemDef.inventory.tierType === 3 ? '#366F42' : // Uncommon
                            itemDef.inventory.tierType === 2 ? '#C3BCAB' : // Common
                            '#666666' // Default
                        }}
                      ></div>
                    )}
                    
                    {/* Power level indicator */}
                    {itemDetails.instance && itemDetails.instance.primaryStat && (
                      <div className="absolute top-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1">
                        {itemDetails.instance.primaryStat.value}
                      </div>
                    )}
                  </div>
                  <button 
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    onClick={() => handleItemSelect(item.itemInstanceId)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Equipment</label>
          <div className="grid grid-cols-4 gap-4">
            {equipment && Object.keys(equipment).map((key) => {
              const section = equipment[key];
              if (!section || !section.current || !section.current.itemInstance) return null;
              
              const { item, itemInstance } = section.current;
              if (!itemInstance) return null;
              
              // Get item definition if not provided directly
              const itemHash = item?.hash || itemInstance.itemHash;
              const itemDef = item || (itemHash && getItemDefinition(itemHash));
              
              // Skip if we can't find an item definition
              if (!itemDef || !itemDef.displayProperties) return null;
              
              const isSelected = selectedItems.some(i => i.itemInstanceId === itemInstance.itemInstanceId);
              
              return (
                <div 
                  key={itemInstance.itemInstanceId}
                  className={`p-2 border rounded cursor-pointer ${isSelected ? 'border-[#7e57c2] bg-[#2a2a40]' : 'border-gray-700 bg-[#1f1f30]'}`}
                  onClick={() => handleItemSelect(itemInstance.itemInstanceId)}
                >
                  <div className="flex items-center gap-2">
                    {itemDef.displayProperties && itemDef.displayProperties.icon ? (
                      <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                        <img 
                          src={`https://bungie.net${itemDef.displayProperties.icon}`}
                          alt={itemDef.displayProperties.name || "Item"}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Display item tier as a colored border */}
                        {itemDef.inventory && typeof itemDef.inventory.tierType === 'number' && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-1"
                            style={{
                              backgroundColor: 
                                itemDef.inventory.tierType === 6 ? '#FFCC00' : // Exotic
                                itemDef.inventory.tierType === 5 ? '#9C5AC5' : // Legendary
                                itemDef.inventory.tierType === 4 ? '#2571EC' : // Rare
                                itemDef.inventory.tierType === 3 ? '#366F42' : // Uncommon
                                itemDef.inventory.tierType === 2 ? '#C3BCAB' : // Common
                                '#666666' // Default
                            }}
                          ></div>
                        )}
                        
                        {/* Power level indicator */}
                        {itemInstance && itemInstance.primaryStat && (
                          <div className="absolute top-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1">
                            {itemInstance.primaryStat.value}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 rounded"></div>
                    )}
                    <div className="text-sm">
                      <div className="text-white truncate">{itemDef.displayProperties?.name || "Unknown Item"}</div>
                      <div className="text-xs text-gray-400 truncate">{itemDef.itemTypeDisplayName || ""}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Inventory</label>
          <div className="grid grid-cols-4 gap-4 max-h-[300px] overflow-y-auto">
            {inventory && Object.keys(inventory).map((category) => {
              const section = inventory[category];
              if (!section || !section.items || section.items.length === 0) return null;
              
              return section.items.map((inventoryItem: any) => {
                if (!inventoryItem || !inventoryItem.itemInstance) return null;
                
                // Get item definition
                const itemHash = inventoryItem.item?.hash || 
                                inventoryItem.itemHash || 
                                inventoryItem.itemInstance.itemHash;
                                
                const itemDef = inventoryItem.item || 
                                (itemHash && getItemDefinition(itemHash));
                
                // Skip if we can't find an item definition
                if (!itemDef || !itemDef.displayProperties) return null;
                
                const { itemInstance } = inventoryItem;
                const isSelected = selectedItems.some(i => i.itemInstanceId === itemInstance.itemInstanceId);
                
                // Skip items that are already in equipment
                if (equipment) {
                  const isEquipped = Object.keys(equipment).some(key => {
                    return equipment[key].current && 
                           equipment[key].current.itemInstance && 
                           equipment[key].current.itemInstance.itemInstanceId === itemInstance.itemInstanceId;
                  });
                  if (isEquipped) return null;
                }
                
                return (
                  <div 
                    key={itemInstance.itemInstanceId}
                    className={`p-2 border rounded cursor-pointer ${isSelected ? 'border-[#7e57c2] bg-[#2a2a40]' : 'border-gray-700 bg-[#1f1f30]'}`}
                    onClick={() => handleItemSelect(itemInstance.itemInstanceId)}
                  >
                    <div className="flex items-center gap-2">
                      {itemDef.displayProperties && itemDef.displayProperties.icon ? (
                        <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                          <img 
                            src={`https://bungie.net${itemDef.displayProperties.icon}`}
                            alt={itemDef.displayProperties.name || "Item"}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Display item tier as a colored border */}
                          {itemDef.inventory && typeof itemDef.inventory.tierType === 'number' && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 h-1"
                              style={{
                                backgroundColor: 
                                  itemDef.inventory.tierType === 6 ? '#FFCC00' : // Exotic
                                  itemDef.inventory.tierType === 5 ? '#9C5AC5' : // Legendary
                                  itemDef.inventory.tierType === 4 ? '#2571EC' : // Rare
                                  itemDef.inventory.tierType === 3 ? '#366F42' : // Uncommon
                                  itemDef.inventory.tierType === 2 ? '#C3BCAB' : // Common
                                  '#666666' // Default
                              }}
                            ></div>
                          )}
                          
                          {/* Power level indicator */}
                          {itemInstance && itemInstance.primaryStat && (
                            <div className="absolute top-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1">
                              {itemInstance.primaryStat.value}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-700 rounded"></div>
                      )}
                      <div className="text-sm">
                        <div className="text-white truncate">{itemDef.displayProperties?.name || "Unknown Item"}</div>
                        <div className="text-xs text-gray-400 truncate">{itemDef.itemTypeDisplayName || ""}</div>
                      </div>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          
          {/* Add Clear button that only shows when editing an existing loadout */}
          {loadout && (
            <button
              onClick={handleClearLoadout}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 disabled:bg-gray-500"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : "Clear Items"}
            </button>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#7e57c2] text-white rounded hover:bg-[#6c46b1] disabled:bg-gray-500"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            ) : loadout ? "Update Loadout" : "Create Loadout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadoutEditor; 