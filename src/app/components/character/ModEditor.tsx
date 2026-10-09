"use client";

import React, { useMemo, useState } from "react";
import PlugIcon from "./PlugIcon";
import PlugTooltip, { plugTooltipContent, usePlugTooltip } from "../tooltip/PlugTooltip";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { getAvailablePlugs, getCosmeticSockets, getEnergyCapacity, getEnergyCost, getModSockets, isFreePlug } from "@/lib/helpers/mods";
import { SOCKET_CATEGORIES } from "@/lib/constants";
import { ItemDefinition } from "@/lib/types";
import DestinyText from "@/app/components/destiny-ui/DestinyText";

interface ModEditorProps {
  itemHash: number;
  itemInstanceId: string;
  characterId: string;
  /** Plug wanted in each mod socket, by socket index */
  plugs: Record<number, number>;
  onChange: (socketIndex: number, plugHash: number) => void;
  /** "cosmetics" edits the ornament and shader sockets instead of the mods */
  kind?: "mods" | "cosmetics";
}

/** Picks the mod (or ornament and shader) of each socket of one item. Changes are reported to the parent, which applies them. */
const ModEditor = ({ itemHash, itemInstanceId, characterId, plugs, onChange, kind = "mods" }: ModEditorProps) => {
  const { itemComponents, plugSets } = useProfile();
  const { itemDefinitions, perksDefinitions, materialRequirementDefinitions } = useDefinitions();

  const definition = itemDefinitions[itemHash];
  const modSockets = useMemo(
    () => kind === "cosmetics" ? getCosmeticSockets(definition, itemInstanceId, itemComponents) : getModSockets(definition, itemDefinitions),
    [kind, definition, itemInstanceId, itemComponents, itemDefinitions]
  );
  const label = kind === "cosmetics" ? "cosmetics" : "mods";
  const [activeSocket, setActiveSocket] = useState<number | undefined>(modSockets[0]?.socketIndex);
  const [search, setSearch] = useState("");
  const { tooltip, handlers: tooltipHandlers } = usePlugTooltip();

  const currentSockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
  const isArmorSocket = (socketIndex: number) =>
    modSockets.some((socket) => socket.socketIndex === socketIndex && socket.categoryHash === SOCKET_CATEGORIES.ARMOR_MODS);

  const energyCapacity = getEnergyCapacity(itemInstanceId, itemComponents, itemDefinitions);
  const energyUsed = modSockets
    .filter((socket) => socket.categoryHash === SOCKET_CATEGORIES.ARMOR_MODS)
    .reduce((total, socket) => total + getEnergyCost(itemDefinitions[plugs[socket.socketIndex]]), 0);

  const options = useMemo(() => {
    if (activeSocket === undefined || !definition) return [];
    const query = search.trim().toLowerCase();
    return getAvailablePlugs(activeSocket, { definition, itemInstanceId, characterId, itemComponents, plugSets })
      .map((hash) => itemDefinitions[hash])
      .filter((plug): plug is ItemDefinition => !!plug && (!query || plug.displayProperties.name.toLowerCase().includes(query)));
  }, [activeSocket, search, definition, itemInstanceId, characterId, itemComponents, plugSets, itemDefinitions]);

  if (modSockets.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-gray-500">This item has no {kind === "cosmetics" ? "ornament or shader" : "mod"} sockets.</div>;
  }

  const activePlug = activeSocket !== undefined ? itemDefinitions[plugs[activeSocket]] : undefined;
  const activePlugDescription = activePlug?.displayProperties.description
    || perksDefinitions[activePlug?.perks?.[0]?.perkHash ?? 0]?.displayProperties.description;

  // A mod fits if swapping it for the socket's current one stays within the armor's energy
  const fitsEnergy = (plug: ItemDefinition) => {
    if (energyCapacity === undefined || activeSocket === undefined || !isArmorSocket(activeSocket)) return true;
    return energyUsed - getEnergyCost(activePlug) + getEnergyCost(plug) <= energyCapacity;
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {energyCapacity !== undefined && modSockets.some((socket) => socket.categoryHash === SOCKET_CATEGORIES.ARMOR_MODS) && (
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs uppercase tracking-wider text-gray-400">Energy</span>
          <div className="flex gap-0.5">
            {Array.from({ length: energyCapacity }, (_, i) => (
              <span key={i} className={`h-3 w-4 ${i < energyUsed ? "bg-white" : "bg-white/15"}`} />
            ))}
          </div>
          <span className={`text-sm ${energyUsed > energyCapacity ? "text-red-400" : "text-gray-300"}`}>{energyUsed} / {energyCapacity}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 shrink-0">
        {modSockets.map(({ socketIndex }) => {
          const plug = itemDefinitions[plugs[socketIndex]];
          const isActive = activeSocket === socketIndex;
          return (
            <button
              key={socketIndex}
              onClick={() => {
                setActiveSocket(socketIndex);
                setSearch("");
              }}
              {...(plug ? tooltipHandlers(plugTooltipContent(plug, perksDefinitions)) : {})}
              className={`relative ring-offset-2 ring-offset-[#141414] transition-shadow ${isActive ? "ring-2 ring-[#7e57c2]" : "hover:ring-2 hover:ring-white/30"}`}
            >
              <PlugIcon plug={plug} size={56} />
              {plugs[socketIndex] !== currentSockets[socketIndex]?.plugHash && (
                <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#7e57c2]" />
              )}
            </button>
          );
        })}
      </div>

      {activePlug && (
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-sm font-medium text-white">{activePlug.displayProperties.name}</span>
          {activePlugDescription && <p className="text-xs text-gray-400 line-clamp-3"><DestinyText text={activePlugDescription} /></p>}
        </div>
      )}

      <div className="flex items-center gap-3 shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${label}...`}
          className="grow max-w-md bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7e57c2]"
        />
        <span className="ml-auto text-xs text-gray-500 shrink-0">{options.length} {label}</span>
      </div>

      <div className="flex flex-wrap content-start gap-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1">
        {options.map((plug) => {
          const isSelected = activeSocket !== undefined && plugs[activeSocket] === plug.hash;
          const fits = fitsEnergy(plug);
          // A mod that costs materials has to be inserted in game; the one in place is always fine
          const free = plug.hash === currentSockets[activeSocket ?? -1]?.plugHash || isFreePlug(plug, materialRequirementDefinitions);
          const available = fits && free;
          return (
            <button
              key={plug.hash}
              // aria-disabled rather than disabled: a disabled button gets no hover events, so no tooltip
              aria-disabled={!available}
              onClick={() => available && activeSocket !== undefined && onChange(activeSocket, plug.hash)}
              {...tooltipHandlers(plugTooltipContent(plug, perksDefinitions, !free ? "Costs materials: change it in game" : !fits ? "Not enough energy" : undefined))}
              className={`rounded p-0.5 transition-colors aria-disabled:opacity-30 aria-disabled:grayscale aria-disabled:cursor-not-allowed ${isSelected ? "bg-[#7e57c2]/30 ring-1 ring-[#7e57c2]" : "hover:bg-white/10"}`}
            >
              <PlugIcon plug={plug} size={48} />
            </button>
          );
        })}
      </div>

      <PlugTooltip tooltip={tooltip} />
    </div>
  );
};

export default ModEditor;
