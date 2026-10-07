"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import ItemComponent from "./Item";
import ModEditor from "./ModEditor";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import useTransferItem from "@/lib/hooks/useTransferItem";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { equipItems, insertSocketPlugFree, LoadoutIdentifiers, snapshotLoadout, updateLoadoutIdentifiers } from "@/lib/bungie";
import { getEnergyCapacity, getEnergyCost, getModSockets, getPerkSockets, isFreePlug } from "@/lib/helpers/mods";
import PerkEditor from "./PerkEditor";
import { countFragments, getEditableSubclassSockets, getFragmentCapacity, planSubclassChanges } from "@/lib/helpers/subclass";
import SubclassEditor from "./SubclassEditor";
import LoadoutStats from "./LoadoutStats";
import { getLoadoutChoices } from "@/lib/helpers/loadouts";
import { armorStatsWithPlugs, plugsStats, sumStats } from "@/lib/helpers/stats";
import { ARMOR_SLOTS, BUCKETS, EQUIPMENT_SLOTS, SOCKET_CATEGORIES, UNSET_PLUG_HASH, WEAPON_SLOTS } from "@/lib/constants";
import { Item } from "@/lib/types";

const EXOTIC_TIER = 6;
const ANY_CLASS = 3;
// Width of the global item tooltip, to open it on the side of a tile that has room
const TOOLTIP_WIDTH = 285;

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

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

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
    plugSets,
    refresh,
    updateLoadoutLocally,
  } = useProfile();
  const {
    itemDefinitions,
    loadoutColorDefinitions,
    loadoutIconDefinitions,
    loadoutNameDefinitions,
    materialRequirementDefinitions,
    bucketDefinitions,
    classDefinitions,
  } = useDefinitions();
  const { move } = useTransferItem();
  const { addNotification } = useNotifications();
  const { showTooltip, hideTooltip } = useItemTooltipActions();

  const loadout = characterLoadouts[characterId]?.loadouts[loadoutIndex];
  // Same rule as the loadout grid: a slot without an icon is empty
  const isNew = !loadout || !loadoutIconDefinitions[loadout.iconHash]?.iconImagePath;
  const classType = characters[characterId]?.classType;

  const { colors, icons, names } = useMemo(
    () => getLoadoutChoices(loadoutColorDefinitions, loadoutIconDefinitions, loadoutNameDefinitions),
    [loadoutColorDefinitions, loadoutIconDefinitions, loadoutNameDefinitions]
  );

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
  const [initialIdentifiers] = useState<LoadoutIdentifiers>(() => isNew
    ? { colorHash: 0, iconHash: 0, nameHash: 0 }
    : { colorHash: loadout.colorHash, iconHash: loadout.iconHash, nameHash: loadout.nameHash });
  const [identifiers, setIdentifiers] = useState(initialIdentifiers);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  // "config" is the mod editor for weapons and armor, the subclass editor for the subclass
  const [panel, setPanel] = useState<"items" | "perks" | "config">("items");
  const [search, setSearch] = useState("");
  // Plugs (mods, abilities, aspects...) picked in the editor, by item instance id then socket index
  const [plugChanges, setPlugChanges] = useState<Record<string, Record<number, number>>>({});
  const [restoreGear, setRestoreGear] = useState(true);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const isSubclass = (item: Item) => slotOf(item) === EQUIPMENT_SLOTS.SUBCLASS;
  const subclassSocketsOf = (item: Item) => getEditableSubclassSockets(itemDefinitions[item.itemHash], {
    itemInstanceId: item.itemInstanceId,
    characterId,
    itemComponents,
    plugSets,
    itemDefinitions,
  });
  const editableSocketsOf = (item: Item) => isSubclass(item)
    ? subclassSocketsOf(item).groups.flatMap((group) => group.socketIndexes)
    : [
      ...getModSockets(itemDefinitions[item.itemHash], itemDefinitions).map((socket) => socket.socketIndex),
      ...getPerkSockets(itemDefinitions[item.itemHash], item.itemInstanceId, itemComponents),
    ];

  // Plugs an item gets in this loadout: the ones the loadout records, else the ones it has now
  const basePlugs = (instanceId: string): Record<number, number> => {
    const owned = ownedItems.get(instanceId);
    if (!owned) return {};
    const current = itemComponents.sockets[instanceId]?.sockets ?? [];
    const fromLoadout = isNew ? undefined : loadout.items.find((item) => item.itemInstanceId === instanceId)?.plugItemHashes;
    const plugs: Record<number, number> = {};
    editableSocketsOf(owned.item).forEach((socketIndex) => {
      const loadoutPlug = fromLoadout?.[socketIndex];
      const plug = loadoutPlug && loadoutPlug !== UNSET_PLUG_HASH ? loadoutPlug : current[socketIndex]?.plugHash;
      if (plug) plugs[socketIndex] = plug;
    });
    return plugs;
  };
  const desiredPlugs = (instanceId: string) => ({ ...basePlugs(instanceId), ...plugChanges[instanceId] });

  const changePlug = (instanceId: string, socketIndex: number, plugHash: number) => {
    setPlugChanges((prev) => {
      const changes = { ...prev[instanceId] };
      if (basePlugs(instanceId)[socketIndex] === plugHash) delete changes[socketIndex];
      else changes[socketIndex] = plugHash;
      return { ...prev, [instanceId]: changes };
    });
  };
  const hasPlugChanges = (instanceId?: string) => !!instanceId && Object.keys(plugChanges[instanceId] ?? {}).length > 0;

  /** The insertions that give an item its desired plugs, in an order the game accepts. */
  const plugSwapsFor = (item: Item) => {
    const current = itemComponents.sockets[item.itemInstanceId]?.sockets ?? [];
    const desired = desiredPlugs(item.itemInstanceId);
    const definition = itemDefinitions[item.itemHash];

    if (isSubclass(item) && definition) {
      const { groups } = subclassSocketsOf(item);
      return planSubclassChanges(definition, groups, current.map((socket) => socket.plugHash), desired, getFragmentCapacity(groups, desired, itemDefinitions));
    }

    const costOf = (plugHash?: number) => getEnergyCost(plugHash ? itemDefinitions[plugHash] : undefined);
    return Object.entries(desired)
      .map(([socketIndex, plugHash]) => ({ socketIndex: Number(socketIndex), plugHash }))
      .filter(({ socketIndex, plugHash }) => current[socketIndex]?.plugHash !== plugHash)
      // Swaps that free energy go first, so the costly ones always have room
      .sort((a, b) => (costOf(a.plugHash) - costOf(current[a.socketIndex]?.plugHash)) - (costOf(b.plugHash) - costOf(current[b.socketIndex]?.plugHash)));
  };

  const armorEnergyUsed = (instanceId: string) => {
    const owned = ownedItems.get(instanceId);
    const plugs = desiredPlugs(instanceId);
    return getModSockets(owned && itemDefinitions[owned.item.itemHash], itemDefinitions)
      .filter((socket) => socket.categoryHash === SOCKET_CATEGORIES.ARMOR_MODS)
      .reduce((total, socket) => total + getEnergyCost(itemDefinitions[plugs[socket.socketIndex]]), 0);
  };

  const effective: LoadoutIdentifiers = {
    colorHash: identifiers.colorHash || colors[0]?.hash || 0,
    iconHash: identifiers.iconHash || icons[0]?.hash || 0,
    nameHash: identifiers.nameHash || names[0]?.hash || 0,
  };
  const colorPath = loadoutColorDefinitions[effective.colorHash]?.colorImagePath;
  const iconPath = loadoutIconDefinitions[effective.iconHash]?.iconImagePath;
  const loadoutName = loadoutNameDefinitions[effective.nameHash]?.name ?? `Loadout ${loadoutIndex + 1}`;

  const chosenIds = LOADOUT_SLOTS.map((slot) => selection[slot]).filter((id): id is string => !!id);
  const itemsChanged = isNew || LOADOUT_SLOTS.some((slot) => selection[slot] !== initialSelection[slot]);
  const plugsChanged = chosenIds.some(hasPlugChanges);
  // Items, mods and subclass setup can only be saved through a snapshot of the equipped gear
  const gearChanged = itemsChanged || plugsChanged;
  const identifiersChanged = isNew
    || effective.colorHash !== loadout.colorHash
    || effective.iconHash !== loadout.iconHash
    || effective.nameHash !== loadout.nameHash;

  const countExotics = (slots: number[]) => slots.filter((slot) => isExotic(selection[slot])).length;
  const overEnergyId = chosenIds.find((id) => {
    const capacity = getEnergyCapacity(id, itemComponents, itemDefinitions);
    return capacity !== undefined && armorEnergyUsed(id) > capacity;
  });
  // The aspects decide how many fragments fit
  const subclassId = selection[EQUIPMENT_SLOTS.SUBCLASS];
  const subclassOwned = subclassId ? ownedItems.get(subclassId) : undefined;
  const fragmentOverflow = (() => {
    const definition = subclassOwned && itemDefinitions[subclassOwned.item.itemHash];
    if (!subclassOwned || !definition) return undefined;
    const { groups } = subclassSocketsOf(subclassOwned.item);
    const plugs = desiredPlugs(subclassOwned.item.itemInstanceId);
    const capacity = getFragmentCapacity(groups, plugs, itemDefinitions);
    return capacity !== undefined && countFragments(groups, plugs, definition) > capacity ? capacity : undefined;
  })();

  // What a save will do, shown before it runs and checked so it can't stop halfway
  const chosenOwned = chosenIds.map((id) => ownedItems.get(id)).filter((owned): owned is OwnedItem => !!owned);
  const incoming = gearChanged ? chosenOwned.filter((owned) => owned.location !== characterId) : [];
  const toEquip = gearChanged ? chosenOwned.filter((owned) => !(owned.location === characterId && owned.equipped)) : [];
  const plannedSwaps = gearChanged ? chosenOwned.flatMap((owned) => plugSwapsFor(owned.item).map(({ plugHash }) => ({ item: owned.item, plugHash }))) : [];

  // A plug that costs materials (often one the loadout recorded) can't go through the API
  const paidSwap = plannedSwaps.find(({ plugHash }) => !isFreePlug(itemDefinitions[plugHash], materialRequirementDefinitions));

  // Each incoming item needs room in its bucket on this character
  const bucketIsFull = (bucketHash: number) => {
    const capacity = bucketDefinitions[bucketHash]?.itemCount;
    if (!capacity) return false;
    const held = [...(characterInventories[characterId]?.items ?? []), ...(characterEquipment[characterId]?.items ?? [])]
      .filter((item) => item.bucketHash === bucketHash).length;
    return held >= capacity;
  };
  const fullSlot = incoming.map((owned) => slotOf(owned.item)).find((slot): slot is number => !!slot && bucketIsFull(slot));
  // Items coming from another character go through the vault
  const vaultCapacity = bucketDefinitions[BUCKETS.GENERAL]?.itemCount;
  const vaultFull = incoming.some((owned) => owned.location !== "vault")
    && vaultCapacity !== undefined
    && profileInventory.filter((item) => item.bucketHash === BUCKETS.GENERAL).length >= vaultCapacity;

  const sourceLabel = ({ location }: OwnedItem) => location === "vault"
    ? "vault"
    : classDefinitions[characters[location]?.classHash]?.displayProperties.name ?? "another character";

  // Armor stats of the loadout (with its mods and fragments) next to what the character wears now
  const loadoutStats = sumStats([
    ...ARMOR_SLOTS.map((slot) => selection[slot]).filter((id): id is string => !!id)
      .map((id) => armorStatsWithPlugs(id, desiredPlugs(id), itemComponents, itemDefinitions)),
    plugsStats(subclassOwned ? Object.values(desiredPlugs(subclassOwned.item.itemInstanceId)) : [], itemDefinitions),
  ]);
  const equippedItems = characterEquipment[characterId]?.items ?? [];
  const equippedSubclass = equippedItems.find(isSubclass);
  const equippedStats = sumStats([
    ...equippedItems.filter((item) => ARMOR_SLOTS.includes(slotOf(item) ?? 0))
      .map((item) => armorStatsWithPlugs(item.itemInstanceId, {}, itemComponents, itemDefinitions)),
    plugsStats(equippedSubclass
      ? editableSocketsOf(equippedSubclass).map((socketIndex) => itemComponents.sockets[equippedSubclass.itemInstanceId]?.sockets[socketIndex]?.plugHash)
      : [], itemDefinitions),
  ]);

  const nameOf = (itemHash?: number) => itemDefinitions[itemHash ?? 0]?.displayProperties.name;
  // The first problem that blocks the save; each message is only built when its check fails
  const validationError = ([
    [countExotics(WEAPON_SLOTS) > 1, () => "Only one exotic weapon can be equipped at a time."],
    [countExotics(ARMOR_SLOTS) > 1, () => "Only one exotic armor piece can be equipped at a time."],
    [!!overEnergyId, () => `Not enough energy for these mods on ${definitionOf(overEnergyId)?.displayProperties.name ?? "an armor piece"}.`],
    [fragmentOverflow !== undefined, () => `Your aspects only allow ${fragmentOverflow} fragments.`],
    [!!fullSlot, () => `Your ${SLOT_NAMES[fullSlot ?? 0]} inventory is full on this character: make room first.`],
    [vaultFull, () => "Your vault is full: items from other characters have to go through it."],
    [!!paidSwap, () => `${nameOf(paidSwap?.plugHash) ?? "A plug"} costs materials on ${nameOf(paidSwap?.item.itemHash) ?? "an item"}: apply it in game first.`],
    [!effective.colorHash || !effective.iconHash || !effective.nameHash, () => "Loadout names, colors and icons are still loading."],
  ] as const).find(([failed]) => failed)?.[1]();

  const saving = savingStep !== null;
  const canSave = !saving && !validationError && (gearChanged || identifiersChanged);

  // Anything picked in the editor since it opened
  const hasEdits = LOADOUT_SLOTS.some((slot) => selection[slot] !== initialSelection[slot])
    || Object.values(plugChanges).some((changes) => Object.keys(changes).length > 0)
    || identifiers.colorHash !== initialIdentifiers.colorHash
    || identifiers.iconHash !== initialIdentifiers.iconHash
    || identifiers.nameHash !== initialIdentifiers.nameHash;

  // Back to the loadout as it was when the editor opened; the editor stays open
  const handleReset = () => {
    setSelection(initialSelection);
    setIdentifiers(initialIdentifiers);
    setPlugChanges({});
    setError(undefined);
  };

  const activeOwned = activeSlot !== null && selection[activeSlot] ? ownedItems.get(selection[activeSlot]) : undefined;
  // Subclass: pick it, then its abilities. Weapons: item, perks, mods. Armor: item, mods
  const tabs: { id: typeof panel; label: string }[] = !activeOwned
    ? []
    : activeSlot === EQUIPMENT_SLOTS.SUBCLASS
      ? [{ id: "items", label: "Subclasses" }, { id: "config", label: "Abilities" }]
      : WEAPON_SLOTS.includes(activeSlot ?? 0)
        ? [{ id: "items", label: "Items" }, { id: "perks", label: "Perks" }, { id: "config", label: "Mods" }]
        : [{ id: "items", label: "Items" }, { id: "config", label: "Mods" }];
  const shownPanel = tabs.some((tab) => tab.id === panel) ? panel : "items";

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

  // Item tooltips open on hover (a click selects) and stay open while the pointer is on the tile or the tooltip
  const hoveredTileRef = useRef<HTMLElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const openTooltip = (owned: OwnedItem, tile: HTMLElement) => {
    const definition = itemDefinitions[owned.item.itemHash];
    if (!definition || saving) return;
    const rect = tile.getBoundingClientRect();
    hoveredTileRef.current = tile;
    showTooltip({
      item: definition,
      itemInstanceId: owned.item.itemInstanceId,
      characterId,
      armor: ARMOR_SLOTS.includes(slotOf(owned.item) ?? 0),
      state: owned.item.state,
      // No transfer buttons: the editor decides where items go
      drawTransfert: false,
      x: rect.right + TOOLTIP_WIDTH + 8 > window.innerWidth ? rect.left - TOOLTIP_WIDTH - 4 : rect.right + 4,
      y: rect.top,
    });
    setTooltipOpen(true);
  };

  useEffect(() => {
    if (!tooltipOpen) return;
    const isOver = (element: Element | null, e: MouseEvent) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isOver(hoveredTileRef.current, e) || isOver(document.querySelector(".item-tooltip"), e)) return;
      hideTooltip();
      setTooltipOpen(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [tooltipOpen, hideTooltip]);

  // Never leave a tooltip behind when the editor closes
  useEffect(() => () => hideTooltip(), [hideTooltip]);

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
    const results = await equipItems(user.membershipType, characterId, ordered);
    const failed = results.filter((result) => result.equipStatus !== 1);
    if (failed.length > 0) {
      const failedNames = failed.map((result) => definitionOf(result.itemInstanceId)?.displayProperties.name ?? "an item");
      throw new Error(`Could not equip ${failedNames.join(", ")}.`);
    }
  };

  const applyPlugs = async (item: Item) => {
    for (const { socketIndex, plugHash } of plugSwapsFor(item)) {
      try {
        await insertSocketPlugFree(user.membershipType, characterId, item.itemInstanceId, socketIndex, plugHash);
      } catch (modError) {
        const modName = itemDefinitions[plugHash]?.displayProperties.name ?? "a mod";
        const itemName = itemDefinitions[item.itemHash]?.displayProperties.name ?? "an item";
        throw new Error(`Could not apply ${modName} on ${itemName}: ${modError instanceof Error ? modError.message : "unknown error"}`);
      }
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError(undefined);

    hideTooltip();
    setTooltipOpen(false);

    try {
      if (!gearChanged) {
        setSavingStep("Saving loadout...");
        await updateLoadoutIdentifiers(user.membershipType, characterId, loadoutIndex, effective);
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

        // Puts the loadout's mods and subclass setup (recorded or picked here) on the items, so the snapshot keeps them
        setSavingStep("Applying perks, mods and subclass setup...");
        for (const { item } of chosen) {
          await applyPlugs(item);
        }

        setSavingStep("Saving loadout...");
        await snapshotLoadout(user.membershipType, characterId, loadoutIndex, effective);
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

  const sectionLabel = "text-xs uppercase tracking-wider text-gray-400";

  // Portaled to <body> so no stacking context of the page can put the header above it.
  // Above the header (1001), below the item tooltip (1005) and its perk popups (1010)
  return createPortal(
    <div className="fixed inset-0 z-[1003] flex flex-col bg-[#141414]/95 backdrop-blur-md text-left animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative size-10 shrink-0 border-2 border-white">
            {colorPath && <Image src={`https://www.bungie.net${colorPath}`} alt="" fill sizes="40px" />}
            {iconPath && <Image src={`https://www.bungie.net${iconPath}`} alt="" fill sizes="40px" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xl text-white font-semibold truncate">{isNew ? "New loadout" : "Edit loadout"}</span>
            <span className="text-sm text-gray-500 truncate">{loadoutName} · Slot {loadoutIndex + 1}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={saving}
          className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 disabled:opacity-40"
          title="Close (Esc)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
        </button>
      </header>

      {/* Body: loadout on the left, item picker on the right */}
      <div className={`flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,480px)_1fr] ${saving ? "pointer-events-none opacity-60" : ""}`}>
        <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar lg:border-r border-white/10">
          <label className="flex flex-col gap-2">
            <span className={sectionLabel}>Name</span>
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

          <div className="flex flex-col gap-2">
            <span className={sectionLabel}>Color</span>
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

          <div className="flex flex-col gap-2">
            <span className={sectionLabel}>Icon</span>
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

          <div className="flex flex-wrap gap-x-6 gap-y-4">
            {SLOT_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <span className={sectionLabel}>{group.label}</span>
                <div className="flex gap-2">
                  {group.slots.map((slot) => {
                    const owned = selection[slot.hash] ? ownedItems.get(selection[slot.hash]) : undefined;
                    const isActive = activeSlot === slot.hash;
                    return (
                      <button
                        key={slot.hash}
                        {...blockItemActions}
                        onClick={() => {
                          setActiveSlot(slot.hash);
                          setSearch("");
                        }}
                        onMouseEnter={(e) => owned && openTooltip(owned, e.currentTarget)}
                        title={owned ? undefined : slot.name}
                        className={`relative size-14 ring-offset-2 ring-offset-[#141414] transition-shadow ${isActive ? "ring-2 ring-[#7e57c2]" : "hover:ring-2 hover:ring-white/30"}`}
                      >
                        {owned ? renderItem(owned, 56) : (
                          <span className="flex size-14 items-center justify-center border-2 border-dashed border-white/20 text-[10px] text-gray-500">{slot.name}</span>
                        )}
                        {(selection[slot.hash] !== initialSelection[slot.hash] || hasPlugChanges(selection[slot.hash])) && (
                          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#7e57c2]" title="Changed" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <LoadoutStats stats={loadoutStats} compareTo={equippedStats} />
        </div>

        {/* Item picker and mod editor for the active slot */}
        <div className="flex flex-col min-h-0 p-6 gap-4 border-t lg:border-t-0 border-white/10">
          {activeSlot !== null && (
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-lg font-medium text-white">{SLOT_NAMES[activeSlot]}</span>
              {tabs.length > 0 && (
                <div className="flex rounded-md bg-white/5 p-0.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPanel(tab.id)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${tab.id === shownPanel ? "bg-[#7e57c2] text-white" : "text-gray-400 hover:text-white"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSlot === null ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-500 text-center">
              Select a slot to choose its item, perks, mods or subclass setup.
            </div>
          ) : shownPanel === "perks" && activeOwned ? (
            <PerkEditor
              key={activeOwned.item.itemInstanceId}
              itemHash={activeOwned.item.itemHash}
              itemInstanceId={activeOwned.item.itemInstanceId}
              plugs={desiredPlugs(activeOwned.item.itemInstanceId)}
              onChange={(socketIndex, plugHash) => changePlug(activeOwned.item.itemInstanceId, socketIndex, plugHash)}
            />
          ) : shownPanel === "config" && activeOwned && isSubclass(activeOwned.item) ? (
            <SubclassEditor
              key={activeOwned.item.itemInstanceId}
              itemHash={activeOwned.item.itemHash}
              itemInstanceId={activeOwned.item.itemInstanceId}
              characterId={characterId}
              plugs={desiredPlugs(activeOwned.item.itemInstanceId)}
              onChange={(socketIndex, plugHash) => changePlug(activeOwned.item.itemInstanceId, socketIndex, plugHash)}
            />
          ) : shownPanel === "config" && activeOwned ? (
            <ModEditor
              key={activeOwned.item.itemInstanceId}
              itemHash={activeOwned.item.itemHash}
              itemInstanceId={activeOwned.item.itemInstanceId}
              characterId={characterId}
              plugs={desiredPlugs(activeOwned.item.itemInstanceId)}
              onChange={(socketIndex, plugHash) => changePlug(activeOwned.item.itemInstanceId, socketIndex, plugHash)}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 shrink-0">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="grow max-w-md bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7e57c2]"
                />
                <span className="ml-auto text-xs text-gray-500 shrink-0">{candidates.length} items</span>
              </div>
              {candidates.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-500">No item available for this slot.</div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] content-start gap-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                  {candidates.map((owned) => {
                    const id = owned.item.itemInstanceId;
                    const isSelected = selection[activeSlot] === id;
                    return (
                      <button
                        key={id}
                        {...blockItemActions}
                        onClick={() => setSelection((prev) => ({ ...prev, [activeSlot]: id }))}
                        onMouseEnter={(e) => openTooltip(owned, e.currentTarget)}
                        className={`flex items-center justify-center rounded-md p-1 transition-colors ${isSelected ? "bg-[#7e57c2]/30 ring-1 ring-[#7e57c2]" : "hover:bg-white/10"}`}
                      >
                        {renderItem(owned, 56)}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 border-t border-white/10 shrink-0">
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          {gearChanged && (
            <>
              {/* Bungie only saves equipped gear, so the save equips the loadout first */}
              <div className="flex flex-col gap-1 text-xs text-gray-400">
                <span className="uppercase tracking-wider text-gray-500">On save</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {incoming.length > 0 && (
                    <li>
                      Move {plural(incoming.length, "item")} to this character:{" "}
                      {incoming.map((owned) => `${itemDefinitions[owned.item.itemHash]?.displayProperties.name ?? "item"} (${sourceLabel(owned)})`).join(", ")}
                    </li>
                  )}
                  {toEquip.length > 0 && <li>Equip {plural(toEquip.length, "item")}</li>}
                  {plannedSwaps.length > 0 && (
                    <li>Apply {plural(plannedSwaps.length, "perk, mod or subclass change")}: they stay on the items</li>
                  )}
                  <li>Record the loadout{restoreGear && toEquip.length > 0 ? ", then re-equip your current gear" : ""}</li>
                </ul>
              </div>
              {toEquip.length > 0 && (
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
              )}
            </>
          )}
          {(error || validationError) && (
            <p className="text-sm text-red-400">{error ?? validationError}</p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {saving && (
            <span className="flex items-center gap-2 text-sm text-gray-300">
              <span className="size-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
              {savingStep}
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={saving || !hasEdits}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo every change made in the editor"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-5 py-2 bg-[#7e57c2] text-white rounded hover:bg-[#6a46ad] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </footer>
    </div>,
    document.body
  );
};

export default LoadoutEditorModal;
