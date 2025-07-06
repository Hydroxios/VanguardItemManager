"use client";

import {
  equipItem,
  equipLoadout,
  getItem,
  transferItem,
  clearLoadout
} from "@/lib/bungie";
import { useEffect, useState } from "react";
import { useNotifications } from "./NotificationsProvider";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import useAuth from "@/lib/hooks/useAuth";
import { useProfile } from "@/lib/hooks/useProfile";

interface LoadoutsProps {
  characterId: string;
  refreshChar: () => Promise<void>;
}

const Loadouts = ({
  characterId,
  refreshChar,
}: LoadoutsProps) => {
  const [elements, setElements] = useState<any>();
  const [onCooldown, setOnCooldown] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadoutToDelete, setLoadoutToDelete] = useState<number | null>(null);

  const { addNotification } = useNotifications()
  const { itemDefinitions, loadoutColorDefinitions, loadoutIconDefinitions } = useDefinitions()

  const { token } = useAuth()
  const {

    user,
    characterLoadouts,
    characterInventories
    
  } = useProfile()

  useEffect(() => {
    const ls: any[] = [];
    for (let index = 0; index < characterLoadouts[characterId].loadouts.length; index++) {
      const l = characterLoadouts[characterId].loadouts[index];
      const color = loadoutColorDefinitions[l.colorHash];
      const icon = loadoutIconDefinitions[l.iconHash];
      ls.push({ color: color?.colorImagePath, icon: icon?.iconImagePath });
    }
    setElements(() => ls);
  }, []);

  const handleEquip = async (index: number) => {
    setOnCooldown(() => true);
    const l = characterLoadouts[characterId].loadouts[index];
    console.log("equipping");
    const itemToDesequip :any[] = []
    for (let i = 0; i < l.items.length; i++) {
      const loadoutItem = l.items[i];
      const itemInstance = await getItem(
        token as string,
        user.membershipType,
        user.membershipId,
        loadoutItem.itemInstanceId,
        "307"
      );
      if(itemInstance){
        if (itemInstance.characterId) {
          if(itemInstance.characterId !== characterId){
            const transfertStatus = itemInstance.item.data.transferStatus
            if(transfertStatus === 0){
              await transferItem(token as string, user.membershipType, itemInstance.item.data.itemHash, loadoutItem.itemInstanceId, itemInstance.characterId, true)
              await transferItem(token as string, user.membershipType, itemInstance.item.data.itemHash, loadoutItem.itemInstanceId, characterId, false)
            } else if(transfertStatus === 1){
              itemToDesequip.push({characterId: itemInstance.characterId, itemInstance: itemInstance, item: itemDefinitions[itemInstance.item.data.itemHash]})
            }
          }
        } else {
          await transferItem(token as string, user.membershipType, itemInstance.item.data.itemHash, loadoutItem.itemInstanceId, characterId, false)
        }
      }
    }

    const characters :any = {}
    for (let index = 0; index < itemToDesequip.length; index++) {
      const item = itemToDesequip[index];
      if(!characters[item.characterId]){
        characters[item.characterId] = characterInventories[item.characterId]
      }

      let validItem :any;
      characters[item.characterId].forEach((i :any)=> {
          if(validItem) return;
          if(i.itemHash !== item.item.hash){
            const itemObject = itemDefinitions[i.itemHash]
            if(itemObject.equippingBlock){
              if(itemObject.equippingBlock.equipmentSlotTypeHash === item.item.equippingBlock.equipmentSlotTypeHash){
                if(itemObject.inventory.tierType < 6){
                  validItem = i;
                  return;
                }
              }
            }
          }
      });

      await equipItem(token as string, user.membershipType, item.characterId, validItem.itemInstanceId)
      await transferItem(token as string, user.membershipType, item.item.hash, item.itemInstance.item.data.itemInstanceId, item.characterId, true)
      await transferItem(token as string, user.membershipType, item.item.hash, item.itemInstance.item.data.itemInstanceId, characterId, false)
    }


    await equipLoadout(token as string, user.membershipType, characterId, index);
    const icon = loadoutIconDefinitions[l.iconHash];
    addNotification("Succesfully equiped your loadout!", "", "success", "https://www.bungie.net" + icon, 5000)
    setTimeout(async () => {
      await refreshChar();
      setOnCooldown(() => false);
    }, 2000);
  };

  // Toggle context menu for a loadout
  const toggleContextMenu = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsContextMenuOpen(isContextMenuOpen === index ? null : index);
  };
  
  // Function to show clear confirmation
  const handleClearConfirm = (index: number) => {
    setLoadoutToDelete(index);
    setShowDeleteConfirm(true);
    setIsContextMenuOpen(null);
  };

  // Function to clear a loadout
  const handleClearLoadout = async () => {
    if (loadoutToDelete === null) return;
    
    try {
      await clearLoadout(
        token as string,
        user.membershipType,
        characterId,
        loadoutToDelete
      );
      
      // Show success notification
      const icon = characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash && loadoutIconDefinitions[characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash] ? 
        `https://www.bungie.net${loadoutIconDefinitions[characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash].iconImagePath}` : "";
      
      addNotification("Loadout cleared", "", "success", icon, 5000);
      
      // Refresh character data
      await refreshChar();
    } catch (error: any) {
      addNotification("Error", error.message || "Failed to clear loadout", "error", "", 5000);
    } finally {
      setShowDeleteConfirm(false);
      setLoadoutToDelete(null);
    }
  };

  // Handle clicking outside to close context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if clicking outside of any context menu
      if (isContextMenuOpen !== null) {
        const contextMenus = document.querySelectorAll('.loadout-context-menu');
        let clickedInsideMenu = false;
        contextMenus.forEach(menu => {
          if (menu.contains(e.target as Node)) {
            clickedInsideMenu = true;
          }
        });
        
        if (!clickedInsideMenu) {
          setIsContextMenuOpen(null);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isContextMenuOpen]);

  return (
    <>
      <div className="grid grid-cols-2 grid-rows-6 gap-2 p-4 fixed left-5 top-1/2 transform -translate-y-1/2">
        {elements &&
          elements.map((element: any, index: number) => (
            <div
              key={index}
              className="relative"
            >
              <div
                style={{
                  border: "2px solid white",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
                  cursor: element.icon && !onCooldown ? "pointer" : "",
                  position: "relative"
                }}
                onClick={() => (element.icon && !onCooldown ? handleEquip(index) : "")}
                onContextMenu={(e) => (element.icon ? toggleContextMenu(index, e) : undefined)}
              >
                {onCooldown ? (
                  <div
                    className="size-[48px] border-2 border-white relative flex items-center justify-center"
                    style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)" }}
                  >
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    {element.color && (
                      <img
                        src={"https://bungie.net" + element.color}
                        height={48}
                        width={48}
                      />
                    )}
                    {element.icon ? (
                      <>
                        <img
                          src={"https://bungie.net" + element.icon}
                          height={48}
                          width={48}
                          style={{ position: "absolute", top: 0, left: 0 }}
                        />
                        
                        {isContextMenuOpen === index && (
                          <div 
                            className="loadout-context-menu absolute top-[-8px] left-full ml-2 z-20 bg-[#1a1a2e] border border-[#7e57c2] rounded-md shadow-lg overflow-hidden min-w-40 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                              transform: 'translateY(-25%)'
                            }}
                          >
                            <div className="bg-[#2a2a40] py-2 px-3 border-b border-[#7e57c2] font-medium text-sm">
                              Loadout Options
                            </div>
                            <div className="py-1">
                              <button 
                                className="flex items-center w-full text-left px-3 py-2 text-sm text-white hover:bg-[#3a3a50] transition-colors"
                                onClick={() => handleEquip(index)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Equip
                              </button>
                              <div className="border-t border-gray-700 my-1"></div>
                              <button 
                                className="flex items-center w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#3a3a50] transition-colors"
                                onClick={() => handleClearConfirm(index)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div 
                        className="relative cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <img
                          src={"./new_loadout.svg"}
                          height={48}
                          width={48}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">+</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && loadoutToDelete !== null && characterLoadouts[characterId].loadouts[loadoutToDelete] && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
          <div className="bg-[#1a1a2e] border border-[#7e57c2] shadow-xl p-5 rounded w-[400px] animate-fade-in">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
              <h2 className="text-white text-xl font-semibold">
                Clear Loadout
              </h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to clear this loadout? This will remove all items from this loadout.
              </p>
              
              <div className="flex items-center justify-center mb-4">
                {characterLoadouts[characterId].loadouts[loadoutToDelete].colorHash && (
                  <div className="relative size-[64px]">
                    <img
                      src={`https://bungie.net${loadoutColorDefinitions[characterLoadouts[characterId].loadouts[loadoutToDelete].colorHash].colorImagePath}`}
                      height={64}
                      width={64}
                      alt="Loadout background"
                    />
                    {characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash && (
                      <img
                        src={`https://bungie.net${loadoutIconDefinitions[characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash].iconImagePath}`}
                        height={64}
                        width={64}
                        style={{ position: "absolute", top: 0, left: 0 }}
                        alt="Loadout icon"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLoadout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Loadouts;
