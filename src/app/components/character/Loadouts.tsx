"use client";

import {
  equipItem,
  equipLoadout,
  transferItem,
  clearLoadout,
  snapshotLoadout,
  LoadoutIdentifiers
} from "@/lib/bungie";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { defaultLoadoutIdentifiers, getLoadoutChoices } from "@/lib/helpers/loadouts";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import LoadoutViewerModal from "./LoadoutViewerModal";
import LoadoutEditorModal from "./LoadoutEditorModal";
import Image from "next/image";
import { Item, Loadout } from "@/lib/types";
import { ARMOR_SLOTS, BUCKETS, EQUIPMENT_SLOTS, WEAPON_SLOTS } from "@/lib/constants";

// The equipment an in-game loadout records
const LOADOUT_BUCKETS = [EQUIPMENT_SLOTS.SUBCLASS, ...WEAPON_SLOTS, ...ARMOR_SLOTS];

// Paths of the context menu icons (24x24 outline)
const MENU_ICONS = {
  equip: ["M5 13l4 4L19 7"],
  edit: ["M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 17.5l.964-4.5z"],
  save: ["M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"],
  view: [
    "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  ],
  clear: ["M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"],
  add: ["M12 4v16m8-8H4"],
};

interface MenuEntry {
  label: string;
  icon: string[];
  color: string;
  onClick: () => void;
}


interface LoadoutsProps {
  characterId: string;
}

const Loadouts = ({
  characterId,
}: LoadoutsProps) => {
  const [onCooldown, setOnCooldown] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<number | null>(null);
  // How far the open menu is moved up or down to stay inside the window
  const [contextMenuShift, setContextMenuShift] = useState(0);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // Clearing a loadout and overwriting it with the equipped gear both ask first
  const [pendingConfirm, setPendingConfirm] = useState<{ index: number, action: "clear" | "overwrite" } | null>(null);
  const [equipingLoadout, setEquipingLoadout] = useState<Loadout | null>(null)
  const [equipedItemIds, setEquipedItemIds] = useState<string[]>([]);
  const [viewingLoadoutIndex, setViewingLoadoutIndex] = useState<number | null>(null);
  const [editingLoadoutIndex, setEditingLoadoutIndex] = useState<number | null>(null);

  const { addNotification } = useNotifications()
  const { itemDefinitions, loadoutColorDefinitions, loadoutIconDefinitions, loadoutNameDefinitions } = useDefinitions()

  const {
    user,
    characterLoadouts,
    characterInventories,
    refresh,
    characterEquipment,
    profileInventory,
    moveItem,
    equipLoadoutLocally,
    updateLoadoutLocally
  } = useProfile()

  const loadoutChoices = useMemo(
    () => getLoadoutChoices(loadoutColorDefinitions, loadoutIconDefinitions, loadoutNameDefinitions),
    [loadoutColorDefinitions, loadoutIconDefinitions, loadoutNameDefinitions]
  );

  // Lookup used by the equipping overlay, built once per inventory change instead of per item
  const itemsByInstanceId = useMemo(() => {
    const map = new Map<string, Item>();
    profileInventory.forEach(item => item.itemInstanceId && map.set(item.itemInstanceId, item));
    Object.values(characterInventories).forEach(inv => inv.items.forEach(item => item.itemInstanceId && map.set(item.itemInstanceId, item)));
    Object.values(characterEquipment).forEach(eq => eq.items.forEach(item => item.itemInstanceId && map.set(item.itemInstanceId, item)));
    return map;
  }, [profileInventory, characterInventories, characterEquipment]);

  // What each loadout slot shows
  const elements = useMemo(() => characterLoadouts[characterId].loadouts.map((l) => ({
    color: loadoutColorDefinitions[l.colorHash]?.colorImagePath,
    icon: loadoutIconDefinitions[l.iconHash]?.iconImagePath,
    name: loadoutNameDefinitions[l.nameHash]?.name,
  })), [characterLoadouts, characterId, loadoutColorDefinitions, loadoutIconDefinitions, loadoutNameDefinitions]);

  const handleEquip = async (index: number) => {
    setOnCooldown(() => true);
    setEquipedItemIds([]); // reset à chaque nouveau equip
    const l = characterLoadouts[characterId].loadouts[index];
    setEquipingLoadout(l);
    // On va stocker {item, characterId} pour chaque item ("vault" pour le coffre)
    type ItemWithChar = { item: Item; characterId: string };
    const itemToDesequip: ItemWithChar[] = [];

    // Map de tous les items par instanceId, avec leur emplacement
    const itemMap: Record<string, ItemWithChar> = {};
    profileInventory.forEach(item => {
      if (item.itemInstanceId) itemMap[item.itemInstanceId] = { item, characterId: "vault" };
    });
    Object.entries(characterInventories).forEach(([charId, inv]) => {
      inv.items.forEach(item => {
        if (item.itemInstanceId) itemMap[item.itemInstanceId] = { item, characterId: charId };
      });
    });
    Object.entries(characterEquipment).forEach(([charId, eq]) => {
      eq.items.forEach(item => {
        if (item.itemInstanceId) itemMap[item.itemInstanceId] = { item, characterId: charId };
      });
    });

    try {
      for (let i = 0; i < l.items.length; i++) {
        const loadoutItem = l.items[i];
        const found = itemMap[loadoutItem.itemInstanceId];
        // Si on ne trouve pas l'item dans le profil, on ignore
        if (!found) continue;

        const { item: itemInstance, characterId: itemCharId } = found;
        if (itemCharId === characterId) {
          // L'item est déjà sur le bon perso
          setEquipedItemIds(prev => [...prev, loadoutItem.itemInstanceId]);
        } else if (itemCharId === "vault") {
          // L'item est dans le coffre
          await transferItem(user.membershipType, itemInstance.itemHash, loadoutItem.itemInstanceId, characterId, false);
          moveItem(itemInstance.itemHash, loadoutItem.itemInstanceId, "vault", characterId, 1);
          setEquipedItemIds(prev => [...prev, loadoutItem.itemInstanceId]);
        } else if (itemInstance.transferStatus & 1) {
          // Équipé sur un autre perso, il faudra le déséquiper
          itemToDesequip.push({ item: itemInstance, characterId: itemCharId });
        } else if (!(itemInstance.transferStatus & 2)) {
          // Sur un autre perso et transférable
          await transferItem(user.membershipType, itemInstance.itemHash, loadoutItem.itemInstanceId, itemCharId, true);
          moveItem(itemInstance.itemHash, loadoutItem.itemInstanceId, itemCharId, "vault", 1);
          await transferItem(user.membershipType, itemInstance.itemHash, loadoutItem.itemInstanceId, characterId, false);
          moveItem(itemInstance.itemHash, loadoutItem.itemInstanceId, "vault", characterId, 1);
          setEquipedItemIds(prev => [...prev, loadoutItem.itemInstanceId]);
        }
      }

      // Déséquipement si besoin
      for (let index = 0; index < itemToDesequip.length; index++) {
        const { item, characterId: itemCharId } = itemToDesequip[index];
        const itemDef = itemDefinitions[item.itemHash];
        const validItem = (characterInventories[itemCharId]?.items ?? []).find((i) => {
          // Les objets du postmaster ne peuvent pas être équipés
          if (!i.itemInstanceId || i.bucketHash === BUCKETS.POSTMASTER || i.itemHash === item.itemHash) return false;
          const itemObject = itemDefinitions[i.itemHash];
          return !!itemObject?.equippingBlock
            && itemObject.equippingBlock.equipmentSlotTypeHash === itemDef?.equippingBlock?.equipmentSlotTypeHash
            && itemObject.inventory.tierType < 6;
        });
        if (validItem) {
          await equipItem(user.membershipType, itemCharId, validItem.itemInstanceId);
          await transferItem(user.membershipType, item.itemHash, item.itemInstanceId, itemCharId, true);
          moveItem(item.itemHash, item.itemInstanceId, itemCharId, "vault", 1);
          await transferItem(user.membershipType, item.itemHash, item.itemInstanceId, characterId, false);
          moveItem(item.itemHash, item.itemInstanceId, "vault", characterId, 1);
          setEquipedItemIds(prev => [...prev, item.itemInstanceId]);
        }
      }

      await equipLoadout(user.membershipType, characterId, index);

      // Use the new centralized local equip function
      const loadoutItems = l.items
        .map(i => itemMap[i.itemInstanceId]?.item)
        .filter((item): item is Item => item !== undefined);

      equipLoadoutLocally(characterId, loadoutItems);

      const icon = loadoutIconDefinitions[l.iconHash];
      addNotification("Successfully equipped your loadout!", "", "success", icon ? "https://www.bungie.net" + icon.iconImagePath : "", 5000);
    } catch (error) {
      addNotification("Error while equipping loadout", error instanceof Error ? error.message : "Failed to equip loadout", "error", "", 5000);
      // Some transfers may have succeeded; resync with the game
      refresh();
    } finally {
      setOnCooldown(() => false);
      setEquipingLoadout(null);
    }
  };

  // Toggle context menu for a loadout
  const toggleContextMenu = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuShift(0);
    setIsContextMenuOpen(isContextMenuOpen === index ? null : index);
  };

  // The menu opens next to its slot; for the bottom slots it would overflow the window, so it moves up.
  // Measured from the slot and the layout height: the fade-in animation shifts and scales the menu itself
  useLayoutEffect(() => {
    const menu = contextMenuRef.current;
    const slot = menu?.offsetParent;
    if (isContextMenuOpen === null || !menu || !slot) return;
    const margin = 8;
    const naturalTop = slot.getBoundingClientRect().top - 8;
    let shift = Math.min(0, window.innerHeight - margin - (naturalTop + menu.offsetHeight));
    if (naturalTop + shift < margin) shift = margin - naturalTop;
    setContextMenuShift(shift);
  }, [isContextMenuOpen]);

  const askConfirm = (index: number, action: "clear" | "overwrite") => {
    setPendingConfirm({ index, action });
    setIsContextMenuOpen(null);
  };

  /** Records what the character wears in the slot, like saving a loadout in game. Nothing moves. */
  const handleSaveEquipped = async (index: number) => {
    setIsContextMenuOpen(null);
    const existing = characterLoadouts[characterId].loadouts[index];
    const isEmpty = !loadoutIconDefinitions[existing?.iconHash]?.iconImagePath;
    // An empty slot gets the default look; an existing loadout keeps its own
    const identifiers: LoadoutIdentifiers = isEmpty
      ? defaultLoadoutIdentifiers(loadoutChoices)
      : { colorHash: existing.colorHash, iconHash: existing.iconHash, nameHash: existing.nameHash };
    if (!identifiers.colorHash || !identifiers.iconHash || !identifiers.nameHash) {
      addNotification("Loadout names, colors and icons are still loading", "Try again in a moment.", "error", "", 5000);
      return;
    }

    const icon = loadoutIconDefinitions[identifiers.iconHash]?.iconImagePath;
    try {
      await snapshotLoadout(user.membershipType, characterId, index, identifiers);
      const equipped = (characterEquipment[characterId]?.items ?? [])
        .filter((item) => LOADOUT_BUCKETS.includes(itemDefinitions[item.itemHash]?.inventory?.bucketTypeHash ?? 0));
      updateLoadoutLocally(characterId, index, { ...identifiers, items: equipped.map((item) => ({ itemInstanceId: item.itemInstanceId })) });
      addNotification("Loadout saved", loadoutNameDefinitions[identifiers.nameHash]?.name ?? "", "success", icon ? `https://www.bungie.net${icon}` : "", 5000);
      await refresh();
    } catch (error) {
      addNotification("Error while saving loadout", error instanceof Error ? error.message : "Failed to save loadout", "error", "", 5000);
    }
  };

  // Function to clear a loadout
  const handleClearLoadout = async (loadoutToDelete: number) => {
    try {
      await clearLoadout(
        user.membershipType,
        characterId,
        loadoutToDelete
      );

      // Show success notification
      const icon = characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash && loadoutIconDefinitions[characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash] ?
        `https://www.bungie.net${loadoutIconDefinitions[characterLoadouts[characterId].loadouts[loadoutToDelete].iconHash].iconImagePath}` : "";

      addNotification("Loadout cleared", "", "success", icon, 5000);

      // Refresh character data
      await refresh();
    } catch (error) {
      addNotification("Error", (error instanceof Error && error.message) || "Failed to clear loadout", "error", "", 5000);
    }
  };

  const handleConfirm = () => {
    if (!pendingConfirm) return;
    const { index, action } = pendingConfirm;
    setPendingConfirm(null);
    if (action === "clear") handleClearLoadout(index);
    else handleSaveEquipped(index);
  };

  const menuEntries = (index: number, isEmpty: boolean): MenuEntry[] => {
    const closeAnd = (action: () => void) => () => {
      setIsContextMenuOpen(null);
      action();
    };
    if (isEmpty) {
      return [
        { label: "Create from equipped gear", icon: MENU_ICONS.save, color: "text-white", onClick: () => handleSaveEquipped(index) },
        { label: "Create in editor", icon: MENU_ICONS.add, color: "text-[#b39ddb]", onClick: closeAnd(() => setEditingLoadoutIndex(index)) },
      ];
    }
    return [
      { label: "Equip", icon: MENU_ICONS.equip, color: "text-white", onClick: () => handleEquip(index) },
      { label: "Edit", icon: MENU_ICONS.edit, color: "text-[#b39ddb]", onClick: closeAnd(() => setEditingLoadoutIndex(index)) },
      { label: "Save equipped gear", icon: MENU_ICONS.save, color: "text-[#b39ddb]", onClick: () => askConfirm(index, "overwrite") },
      { label: "View", icon: MENU_ICONS.view, color: "text-blue-400", onClick: closeAnd(() => setViewingLoadoutIndex(index)) },
      { label: "Clear", icon: MENU_ICONS.clear, color: "text-red-400", onClick: () => askConfirm(index, "clear") },
    ];
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
      <div className="relative">
        {/* Overlay with backdrop filter when equipping */}
        {onCooldown && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-white rounded-full animate-spin mb-4"></div>
            <span className="text-white text-lg font-semibold">Equipping loadout...</span>
            {equipingLoadout && (
              <div className="mt-4 flex flex-row flex-wrap items-center gap-4 w-full max-w-xs justify-center">
                {equipingLoadout.items.map((i, idx) => {
                  const fullItem = itemsByInstanceId.get(i.itemInstanceId);
                  const def = fullItem ? itemDefinitions[fullItem.itemHash] : undefined;
                  const isEquipped = equipedItemIds.includes(i.itemInstanceId);
                  return (
                    <div key={i.itemInstanceId || idx} className={`relative flex items-center justify-center ${isEquipped ? 'border-2 border-green-500' : ''}`} style={{ width: 56, height: 56 }}>
                      {def?.displayProperties?.icon && (
                        <Image
                          src={`https://www.bungie.net${def.displayProperties.icon}`}
                          alt={def.displayProperties.name}
                          height={56}
                          width={56}
                          className={`w-14 h-14 ${isEquipped ? '' : 'brightness-50'}`}
                          style={{ objectFit: 'contain' }}
                        />
                      )}
                      {isEquipped && (
                        <span className="absolute right-0 bottom-0 flex items-center justify-center" style={{ width: 20, height: 14, pointerEvents: 'none' }}>
                          <svg className="w-5 h-3.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className={`grid grid-cols-2 grid-rows-6 gap-1 p-4 fixed left-5 top-1/2 transform -translate-y-1/2 ${onCooldown ? 'grayscale' : ''}`}>
          {elements.map((element, index) => (
              <div
                key={index}
                className="relative"
              >
                <div
                  style={{
                    border: "2px solid white",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.04)",
                    cursor: !onCooldown ? "pointer" : "",
                    position: "relative"
                  }}
                  title={element.icon ? element.name : "Create a loadout"}
                  onClick={() => {
                    if (onCooldown) return;
                    // An empty slot opens the editor to create a loadout there
                    if (element.icon) handleEquip(index);
                    else setEditingLoadoutIndex(index);
                  }}
                  onContextMenu={(e) => (!onCooldown ? toggleContextMenu(index, e) : "")}
                >
                  {onCooldown ? (
                    <div
                      className="size-[48px] border-2 border-white relative flex items-center justify-center"
                      style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.11)" }}
                    >
                      <div className="w-8 h-8 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      {element.color && (
                        <Image
                          alt="loadout color"
                          src={"https://www.bungie.net" + element.color}
                          height={48}
                          width={48}
                        />
                      )}
                      {element.icon ? (
                        <>
                          <Image
                            alt="loadout icon"
                            src={"https://www.bungie.net" + element.icon}
                            height={48}
                            width={48}
                            style={{ position: "absolute", top: 0, left: 0 }}
                          />
                          <span className="absolute bottom-0 right-0.5 text-xs font-bold leading-none text-white pointer-events-none select-none [text-shadow:0_0_2px_#000,0_0_2px_#000]">
                            {index + 1}
                          </span>
                        </>
                      ) : (
                        <div
                          className="relative bg-zinc-700/40 hover:bg-zinc-700/70"
                        >
                          <Image
                            alt="new loadout"
                            src={"./new_loadout.svg"}
                            height={48}
                            width={48}
                          />
                        </div>
                      )}

                      {isContextMenuOpen === index && (
                        <div
                          ref={contextMenuRef}
                          className="loadout-context-menu absolute left-full ml-2 z-20 bg-[#1a1a2e] border border-[#7e57c2] rounded-md shadow-lg overflow-hidden min-w-40 animate-fade-in"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                            // Positioned with top: the fade-in animation owns transform
                            top: -8 + contextMenuShift
                          }}
                        >
                          <div className="bg-[#2a2a40] py-2 px-3 border-b border-[#7e57c2] font-medium text-sm whitespace-nowrap">
                            {element.icon ? "Loadout Options" : "Empty Slot"}
                          </div>
                          <div className="py-1">
                            {menuEntries(index, !element.icon).map((entry, entryIndex) => (
                              <Fragment key={entry.label}>
                                {entryIndex > 0 && <div className="border-t border-gray-700 my-1"></div>}
                                <button
                                  className={`flex items-center w-full text-left px-3 py-2 text-sm whitespace-nowrap ${entry.color} hover:bg-[#3a3a50] transition-colors`}
                                  onClick={entry.onClick}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {entry.icon.map((d) => <path key={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />)}
                                  </svg>
                                  {entry.label}
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Confirmation for clearing a loadout or overwriting it with the equipped gear */}
      {pendingConfirm && characterLoadouts[characterId].loadouts[pendingConfirm.index] && (() => {
        const loadout = characterLoadouts[characterId].loadouts[pendingConfirm.index];
        const colorPath = loadoutColorDefinitions[loadout.colorHash]?.colorImagePath;
        const iconPath = loadoutIconDefinitions[loadout.iconHash]?.iconImagePath;
        const isClear = pendingConfirm.action === "clear";
        return (
          <div className="fixed inset-0 flex items-center justify-center z-[1003] bg-black/80" onClick={() => setPendingConfirm(null)}>
            <div className="bg-[#1a1a2e] border border-[#7e57c2] shadow-xl p-5 rounded w-[400px] animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h2 className="text-white text-xl font-semibold">
                  {isClear ? "Clear Loadout" : "Save Equipped Gear"}
                </h2>
                <button
                  onClick={() => setPendingConfirm(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  {isClear
                    ? "Are you sure you want to clear this loadout? This will remove all items from this loadout."
                    : "Replace this loadout with the gear, mods and subclass setup you have equipped right now? Its name, color and icon are kept."}
                </p>

                <div className="flex items-center justify-center mb-4">
                  <div className="relative size-[64px]">
                    {colorPath && <Image src={`https://www.bungie.net${colorPath}`} height={64} width={64} alt="Loadout background" />}
                    {iconPath && (
                      <Image
                        src={`https://www.bungie.net${iconPath}`}
                        height={64}
                        width={64}
                        style={{ position: "absolute", top: 0, left: 0 }}
                        alt="Loadout icon"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPendingConfirm(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-white rounded ${isClear ? "bg-red-600 hover:bg-red-700" : "bg-[#7e57c2] hover:bg-[#6a46ad]"}`}
                >
                  {isClear ? "Clear" : "Save"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {editingLoadoutIndex !== null && (
        <LoadoutEditorModal
          key={`${characterId}-${editingLoadoutIndex}`}
          characterId={characterId}
          loadoutIndex={editingLoadoutIndex}
          onClose={() => setEditingLoadoutIndex(null)}
        />
      )}

      <LoadoutViewerModal
        open={viewingLoadoutIndex !== null}
        onClose={() => setViewingLoadoutIndex(null)}
        loadout={viewingLoadoutIndex !== null ? characterLoadouts[characterId].loadouts[viewingLoadoutIndex] : null}
        characterId={characterId}
      />
    </>
  );
};

export default Loadouts;
