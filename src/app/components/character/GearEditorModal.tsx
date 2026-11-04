"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ItemComponent from "./Item";
import ModEditor from "./ModEditor";
import PerkEditor from "./PerkEditor";
import SubclassEditor from "./SubclassEditor";
import ArtifactEditor from "./ArtifactEditor";
import LoadoutStats from "./LoadoutStats";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import { useNotifications } from "@/app/components/NotificationsProvider";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { insertSocketPlugFree } from "@/lib/bungie";
import { getCosmeticSockets, getEnergyCapacity, getEnergyCost, getModSockets, getPerkSockets, planModChanges } from "@/lib/helpers/mods";
import { countFragments, getEditableSubclassSockets, getFragmentCapacity, planSubclassChanges } from "@/lib/helpers/subclass";
import { getEditableArtifactSockets, planArtifactChanges } from "@/lib/helpers/artifact";
import { LOADOUT_SLOTS, SLOT_GROUPS, SLOT_KEYS } from "@/lib/helpers/loadouts";
import { armorStatsWithPlugs, plugsStats, statsWithChange, sumStats } from "@/lib/helpers/stats";
import { ARMOR_SLOTS, EQUIPMENT_SLOTS, SOCKET_CATEGORIES, WEAPON_SLOTS } from "@/lib/constants";
import { Item } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface GearEditorModalProps {
  characterId: string;
  onClose: () => void;
}

type Panel = "perks" | "mods" | "cosmetics" | "config";

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

/**
 * Edits the whole equipped gear of a character at once: subclass setup, weapon perks, mods and cosmetics of every
 * weapon and armor piece, and the artifact's perks. The changes are applied in game in one go.
 */
const GearEditorModal = ({ characterId, onClose }: GearEditorModalProps) => {
  const { user, characters, characterEquipment, itemComponents, plugSets, setItemComponentsLocally, setCharacterStatsLocally } = useProfile();
  const { itemDefinitions } = useDefinitions();
  const { showTooltip, hideTooltip, scheduleHide } = useItemTooltipActions();
  const { addNotification } = useNotifications();
  const t = useT();

  const character = characters[characterId];
  const classType = character?.classType;

  const slotOf = (item: Item) => itemDefinitions[item.itemHash]?.inventory?.bucketTypeHash;
  // The equipped item of each slot
  const equipped = useMemo(() => {
    const bySlot: Record<number, Item> = {};
    characterEquipment[characterId]?.items.forEach((item) => {
      const slot = itemDefinitions[item.itemHash]?.inventory?.bucketTypeHash;
      if (slot && LOADOUT_SLOTS.includes(slot) && item.itemInstanceId) bySlot[slot] = item;
    });
    return bySlot;
  }, [characterEquipment, characterId, itemDefinitions]);
  const equippedItems = LOADOUT_SLOTS.map((slot) => equipped[slot]).filter((item): item is Item => !!item);

  const [activeSlot, setActiveSlot] = useState<number>(EQUIPMENT_SLOTS.PRIMARY);
  const [panel, setPanel] = useState<Panel>("mods");
  // Plugs picked in the editor, by item instance id then socket index; the others keep what the item has now
  const [plugChanges, setPlugChanges] = useState<Record<string, Record<number, number>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const isSubclass = (item: Item) => slotOf(item) === EQUIPMENT_SLOTS.SUBCLASS;
  const isArtifact = (item: Item) => slotOf(item) === EQUIPMENT_SLOTS.ARTIFACT;
  const socketContext = (item: Item) => ({ itemInstanceId: item.itemInstanceId, characterId, itemComponents, plugSets, itemDefinitions });
  const subclassGroupsOf = (item: Item) => getEditableSubclassSockets(itemDefinitions[item.itemHash], socketContext(item)).groups;
  const artifactSocketsOf = (item: Item) => getEditableArtifactSockets(itemDefinitions[item.itemHash], socketContext(item))
    .tiers.flatMap((tier) => tier.socketIndexes);
  const editableSocketsOf = (item: Item) => isSubclass(item)
    ? subclassGroupsOf(item).flatMap((group) => group.socketIndexes)
    : isArtifact(item)
    ? artifactSocketsOf(item)
    : [
      ...getModSockets(itemDefinitions[item.itemHash], itemDefinitions).map((socket) => socket.socketIndex),
      ...getPerkSockets(itemDefinitions[item.itemHash], item.itemInstanceId, itemComponents),
      ...getCosmeticSockets(itemDefinitions[item.itemHash], item.itemInstanceId, itemComponents).map((socket) => socket.socketIndex),
    ];

  const currentPlugs = (item: Item): Record<number, number> => {
    const sockets = itemComponents.sockets[item.itemInstanceId]?.sockets ?? [];
    const plugs: Record<number, number> = {};
    editableSocketsOf(item).forEach((socketIndex) => {
      const plugHash = sockets[socketIndex]?.plugHash;
      if (plugHash) plugs[socketIndex] = plugHash;
    });
    return plugs;
  };
  const desiredPlugs = (item: Item) => ({ ...currentPlugs(item), ...plugChanges[item.itemInstanceId] });

  const changePlug = (item: Item, socketIndex: number, plugHash: number) => {
    setError(undefined);
    setPlugChanges((prev) => {
      const changes = { ...prev[item.itemInstanceId] };
      if (currentPlugs(item)[socketIndex] === plugHash) delete changes[socketIndex];
      else changes[socketIndex] = plugHash;
      return { ...prev, [item.itemInstanceId]: changes };
    });
  };
  const hasPlugChanges = (item?: Item) => !!item && Object.keys(plugChanges[item.itemInstanceId] ?? {}).length > 0;

  /** The insertions that give an item its desired plugs, in an order the game accepts. */
  const plugSwapsFor = (item: Item) => {
    const current = (itemComponents.sockets[item.itemInstanceId]?.sockets ?? []).map((socket) => socket.plugHash);
    const desired = desiredPlugs(item);
    const definition = itemDefinitions[item.itemHash];
    if (isSubclass(item) && definition) {
      const groups = subclassGroupsOf(item);
      return planSubclassChanges(definition, groups, current, desired, getFragmentCapacity(groups, desired, itemDefinitions));
    }
    if (isArtifact(item) && definition) return planArtifactChanges(definition, artifactSocketsOf(item), current, desired);
    return planModChanges(current, plugChanges[item.itemInstanceId] ?? {}, itemDefinitions);
  };
  const plannedSwaps = equippedItems.filter(hasPlugChanges).flatMap((item) => plugSwapsFor(item).map((swap) => ({ item, ...swap })));

  const energyUsed = (item: Item) => {
    const plugs = desiredPlugs(item);
    return getModSockets(itemDefinitions[item.itemHash], itemDefinitions)
      .filter((socket) => socket.categoryHash === SOCKET_CATEGORIES.ARMOR_MODS)
      .reduce((total, socket) => total + getEnergyCost(itemDefinitions[plugs[socket.socketIndex]]), 0);
  };
  const overEnergy = equippedItems.find((item) => {
    const capacity = getEnergyCapacity(item.itemInstanceId, itemComponents, itemDefinitions);
    return capacity !== undefined && energyUsed(item) > capacity;
  });
  const subclass = equipped[EQUIPMENT_SLOTS.SUBCLASS];
  const fragmentOverflow = (() => {
    const definition = subclass && itemDefinitions[subclass.itemHash];
    if (!subclass || !definition) return undefined;
    const groups = subclassGroupsOf(subclass);
    const plugs = desiredPlugs(subclass);
    const capacity = getFragmentCapacity(groups, plugs, itemDefinitions);
    return capacity !== undefined && countFragments(groups, plugs, definition) > capacity ? capacity : undefined;
  })();

  const validationError = overEnergy
    ? t.editor.notEnoughEnergy(itemDefinitions[overEnergy.itemHash]?.displayProperties.name)
    : fragmentOverflow !== undefined
    ? t.editor.tooManyFragments(fragmentOverflow)
    : undefined;
  const canApply = plannedSwaps.length > 0 && !validationError && !saving;

  // Armor stats with the plugs given by `plugsOf` (armor mods and subclass fragments)
  const gearStats = (plugsOf: (item: Item) => Record<number, number>) => sumStats([
    ...ARMOR_SLOTS.map((slot) => equipped[slot]).filter((item): item is Item => !!item)
      .map((item) => armorStatsWithPlugs(item.itemInstanceId, plugsOf(item), itemComponents, itemDefinitions)),
    plugsStats(subclass ? Object.values(plugsOf(subclass)) : [], itemDefinitions, classType),
  ]);
  const statsNow = gearStats(currentPlugs);
  const statsAfter = gearStats(desiredPlugs);

  const activeItem = equipped[activeSlot];
  const tabs: { id: Panel; label: string }[] = !activeItem
    ? []
    : activeSlot === EQUIPMENT_SLOTS.SUBCLASS
      ? [{ id: "config", label: t.editor.tabs.abilities }]
      : activeSlot === EQUIPMENT_SLOTS.ARTIFACT
      ? [{ id: "config", label: t.editor.tabs.perks }]
      : WEAPON_SLOTS.includes(activeSlot)
        ? [{ id: "perks", label: t.editor.tabs.perks }, { id: "mods", label: t.editor.tabs.mods }, { id: "cosmetics", label: t.editor.tabs.cosmetics }]
        : [{ id: "mods", label: t.editor.tabs.mods }, { id: "cosmetics", label: t.editor.tabs.cosmetics }];
  // Each slot opens on its first tab unless the picked one exists for it
  const shownPanel = tabs.some((tab) => tab.id === panel) ? panel : tabs[0]?.id;

  // Item tooltips open on hover (a click selects) and stay open while the pointer is on the tile or the tooltip
  const openTooltip = (item: Item, tile: HTMLElement) => {
    const definition = itemDefinitions[item.itemHash];
    if (!definition || saving) return;
    const { left, top, right, bottom } = tile.getBoundingClientRect();
    showTooltip({
      item: definition,
      itemInstanceId: item.itemInstanceId,
      characterId,
      state: item.state,
      drawTransfert: false,
      anchor: { left, top, right, bottom },
      anchorElement: tile,
    });
  };

  // Never leave a tooltip behind when the editor closes
  useEffect(() => () => hideTooltip(), [hideTooltip]);

  // Escape closes the editor, unless changes are being applied
  useModalKeys(onClose, { canClose: !saving });

  const handleApply = async () => {
    if (!canApply) return;
    hideTooltip();
    setSaving(true);
    setError(undefined);
    // The plugs that actually went in, by item, to update the character's stats with them
    const applied: Record<string, Record<number, number>> = {};
    try {
      for (const { item, socketIndex, plugHash } of plannedSwaps) {
        try {
          const changed = await insertSocketPlugFree(user.membershipType, characterId, item.itemInstanceId, socketIndex, plugHash);
          setItemComponentsLocally(item.itemInstanceId, changed);
          applied[item.itemInstanceId] = { ...applied[item.itemInstanceId], [socketIndex]: plugHash };
        } catch (plugError) {
          const plugName = itemDefinitions[plugHash]?.displayProperties.name ?? t.editor.aMod;
          const itemName = itemDefinitions[item.itemHash]?.displayProperties.name ?? t.editor.anItem;
          throw new Error(t.editor.couldNotApply(plugName, itemName, plugError instanceof Error ? plugError.message : t.editor.unknownError));
        }
      }
      addNotification(t.gearEditor.updated, t.gearEditor.changeCount(plannedSwaps.length), "success", "", 5000);
      // No refresh: Bungie serves a cached profile for a while after a change, which would undo the local update
      onClose();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : t.gearEditor.failed);
      // The plugs that went in before the failure are already applied locally: the remaining changes are dropped
      setPlugChanges({});
    } finally {
      if (character) {
        const statsApplied = gearStats((item) => ({ ...currentPlugs(item), ...applied[item.itemInstanceId] }));
        setCharacterStatsLocally(characterId, statsWithChange(character.stats, statsNow, statsApplied));
      }
      setSaving(false);
    }
  };

  const editorProps = (item: Item) => ({
    itemHash: item.itemHash,
    itemInstanceId: item.itemInstanceId,
    characterId,
    plugs: desiredPlugs(item),
    onChange: (socketIndex: number, plugHash: number) => changePlug(item, socketIndex, plugHash),
  });

  const sectionLabel = "text-xs uppercase tracking-wider text-gray-400";

  // Portaled to <body>, above the header (1001), below the item tooltip (1005) and its perk popups (1010)
  return createPortal(
    <div className="fixed inset-0 z-[1003] flex flex-col bg-[#141414]/95 backdrop-blur-md text-left animate-fade-in">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="text-xl text-white font-semibold truncate">{t.gearEditor.title}</span>
          <span className="text-sm text-gray-500 truncate">{t.gearEditor.subtitle}</span>
        </div>
        <button
          onClick={onClose}
          disabled={saving}
          className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 disabled:opacity-40"
          title={t.common.closeEsc}
          aria-label={t.common.close}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
        </button>
      </header>

      {/* Body: equipped gear on the left, editor of the active slot on the right */}
      <div className={`flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,480px)_1fr] ${saving ? "pointer-events-none opacity-60" : ""}`}>
        <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar lg:border-r border-white/10">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            {SLOT_GROUPS.map((group) => (
              <div key={group.id} className="flex flex-col gap-2">
                <span className={sectionLabel}>{t.editor.groups[group.id]}</span>
                <div className="flex gap-2">
                  {group.slots.map((slot) => {
                    const item = equipped[slot.hash];
                    const isActive = activeSlot === slot.hash;
                    return (
                      <button
                        key={slot.hash}
                        {...blockItemActions}
                        onClick={() => setActiveSlot(slot.hash)}
                        onMouseEnter={(e) => item && openTooltip(item, e.currentTarget)}
                        onMouseLeave={scheduleHide}
                        title={item ? undefined : t.editor.slots[slot.key]}
                        className={`relative size-14 ring-offset-2 ring-offset-[#141414] transition-shadow ${isActive ? "ring-2 ring-[#7e57c2]" : "hover:ring-2 hover:ring-white/30"}`}
                      >
                        {item && itemDefinitions[item.itemHash] ? (
                          <ItemComponent
                            itemHash={item.itemHash}
                            itemInstanceId={item.itemInstanceId}
                            state={item.state}
                            characterId={characterId}
                            ornamentItem={item.overrideStyleItemHash ? itemDefinitions[item.overrideStyleItemHash] : undefined}
                            size={56}
                            tooltipDisabled
                          />
                        ) : (
                          <span className="flex size-14 items-center justify-center border-2 border-dashed border-white/20 text-[10px] text-gray-500">{t.editor.slots[slot.key]}</span>
                        )}
                        {hasPlugChanges(item) && (
                          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#7e57c2]" title={t.editor.changed} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <LoadoutStats stats={statsAfter} compareTo={statsNow} compareLabel={t.plugs.vsNow} />
        </div>

        <div className="flex flex-col min-h-0 p-6 gap-4 border-t lg:border-t-0 border-white/10">
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-lg font-medium text-white">{t.editor.slots[SLOT_KEYS[activeSlot]]}</span>
            {tabs.length > 1 && (
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

          {!activeItem ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-500">{t.gearEditor.emptySlot}</div>
          ) : shownPanel === "config" && isSubclass(activeItem) ? (
            <SubclassEditor key={activeItem.itemInstanceId} {...editorProps(activeItem)} />
          ) : shownPanel === "config" ? (
            <ArtifactEditor key={activeItem.itemInstanceId} {...editorProps(activeItem)} />
          ) : shownPanel === "perks" ? (
            <PerkEditor key={activeItem.itemInstanceId} {...editorProps(activeItem)} />
          ) : shownPanel === "cosmetics" ? (
            <ModEditor key={`${activeItem.itemInstanceId}-cosmetics`} kind="cosmetics" {...editorProps(activeItem)} />
          ) : (
            <ModEditor key={activeItem.itemInstanceId} {...editorProps(activeItem)} />
          )}
        </div>
      </div>

      <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
        {error || validationError ? (
          <span className="mr-auto text-sm text-red-400">{error ?? validationError}</span>
        ) : saving ? (
          <span className="mr-auto text-sm text-gray-400">{t.modEditor.applying}</span>
        ) : null}
        <button
          onClick={() => {
            setPlugChanges({});
            setError(undefined);
          }}
          disabled={saving || plannedSwaps.length === 0}
          className="px-4 py-2 text-sm text-gray-300 rounded-md hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {t.common.reset}
        </button>
        <button
          onClick={handleApply}
          disabled={!canApply}
          className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors disabled:opacity-40 disabled:hover:bg-[#7e57c2]"
        >
          {t.modEditor.apply(plannedSwaps.length)}
        </button>
      </footer>
    </div>,
    document.body
  );
};

export default GearEditorModal;
