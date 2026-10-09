"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import SubclassEditor from "./SubclassEditor";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { insertSocketPlugFree } from "@/lib/bungie";
import { countFragments, getEditableSubclassSockets, getFragmentCapacity, planSubclassChanges } from "@/lib/helpers/subclass";

interface SubclassEditorModalProps {
  itemHash: number;
  itemInstanceId: string;
  characterId: string;
  onClose: () => void;
}

/** Edits the super, abilities, aspects and fragments of a subclass the character holds, and applies them in game. */
const SubclassEditorModal = ({ itemHash, itemInstanceId, characterId, onClose }: SubclassEditorModalProps) => {
  const { user, itemComponents, plugSets, setItemComponentsLocally } = useProfile();
  const { itemDefinitions } = useDefinitions();
  const { hideTooltip } = useItemTooltipActions();
  const { addNotification } = useNotifications();

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose]);

  const handleApply = async () => {
    if (!canApply) return;
    hideTooltip();
    setSaving(true);
    setError(undefined);
    try {
      for (const { socketIndex, plugHash } of steps) {
        try {
          const changed = await insertSocketPlugFree(user.membershipType, characterId, itemInstanceId, socketIndex, plugHash);
          setItemComponentsLocally(itemInstanceId, changed);
        } catch (plugError) {
          const plugName = itemDefinitions[plugHash]?.displayProperties.name ?? "a plug";
          throw new Error(`Could not apply ${plugName}: ${plugError instanceof Error ? plugError.message : "unknown error"}`);
        }
      }
      addNotification("Subclass updated", definition?.displayProperties.name ?? "", "success", definition ? `https://www.bungie.net${definition.displayProperties.icon}` : "", 5000);
      // No refresh: Bungie serves a cached profile for a while after a change, which would undo the local update
      onClose();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to update the subclass.");
      // The plugs that went in before the failure are already applied locally: the remaining changes are dropped
      setChanges({});
    } finally {
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

      <div className={`flex flex-1 min-h-0 flex-col p-6 ${saving ? "pointer-events-none opacity-60" : ""}`}>
        <SubclassEditor
          itemHash={itemHash}
          itemInstanceId={itemInstanceId}
          characterId={characterId}
          plugs={desired}
          onChange={changePlug}
        />
      </div>

      <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
        {error ? (
          <span className="mr-auto text-sm text-red-400">{error}</span>
        ) : fragmentOverflow ? (
          <span className="mr-auto text-sm text-red-400">Your aspects only open {fragmentCapacity} fragment sockets.</span>
        ) : saving ? (
          <span className="mr-auto text-sm text-gray-400">Applying changes...</span>
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
          onClick={handleApply}
          disabled={!canApply}
          className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors disabled:opacity-40 disabled:hover:bg-[#7e57c2]"
        >
          Apply
        </button>
      </footer>
    </div>,
    document.body
  );
};

export default SubclassEditorModal;
