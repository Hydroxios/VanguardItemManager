"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import SubclassEditor from "./SubclassEditor";
import LoadoutStats from "./LoadoutStats";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import { useNotifications } from "@/app/components/NotificationsProvider";
import useEquipSubclass from "@/lib/hooks/useEquipSubclass";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { insertSocketPlugFree } from "@/lib/bungie";
import { countFragments, getEditableSubclassSockets, getFragmentCapacity, planSubclassChanges } from "@/lib/helpers/subclass";
import { ARMOR_STAT_HASHES, statsWithSubclassChange, StatTotals } from "@/lib/helpers/stats";
import { ITEM_TYPES } from "@/lib/constants";

interface SubclassEditorModalProps {
  itemHash: number;
  itemInstanceId: string;
  characterId: string;
  onClose: () => void;
}

/** Edits the super, abilities, aspects and fragments of a subclass the character holds, and applies them in game. */
const SubclassEditorModal = ({ itemHash, itemInstanceId, characterId, onClose }: SubclassEditorModalProps) => {
  const { user, characters, characterEquipment, itemComponents, plugSets, setItemComponentsLocally, setCharacterStatsLocally } = useProfile();
  const { itemDefinitions } = useDefinitions();
  const { hideTooltip } = useItemTooltipActions();
  const { addNotification } = useNotifications();
  const equipSubclass = useEquipSubclass(characterId);

  // Plugs picked in the editor, by socket index; the others keep what the subclass has now
  const [changes, setChanges] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const definition = itemDefinitions[itemHash];
  const { groups } = useMemo(
    () => getEditableSubclassSockets(definition, { itemInstanceId, characterId, itemComponents, plugSets, itemDefinitions }),
    [definition, itemInstanceId, characterId, itemComponents, plugSets, itemDefinitions]
  );

  const socketsComponent = itemComponents.sockets[itemInstanceId];
  const currentSockets = socketsComponent?.sockets ?? [];
  const currentPlugs = useMemo(() => {
    const plugs: Record<number, number> = {};
    groups.flatMap((group) => group.socketIndexes).forEach((socketIndex) => {
      const plugHash = socketsComponent?.sockets[socketIndex]?.plugHash;
      if (plugHash) plugs[socketIndex] = plugHash;
    });
    return plugs;
  }, [groups, socketsComponent]);
  const desired = { ...currentPlugs, ...changes };

  const fragmentCapacity = getFragmentCapacity(groups, desired, itemDefinitions);
  const fragmentOverflow = !!definition && fragmentCapacity !== undefined && countFragments(groups, desired, definition) > fragmentCapacity;
  const steps = definition
    ? planSubclassChanges(definition, groups, currentSockets.map((socket) => socket.plugHash), desired, fragmentCapacity)
    : [];
  const canApply = steps.length > 0 && !fragmentOverflow && !saving;
  // Equipping works without changes too
  const canApplyAndEquip = !fragmentOverflow && !saving;

  // The character's stats now, and once this subclass is applied (and equipped, when it isn't): the fragments of the
  // equipped subclass make way for the ones picked here
  const character = characters[characterId];
  const equippedSubclass = characterEquipment[characterId]?.items
    .find((item) => itemDefinitions[item.itemHash]?.itemType === ITEM_TYPES.SUBCLASS);
  const isEquipped = equippedSubclass?.itemInstanceId === itemInstanceId;
  const toTotals = (stats: Record<string, number>): StatTotals => Object.fromEntries(ARMOR_STAT_HASHES.map((hash) => [hash, stats[hash] ?? 0]));
  const statsNow = character ? toTotals(character.stats) : undefined;
  const statsAfter = character && toTotals(statsWithSubclassChange(
    character.stats,
    (itemComponents.sockets[equippedSubclass?.itemInstanceId ?? ""]?.sockets ?? []).map((socket) => socket.plugHash),
    currentSockets.map((socket, socketIndex) => desired[socketIndex] ?? socket.plugHash),
    itemDefinitions,
    character.classType
  ));

  const changePlug = (socketIndex: number, plugHash: number) => {
    setError(undefined);
    setChanges((prev) => {
      const next = { ...prev };
      if (currentPlugs[socketIndex] === plugHash) delete next[socketIndex];
      else next[socketIndex] = plugHash;
      return next;
    });
  };

  // Escape closes the editor, unless changes are being applied
  useModalKeys(onClose, { canClose: !saving });

  /** Applies the changes, then equips the subclass when asked (and only if every change went in). */
  const handleApply = async (andEquip: boolean) => {
    if (andEquip ? !canApplyAndEquip : !canApply) return;
    hideTooltip();
    setSaving(true);
    setError(undefined);
    // The plugs as they go in, to update the character's stats with what actually got applied
    const initialPlugs = currentSockets.map((socket) => socket.plugHash);
    const appliedPlugs = [...initialPlugs];
    try {
      for (const { socketIndex, plugHash } of steps) {
        try {
          const changed = await insertSocketPlugFree(user.membershipType, characterId, itemInstanceId, socketIndex, plugHash);
          setItemComponentsLocally(itemInstanceId, changed);
          appliedPlugs[socketIndex] = plugHash;
        } catch (plugError) {
          const plugName = itemDefinitions[plugHash]?.displayProperties.name ?? "a plug";
          throw new Error(`Could not apply ${plugName}: ${plugError instanceof Error ? plugError.message : "unknown error"}`);
        }
      }
      if (andEquip) {
        try {
          // Its stats come from the plugs just applied, which the profile doesn't have yet
          await equipSubclass(itemInstanceId, appliedPlugs);
        } catch (equipError) {
          throw new Error(`Could not equip ${definition?.displayProperties.name ?? "the subclass"}: ${equipError instanceof Error ? equipError.message : "unknown error"}`);
        }
      }
      const icon = definition ? `https://www.bungie.net${definition.displayProperties.icon}` : "";
      addNotification(andEquip ? "Subclass equipped" : "Subclass updated", definition?.displayProperties.name ?? "", "success", icon, 5000);
      // No refresh: Bungie serves a cached profile for a while after a change, which would undo the local update
      onClose();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to update the subclass.");
      // The plugs that went in before the failure are already applied locally: the remaining changes are dropped
      setChanges({});
    } finally {
      // Only the equipped subclass counts in the character's stats
      if (character && isEquipped) {
        setCharacterStatsLocally(characterId, statsWithSubclassChange(character.stats, initialPlugs, appliedPlugs, itemDefinitions, character.classType));
      }
      setSaving(false);
    }
  };

  if (!definition) return null;

  // Portaled to <body>, above the header (1001) and below the item tooltip (1005)
  return createPortal(
    <div className="fixed inset-0 z-[1003] flex flex-col bg-[#141414]/95 backdrop-blur-md text-left animate-fade-in">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative size-10 shrink-0">
            <Image src={`https://www.bungie.net${definition.displayProperties.icon}`} alt="" fill sizes="40px" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xl text-white font-semibold truncate">Edit subclass</span>
            <span className="text-sm text-gray-500 truncate">{definition.displayProperties.name}</span>
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

      <div className={`flex flex-1 min-h-0 flex-col lg:flex-row gap-6 p-6 ${saving ? "pointer-events-none opacity-60" : ""}`}>
        <div className="flex flex-1 min-h-0 flex-col">
          <SubclassEditor
            itemHash={itemHash}
            itemInstanceId={itemInstanceId}
            characterId={characterId}
            plugs={desired}
            onChange={changePlug}
          />
        </div>
        {statsNow && statsAfter && (
          <aside className="shrink-0 lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6">
            <LoadoutStats stats={statsAfter} compareTo={statsNow} compareLabel={isEquipped ? "vs now" : "if equipped, vs now"} />
          </aside>
        )}
      </div>

      <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
        {error ? (
          <span className="mr-auto text-sm text-red-400">{error}</span>
        ) : fragmentOverflow ? (
          <span className="mr-auto text-sm text-red-400">Your aspects only open {fragmentCapacity} fragment sockets.</span>
        ) : saving ? (
          <span className="mr-auto text-sm text-gray-400">Applying...</span>
        ) : null}
        <button
          onClick={() => {
            setChanges({});
            setError(undefined);
          }}
          disabled={saving || Object.keys(changes).length === 0}
          className="px-4 py-2 text-sm text-gray-300 rounded-md hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Reset
        </button>
        <button
          onClick={() => handleApply(false)}
          disabled={!canApply}
          className={`px-4 py-2 text-sm rounded-md transition-colors disabled:opacity-40 ${isEquipped
            ? "text-white bg-[#7e57c2] hover:bg-[#8e67d2] disabled:hover:bg-[#7e57c2]"
            : "text-gray-200 bg-white/10 hover:bg-white/20 disabled:hover:bg-white/10"}`}
        >
          Apply
        </button>
        {!isEquipped && (
          <button
            onClick={() => handleApply(true)}
            disabled={!canApplyAndEquip}
            title={steps.length > 0 ? "Apply the changes, then equip this subclass" : "Equip this subclass"}
            className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors disabled:opacity-40 disabled:hover:bg-[#7e57c2]"
          >
            {steps.length > 0 ? "Apply & equip" : "Equip"}
          </button>
        )}
      </footer>
    </div>,
    document.body
  );
};

export default SubclassEditorModal;
