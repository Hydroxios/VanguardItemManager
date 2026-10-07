"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ItemComponent from "./Item";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import useAuth from "@/lib/hooks/useAuth";
import useTransferItem from "@/lib/hooks/useTransferItem";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { equipItems, LoadoutIdentifiers, snapshotLoadout, updateLoadoutIdentifiers } from "@/lib/bungie";
import { ARMOR_SLOTS, BUCKETS, EQUIPMENT_SLOTS, WEAPON_SLOTS } from "@/lib/constants";
import { Item } from "@/lib/types";

const EXOTIC_TIER = 6;
const ANY_CLASS = 3;

const SLOT_GROUPS = [
  { label: "Subclass", slots: [{ hash: EQUIPMENT_SLOTS.SUBCLASS, name: "Subclass" }] },
  {
    label: "Weapons",
    slots: [
      { hash: EQUIPMENT_SLOTS.PRIMARY, name: "Kinetic" },
      { hash: EQUIPMENT_SLOTS.ENERGETIC, name: "Energy" },
      { hash: EQUIPMENT_SLOTS.HEAVY, name: "Power" },
    ],
  },
  {
    label: "Armor",
    slots: [
      { hash: EQUIPMENT_SLOTS.HELMET, name: "Helmet" },
      { hash: EQUIPMENT_SLOTS.ARMS, name: "Gauntlets" },
      { hash: EQUIPMENT_SLOTS.CHEST, name: "Chest" },
      { hash: EQUIPMENT_SLOTS.LEGS, name: "Legs" },
      { hash: EQUIPMENT_SLOTS.CLASS_ITEM, name: "Class item" },
    ],
  },
];
const LOADOUT_SLOTS = SLOT_GROUPS.flatMap((group) => group.slots.map((slot) => slot.hash));
const SLOT_NAMES = Object.fromEntries(SLOT_GROUPS.flatMap((group) => group.slots.map((slot) => [slot.hash, slot.name])));

/** An instanced item and where it currently is ("vault" or a character id). */
interface OwnedItem {
  item: Item;
  location: string;
  equipped: boolean;
}

interface LoadoutEditorModalProps {
  characterId: string;
  loadoutIndex: number;
  onClose: () => void;
}

const sortByIndex = <T extends { index: number }>(definitions: Record<string, T>) =>
  Object.values(definitions).sort((a, b) => a.index - b.index);

// Item tiles open their own tooltip and context menu; inside the editor a click only selects
const blockItemActions = {
  onContextMenuCapture: (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  },
  onDragStartCapture: (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  },
};

const LoadoutEditorModal = ({ characterId, loadoutIndex, onClose }: LoadoutEditorModalProps) => {
  const {
    user,
    characters,
    characterLoadouts,
    characterEquipment,
    characterInventories,
    profileInventory,
    itemComponents,
    refresh,
    updateLoadoutLocally,
  } = useProfile();
  const {
    itemDefinitions,
    classDefinitions,
    loadoutColorDefinitions,
    loadoutIconDefinitions,
    loadoutNameDefinitions,
  } = useDefinitions();
  const { token } = useAuth();
  const { move } = useTransferItem();
  const { addNotification } = useNotifications();

  const loadout = characterLoadouts[characterId]?.loadouts[loadoutIndex];
  // Same rule as the loadout grid: a slot without an icon is empty
  const isNew = !loadout || !loadoutIconDefinitions[loadout.iconHash]?.iconImagePath;
  const classType = characters[characterId]?.classType;

  const colors = useMemo(() => sortByIndex(loadoutColorDefinitions).filter((c) => c.colorImagePath), [loadoutColorDefinitions]);
  const icons = useMemo(() => sortByIndex(loadoutIconDefinitions).filter((i) => i.iconImagePath), [loadoutIconDefinitions]);
  const names = useMemo(() => sortByIndex(loadoutNameDefinitions).filter((n) => n.name), [loadoutNameDefinitions]);

  const ownedItems = useMemo(() => {
    const map = new Map<string, OwnedItem>();
    profileInventory.forEach((item) => {
      if (item.itemInstanceId) map.set(item.itemInstanceId, { item, location: "vault", equipped: false });
    });
    Object.entries(characterInventories).forEach(([id, inventory]) => inventory.items.forEach((item) => {
      // Postmaster items can't be equipped
      if (item.itemInstanceId && item.bucketHash !== BUCKETS.POSTMASTER) map.set(item.itemInstanceId, { item, location: id, equipped: false });
    }));
    Object.entries(characterEquipment).forEach(([id, equipment]) => equipment.items.forEach((item) => {
      if (item.itemInstanceId) map.set(item.itemInstanceId, { item, location: id, equipped: true });
    }));
    return map;
  }, [profileInventory, characterInventories, characterEquipment]);

  const slotOf = (item: Item) => itemDefinitions[item.itemHash]?.inventory?.bucketTypeHash;
  const definitionOf = (instanceId?: string) => {
    const owned = instanceId ? ownedItems.get(instanceId) : undefined;
    return owned ? itemDefinitions[owned.item.itemHash] : undefined;
  };
  const isExotic = (instanceId?: string) => definitionOf(instanceId)?.inventory?.tierType === EXOTIC_TIER;

  // Slots start with the loadout's items, and with the equipped gear where the loadout has none
  const [initialSelection] = useState<Record<number, string>>(() => {
    const selection: Record<number, string> = {};
    characterEquipment[characterId]?.items.forEach((item) => {
      const slot = slotOf(item);
      if (slot && LOADOUT_SLOTS.includes(slot)) selection[slot] = item.itemInstanceId;
    });
    if (!isNew) {
      loadout.items.forEach(({ itemInstanceId }) => {
        const owned = ownedItems.get(itemInstanceId);
        const slot = owned && slotOf(owned.item);
        if (slot && LOADOUT_SLOTS.includes(slot)) selection[slot] = itemInstanceId;
      });
    }
    return selection;
  });
  const [selection, setSelection] = useState(initialSelection);
  // 0 means "not picked yet": the first available value is used
  const [identifiers, setIdentifiers] = useState<LoadoutIdentifiers>(() => isNew
    ? { colorHash: 0, iconHash: 0, nameHash: 0 }
    : { colorHash: loadout.colorHash, iconHash: loadout.iconHash, nameHash: loadout.nameHash });
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [restoreGear, setRestoreGear] = useState(true);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const effective: LoadoutIdentifiers = {
    colorHash: identifiers.colorHash || colors[0]?.hash || 0,
    iconHash: identifiers.iconHash || icons[0]?.hash || 0,
    nameHash: identifiers.nameHash || names[0]?.hash || 0,
  };
  const colorPath = loadoutColorDefinitions[effective.colorHash]?.colorImagePath;
  const iconPath = loadoutIconDefinitions[effective.iconHash]?.iconImagePath;
  const loadoutName = loadoutNameDefinitions[effective.nameHash]?.name ?? `Loadout ${loadoutIndex + 1}`;

  const itemsChanged = isNew || LOADOUT_SLOTS.some((slot) => selection[slot] !== initialSelection[slot]);
  const identifiersChanged = isNew
    || effective.colorHash !== loadout.colorHash
    || effective.iconHash !== loadout.iconHash
    || effective.nameHash !== loadout.nameHash;

  const countExotics = (slots: number[]) => slots.filter((slot) => isExotic(selection[slot])).length;
  const validationError = countExotics(WEAPON_SLOTS) > 1
    ? "Only one exotic weapon can be equipped at a time."
    : countExotics(ARMOR_SLOTS) > 1
      ? "Only one exotic armor piece can be equipped at a time."
      : !effective.colorHash || !effective.iconHash || !effective.nameHash
        ? "Loadout names, colors and icons are still loading."
        : undefined;

  const saving = savingStep !== null;
  const canSave = !saving && !validationError && (itemsChanged || identifiersChanged);

  const candidates = useMemo(() => {
    if (activeSlot === null) return [];
    const query = search.trim().toLowerCase();
    const power = ({ item }: OwnedItem) => itemComponents.instances[item.itemInstanceId]?.primaryStat?.value ?? 0;
    return [...ownedItems.values()]
      .filter(({ item, location }) => {
        const definition = itemDefinitions[item.itemHash];
        if (!definition || definition.inventory?.bucketTypeHash !== activeSlot) return false;
        // Subclasses never leave their character
        if (activeSlot === EQUIPMENT_SLOTS.SUBCLASS && location !== characterId) return false;
        if (definition.classType !== undefined && definition.classType !== ANY_CLASS && definition.classType !== classType) return false;
        return !query || definition.displayProperties.name.toLowerCase().includes(query);
      })
      .sort((a, b) => power(b) - power(a));
  }, [activeSlot, search, ownedItems, itemDefinitions, itemComponents, characterId, classType]);

  const locationLabel = ({ location, equipped }: OwnedItem) => {
    if (location === "vault") return "Vault";
    if (location === characterId) return equipped ? "Equipped" : "Inventory";
    return classDefinitions[characters[location]?.classHash]?.displayProperties.name ?? "Other character";
  };

  // Escape closes the editor, unless a save is running
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose]);

  const equipAll = async (instanceIds: string[]) => {
    // Exotics go last, so whatever exotic they replace is already unequipped
    const ordered = [...instanceIds.filter((id) => !isExotic(id)), ...instanceIds.filter((id) => isExotic(id))];
    const results = await equipItems(token as string, user.membershipType, characterId, ordered);
    const failed = results.filter((result) => result.equipStatus !== 1);
    if (failed.length > 0) {
      const failedNames = failed.map((result) => definitionOf(result.itemInstanceId)?.displayProperties.name ?? "an item");
      throw new Error(`Could not equip ${failedNames.join(", ")}.`);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError(undefined);

    try {
      if (!itemsChanged) {
        setSavingStep("Saving loadout...");
        await updateLoadoutIdentifiers(token as string, user.membershipType, characterId, loadoutIndex, effective);
        updateLoadoutLocally(characterId, loadoutIndex, { ...loadout, ...effective });
      } else {
        const chosen = LOADOUT_SLOTS
          .map((slot) => selection[slot] && ownedItems.get(selection[slot]))
          .filter((owned): owned is OwnedItem => !!owned);
        const previouslyEquipped = (characterEquipment[characterId]?.items ?? [])
          .filter((item) => LOADOUT_SLOTS.includes(slotOf(item) ?? 0))
          .map((item) => item.itemInstanceId);

        // Bungie can only save what the character has equipped: equip the selection, snapshot it, then put the gear back
        setSavingStep("Moving items to your character...");
        for (const { item, location } of chosen) {
          if (location !== characterId) {
            await move({ itemHash: item.itemHash, itemInstanceId: item.itemInstanceId, toId: characterId });
          }
        }

        setSavingStep("Equipping items...");
        await equipAll(chosen.map(({ item }) => item.itemInstanceId));

        setSavingStep("Saving loadout...");
        await snapshotLoadout(token as string, user.membershipType, characterId, loadoutIndex, effective);
        updateLoadoutLocally(characterId, loadoutIndex, {
          ...effective,
          items: chosen.map(({ item }) => ({ itemInstanceId: item.itemInstanceId })),
        });

        if (restoreGear) {
          setSavingStep("Re-equipping your gear...");
          try {
            await equipAll(previouslyEquipped);
          } catch (restoreError) {
            addNotification(
              "Loadout saved, but your previous gear could not be re-equipped",
              restoreError instanceof Error ? restoreError.message : "",
              "error",
              "",
              5000
            );
          }
        }

        // Items moved and got equipped: resync everything with the game
        await refresh();
      }

      addNotification("Loadout saved", loadoutName, "success", iconPath ? `https://www.bungie.net${iconPath}` : "", 5000);
      setSavingStep(null);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save the loadout.");
      setSavingStep(null);
      // Some steps may have gone through before the failure
      refresh();
    }
  };

  const renderItem = (owned: OwnedItem, size: number) => {
    const { item } = owned;
    if (!itemDefinitions[item.itemHash]) return null;
    return (
      <ItemComponent
        itemHash={item.itemHash}
        itemInstanceId={item.itemInstanceId}
        state={item.state}
        characterId={characterId}
        armor={ARMOR_SLOTS.includes(slotOf(item) ?? 0)}
        ornamentItem={item.overrideStyleItemHash ? itemDefinitions[item.overrideStyleItemHash] : undefined}
        perks={itemComponents.perks[item.itemInstanceId]}
        stats={itemComponents.stats[item.itemInstanceId]}
        size={size}
        tooltipDisabled
      />
    );
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/60 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
    >
      <div
        className="relative flex flex-col w-[90vw] max-w-[760px] max-h-[90vh] rounded-2xl shadow-2xl shadow-purple-900/20 border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center w-full justify-between p-4 border-b border-white/5">
          <span className="text-xl text-white font-semibold pl-2">
            {isNew ? "New loadout" : "Edit loadout"}
            <span className="ml-2 text-sm font-normal text-gray-500">Slot {loadoutIndex + 1}</span>
          </span>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 disabled:opacity-40"
            title="Close"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>

        <div className={`flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar ${saving ? "pointer-events-none opacity-60" : ""}`}>
          {/* Identity */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative size-16 shrink-0 border-2 border-white">
                {colorPath && <Image src={`https://www.bungie.net${colorPath}`} alt="Loadout color" fill sizes="64px" />}
                {iconPath && <Image src={`https://www.bungie.net${iconPath}`} alt="Loadout icon" fill sizes="64px" />}
              </div>
              <label className="flex flex-col gap-1 grow text-left">
                <span className="text-xs uppercase tracking-wider text-gray-400">Name</span>
                <select
                  value={effective.nameHash}
                  onChange={(e) => setIdentifiers((prev) => ({ ...prev, nameHash: Number(e.target.value) }))}
                  className="bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#7e57c2]"
                >
                  {names.map((name) => (
                    <option key={name.hash} value={name.hash}>{name.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-2 text-left">
              <span className="text-xs uppercase tracking-wider text-gray-400">Color</span>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((color) => (
                  <button
                    key={color.hash}
                    onClick={() => setIdentifiers((prev) => ({ ...prev, colorHash: color.hash }))}
                    className={`relative size-9 border-2 transition-transform hover:scale-110 ${effective.colorHash === color.hash ? "border-white" : "border-transparent"}`}
                    title={`Color ${color.index + 1}`}
                  >
                    <Image src={`https://www.bungie.net${color.colorImagePath}`} alt="" fill sizes="36px" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 text-left">
              <span className="text-xs uppercase tracking-wider text-gray-400">Icon</span>
              <div className="flex flex-wrap gap-1.5">
                {icons.map((icon) => (
                  <button
                    key={icon.hash}
                    onClick={() => setIdentifiers((prev) => ({ ...prev, iconHash: icon.hash }))}
                    className={`relative size-9 border-2 transition-transform hover:scale-110 ${effective.iconHash === icon.hash ? "border-white" : "border-transparent"}`}
                    title={`Icon ${icon.index + 1}`}
                  >
                    {colorPath && <Image src={`https://www.bungie.net${colorPath}`} alt="" fill sizes="36px" />}
                    <Image src={`https://www.bungie.net${icon.iconImagePath}`} alt="" fill sizes="36px" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="flex flex-col gap-3 text-left">
            <div className="flex flex-wrap gap-6">
              {SLOT_GROUPS.map((group) => (
                <div key={group.label} className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-gray-400">{group.label}</span>
                  <div className="flex gap-2">
                    {group.slots.map((slot) => {
                      const owned = selection[slot.hash] ? ownedItems.get(selection[slot.hash]) : undefined;
                      const isActive = activeSlot === slot.hash;
                      return (
                        <button
                          key={slot.hash}
                          {...blockItemActions}
                          onClick={() => {
                            setActiveSlot(isActive ? null : slot.hash);
                            setSearch("");
                          }}
                          title={owned ? itemDefinitions[owned.item.itemHash]?.displayProperties.name : slot.name}
                          className={`relative size-14 ring-offset-2 ring-offset-[#1a1a1a] transition-shadow ${isActive ? "ring-2 ring-[#7e57c2]" : "hover:ring-2 hover:ring-white/30"}`}
                        >
                          {owned ? renderItem(owned, 56) : (
                            <span className="flex size-14 items-center justify-center border-2 border-dashed border-white/20 text-[10px] text-gray-500">{slot.name}</span>
                          )}
                          {selection[slot.hash] !== initialSelection[slot.hash] && (
                            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#7e57c2]" title="Changed" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Item picker for the active slot */}
            {activeSlot !== null && (
              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white shrink-0">{SLOT_NAMES[activeSlot]}</span>
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="grow bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7e57c2]"
                  />
                  <span className="text-xs text-gray-500 shrink-0">{candidates.length} items</span>
                </div>
                {candidates.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">No item available for this slot.</div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                    {candidates.map((owned) => {
                      const id = owned.item.itemInstanceId;
                      const isSelected = selection[activeSlot] === id;
                      const power = itemComponents.instances[id]?.primaryStat?.value;
                      return (
                        <button
                          key={id}
                          {...blockItemActions}
                          onClick={() => {
                            setSelection((prev) => ({ ...prev, [activeSlot]: id }));
                            setActiveSlot(null);
                          }}
                          title={itemDefinitions[owned.item.itemHash]?.displayProperties.name}
                          className={`flex flex-col items-center gap-1 rounded-md p-1 transition-colors ${isSelected ? "bg-[#7e57c2]/30" : "hover:bg-white/10"}`}
                        >
                          {renderItem(owned, 48)}
                          <span className="text-[11px] leading-none text-white">{power ?? ""}</span>
                          <span className="text-[10px] leading-none text-gray-400 truncate max-w-full">{locationLabel(owned)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-4 border-t border-white/5 text-left">
          {itemsChanged && (
            <>
              <p className="text-xs text-gray-400">
                Bungie only saves what your character has equipped: these items will be moved to this character and equipped,
                then recorded in the loadout along with the mods and subclass setup they currently have.
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={restoreGear}
                  onChange={(e) => setRestoreGear(e.target.checked)}
                  disabled={saving}
                  className="accent-[#7e57c2]"
                />
                Re-equip my current gear afterwards
              </label>
            </>
          )}
          {(error || validationError) && (
            <p className="text-sm text-red-400">{error ?? validationError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            {saving && (
              <span className="flex items-center gap-2 mr-auto text-sm text-gray-300">
                <span className="size-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                {savingStep}
              </span>
            )}
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 bg-[#7e57c2] text-white rounded hover:bg-[#6a46ad] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadoutEditorModal;
