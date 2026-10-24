"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import ModEditor from "./ModEditor";
import PerkEditor from "./PerkEditor";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import { useNotifications } from "@/app/components/NotificationsProvider";
import useTransferItem from "@/lib/hooks/useTransferItem";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { insertSocketPlugFree } from "@/lib/bungie";
import { getCosmeticSockets, getEnergyCapacity, getEnergyCost, getModSockets, getPerkSockets, planModChanges } from "@/lib/helpers/mods";
import { ITEM_TYPES, SOCKET_CATEGORIES } from "@/lib/constants";
import { useT } from "@/lib/i18n";

interface ModEditorModalProps {
  itemHash: number;
  itemInstanceId: string;
  onClose: () => void;
}

type Panel = "mods" | "perks" | "cosmetics";

/** Edits the mods, perks and cosmetics of one weapon or armor piece a character holds, and applies them in game. */
const ModEditorModal = ({ itemHash, itemInstanceId, onClose }: ModEditorModalProps) => {
  const { user, itemComponents, setItemComponentsLocally } = useProfile();
  const { itemDefinitions } = useDefinitions();
  const { hideTooltip } = useItemTooltipActions();
  const { addNotification } = useNotifications();
  const { locateItem } = useTransferItem();
  const t = useT();

  // Plugs picked in the editor, by socket index; the others keep what the item has now
  const [changes, setChanges] = useState<Record<number, number>>({});
  const [panel, setPanel] = useState<Panel>("mods");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const definition = itemDefinitions[itemHash];
  // Bungie only inserts plugs in items a character holds
  const location = locateItem(itemInstanceId).location;
  const characterId = location && location !== "vault" ? location : undefined;

  const socketsComponent = itemComponents.sockets[itemInstanceId];
  const currentSockets = socketsComponent?.sockets ?? [];
  const modSockets = useMemo(() => getModSockets(definition, itemDefinitions), [definition, itemDefinitions]);
  const currentPlugs = useMemo(() => {
    const plugs: Record<number, number> = {};
    const socketIndexes = [
      ...modSockets.map((socket) => socket.socketIndex),
      ...getCosmeticSockets(definition, itemInstanceId, itemComponents).map((socket) => socket.socketIndex),
      ...getPerkSockets(definition, itemInstanceId, itemComponents),
    ];
    socketIndexes.forEach((socketIndex) => {
      const plugHash = socketsComponent?.sockets[socketIndex]?.plugHash;
      if (plugHash) plugs[socketIndex] = plugHash;
    });
    return plugs;
  }, [modSockets, definition, itemInstanceId, itemComponents, socketsComponent]);
  const desired = { ...currentPlugs, ...changes };

  const energyCapacity = getEnergyCapacity(itemInstanceId, itemComponents, itemDefinitions);
  const energyUsed = modSockets
    .filter((socket) => socket.categoryHash === SOCKET_CATEGORIES.ARMOR_MODS)
    .reduce((total, socket) => total + getEnergyCost(itemDefinitions[desired[socket.socketIndex]]), 0);
  const energyOverflow = energyCapacity !== undefined && energyUsed > energyCapacity;

  const steps = planModChanges(currentSockets.map((socket) => socket.plugHash), changes, itemDefinitions);
  const canApply = !!characterId && steps.length > 0 && !energyOverflow && !saving;

  const tabs: { id: Panel; label: string }[] = definition?.itemType === ITEM_TYPES.WEAPON
    ? [{ id: "perks", label: t.editor.tabs.perks }, { id: "mods", label: t.editor.tabs.mods }, { id: "cosmetics", label: t.editor.tabs.cosmetics }]
    : [{ id: "mods", label: t.editor.tabs.mods }, { id: "cosmetics", label: t.editor.tabs.cosmetics }];

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

  const handleApply = async () => {
    if (!canApply || !characterId) return;
    hideTooltip();
    setSaving(true);
    setError(undefined);
    try {
      for (const { socketIndex, plugHash } of steps) {
        try {
          const changed = await insertSocketPlugFree(user.membershipType, characterId, itemInstanceId, socketIndex, plugHash);
          setItemComponentsLocally(itemInstanceId, changed);
        } catch (plugError) {
          const plugName = itemDefinitions[plugHash]?.displayProperties.name ?? t.editor.aMod;
          throw new Error(t.modEditor.couldNotApply(plugName, plugError instanceof Error ? plugError.message : t.editor.unknownError));
        }
      }
      const icon = definition ? `https://www.bungie.net${definition.displayProperties.icon}` : "";
      addNotification(t.modEditor.updated, definition?.displayProperties.name ?? "", "success", icon, 5000);
      // No refresh: Bungie serves a cached profile for a while after a change, which would undo the local update
      onClose();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : t.modEditor.failed);
      // The plugs that went in before the failure are already applied locally: the remaining changes are dropped
      setChanges({});
    } finally {
      setSaving(false);
    }
  };

  if (!definition) return null;

  const editorProps = {
    itemHash,
    itemInstanceId,
    characterId: characterId ?? "",
    plugs: desired,
    onChange: changePlug,
  };

  // React events bubble out of a portal to the item's parents (equip on double click, drop zones...): stop them here
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  // Portaled to <body>, above the header (1001) and below the item tooltip (1005)
  return createPortal(
    <div
      onClick={stop}
      onDoubleClick={stop}
      onContextMenu={stop}
      onMouseDown={stop}
      onDragStart={stop}
      className="fixed inset-0 z-[1003] flex flex-col bg-[#141414]/95 backdrop-blur-md text-left animate-fade-in"
    >
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative size-10 shrink-0">
            <Image src={`https://www.bungie.net${definition.displayProperties.icon}`} alt="" fill sizes="40px" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xl text-white font-semibold truncate">{t.modEditor.title}</span>
            <span className="text-sm text-gray-500 truncate">{definition.displayProperties.name}</span>
          </div>
          <div className="flex rounded-md bg-white/5 p-0.5 ml-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPanel(tab.id)}
                className={`px-3 py-1 text-sm rounded transition-colors ${tab.id === panel ? "bg-[#7e57c2] text-white" : "text-gray-400 hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
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

      <div className={`flex flex-1 min-h-0 flex-col p-6 ${saving ? "pointer-events-none opacity-60" : ""}`}>
        {panel === "perks" ? (
          <PerkEditor {...editorProps} />
        ) : panel === "cosmetics" ? (
          <ModEditor key="cosmetics" kind="cosmetics" {...editorProps} />
        ) : (
          <ModEditor key="mods" {...editorProps} />
        )}
      </div>

      <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
        {error ? (
          <span className="mr-auto text-sm text-red-400">{error}</span>
        ) : !characterId ? (
          <span className="mr-auto text-sm text-gray-400">{t.modEditor.inVault}</span>
        ) : energyOverflow ? (
          <span className="mr-auto text-sm text-red-400">{t.modEditor.notEnoughEnergy(energyUsed, energyCapacity ?? 0)}</span>
        ) : saving ? (
          <span className="mr-auto text-sm text-gray-400">{t.modEditor.applying}</span>
        ) : null}
        <button
          onClick={() => {
            setChanges({});
            setError(undefined);
          }}
          disabled={saving || Object.keys(changes).length === 0}
          className="px-4 py-2 text-sm text-gray-300 rounded-md hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {t.common.reset}
        </button>
        <button
          onClick={handleApply}
          disabled={!canApply}
          className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors disabled:opacity-40 disabled:hover:bg-[#7e57c2]"
        >
          {t.modEditor.apply(steps.length)}
        </button>
      </footer>
    </div>,
    document.body
  );
};

export default ModEditorModal;
