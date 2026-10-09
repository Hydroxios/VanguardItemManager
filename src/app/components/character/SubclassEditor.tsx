"use client";

import React, { useMemo, useState } from "react";
import PlugIcon from "./PlugIcon";
import PlugTooltip, { plugTooltipContent, usePlugTooltip } from "../tooltip/PlugTooltip";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { countFragments, getEditableSubclassSockets, getFragmentCapacity, isEmptyPlug, SubclassSocketKind } from "@/lib/helpers/subclass";
import { subclassPlugStats } from "@/lib/helpers/stats";
import { ItemDefinition } from "@/lib/types";
import DestinyText from "@/app/components/destiny-ui/DestinyText";

interface SubclassEditorProps {
  itemHash: number;
  itemInstanceId: string;
  characterId: string;
  /** Plug wanted in each subclass socket, by socket index */
  plugs: Record<number, number>;
  onChange: (socketIndex: number, plugHash: number) => void;
}

const KIND_LABELS: Record<SubclassSocketKind, string> = {
  aspects: "Aspects",
  fragments: "Fragments",
  other: "Abilities",
};

/** Picks the super, abilities, aspects and fragments of a subclass. Changes are reported to the parent, which applies them. */
const SubclassEditor = ({ itemHash, itemInstanceId, characterId, plugs, onChange }: SubclassEditorProps) => {
  const { itemComponents, plugSets } = useProfile();
  const { itemDefinitions, perksDefinitions, socketCategoryDefinitions, statsDefinitions } = useDefinitions();
  const { tooltip, handlers: tooltipHandlers } = usePlugTooltip();

  const definition = itemDefinitions[itemHash];
  const { groups, optionsBySocket, lockedBySocket } = useMemo(
    () => getEditableSubclassSockets(definition, { itemInstanceId, characterId, itemComponents, plugSets, itemDefinitions }),
    [definition, itemInstanceId, characterId, itemComponents, plugSets, itemDefinitions]
  );
  const [activeSocket, setActiveSocket] = useState<number | undefined>(groups[0]?.socketIndexes[0]);
  const [search, setSearch] = useState("");

  const currentSockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
  const fragmentCapacity = getFragmentCapacity(groups, plugs, itemDefinitions);
  const fragmentCount = definition ? countFragments(groups, plugs, definition) : 0;

  const activeGroup = groups.find((group) => activeSocket !== undefined && group.socketIndexes.includes(activeSocket));
  const isLocked = (kind: SubclassSocketKind, position: number) =>
    kind === "fragments" && fragmentCapacity !== undefined && position >= fragmentCapacity;
  const activeLocked = !!activeGroup && activeSocket !== undefined && isLocked(activeGroup.kind, activeGroup.socketIndexes.indexOf(activeSocket));

  // The plugs of the active socket matching the search, the ones not unlocked yet after the others
  const { options, lockedOptions } = useMemo(() => {
    if (activeSocket === undefined) return { options: [], lockedOptions: [] };
    const query = search.trim().toLowerCase();
    const matching = (hashes: number[] | undefined) => (hashes ?? [])
      .map((hash) => itemDefinitions[hash])
      .filter((plug): plug is ItemDefinition => !!plug && (!query || plug.displayProperties.name.toLowerCase().includes(query)));
    return { options: matching(optionsBySocket[activeSocket]), lockedOptions: matching(lockedBySocket[activeSocket]) };
  }, [activeSocket, search, optionsBySocket, lockedBySocket, itemDefinitions]);

  if (!definition || groups.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-gray-500">This subclass can&apos;t be configured.</div>;
  }

  const activePlug = activeSocket !== undefined ? itemDefinitions[plugs[activeSocket]] : undefined;

  const isAvailable = (plug: ItemDefinition) => {
    if (!activeGroup || activeSocket === undefined) return false;
    const isEmpty = isEmptyPlug(definition, activeSocket, plug.hash);
    // A locked fragment socket can only be emptied
    if (activeLocked && !isEmpty) return false;
    // Aspects and fragments are unique: one slotted in another socket can't be picked again
    if (activeGroup.kind === "other" || isEmpty) return true;
    return !activeGroup.socketIndexes.some((socketIndex) => socketIndex !== activeSocket && plugs[socketIndex] === plug.hash);
  };

  // Like in the game, fragments list the stats they raise or lower
  const tooltipFor = (plug: ItemDefinition, warning?: string) => ({
    ...plugTooltipContent(plug, perksDefinitions, warning),
    stats: subclassPlugStats(plug, definition.classType).map((stat) => ({
      name: statsDefinitions[stat.statTypeHash]?.displayProperties.name ?? "Stat",
      value: stat.value,
    })),
  });

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex flex-wrap gap-x-6 gap-y-3 shrink-0">
        {groups.map((group) => (
          <div key={group.categoryHash} className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-gray-400">
              {socketCategoryDefinitions[group.categoryHash]?.displayProperties.name || KIND_LABELS[group.kind]}
              {group.kind === "fragments" && fragmentCapacity !== undefined && (
                <span className={`ml-2 normal-case ${fragmentCount > fragmentCapacity ? "text-red-400" : "text-gray-500"}`}>{fragmentCount} / {fragmentCapacity}</span>
              )}
            </span>
            <div className="flex gap-1.5">
              {group.socketIndexes.map((socketIndex, position) => {
                const plug = itemDefinitions[plugs[socketIndex]];
                const isActive = activeSocket === socketIndex;
                const locked = isLocked(group.kind, position);
                return (
                  <button
                    key={socketIndex}
                    onClick={() => {
                      setActiveSocket(socketIndex);
                      setSearch("");
                    }}
                    {...(plug ? tooltipHandlers(tooltipFor(plug, locked ? "Locked: your aspects don't open this fragment socket" : undefined)) : {})}
                    className={`relative ring-offset-2 ring-offset-[#141414] transition-shadow ${isActive ? "ring-2 ring-[#7e57c2]" : "hover:ring-2 hover:ring-white/30"} ${locked ? "opacity-40" : ""}`}
                  >
                    <PlugIcon plug={plug} size={52} showCost={false} />
                    {plugs[socketIndex] !== currentSockets[socketIndex]?.plugHash && (
                      <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#7e57c2]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activePlug && (
        <div className="flex flex-col gap-1 shrink-0">
          <span className="text-sm font-medium text-white">{activePlug.displayProperties.name}</span>
          {activePlug.displayProperties.description && (
            <p className="text-xs text-gray-400 line-clamp-3"><DestinyText text={activePlug.displayProperties.description} /></p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="grow max-w-md bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7e57c2]"
        />
        <span className="ml-auto text-xs text-gray-500 shrink-0">
          {options.length} options{lockedOptions.length > 0 && ` · ${lockedOptions.length} locked`}
        </span>
      </div>

      <div className="flex flex-wrap content-start gap-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1">
        {options.map((plug) => {
          const isSelected = activeSocket !== undefined && plugs[activeSocket] === plug.hash;
          const available = isAvailable(plug);
          return (
            <button
              key={plug.hash}
              // aria-disabled rather than disabled: a disabled button gets no hover events, so no tooltip
              aria-disabled={!available}
              onClick={() => available && activeSocket !== undefined && onChange(activeSocket, plug.hash)}
              {...tooltipHandlers(tooltipFor(plug, available ? undefined : activeLocked ? "Locked socket: it can only be emptied" : "Already slotted"))}
              className={`rounded p-0.5 transition-colors aria-disabled:opacity-30 aria-disabled:cursor-not-allowed ${isSelected ? "bg-[#7e57c2]/30 ring-1 ring-[#7e57c2]" : "hover:bg-white/10"}`}
            >
              <PlugIcon plug={plug} size={48} showCost={false} />
            </button>
          );
        })}
        {lockedOptions.map((plug) => (
          <button
            key={plug.hash}
            aria-disabled
            {...tooltipHandlers(tooltipFor(plug, "Not unlocked yet"))}
            className="relative rounded p-0.5 cursor-not-allowed"
          >
            <span className="block opacity-30 grayscale">
              <PlugIcon plug={plug} size={48} showCost={false} />
            </span>
            {/* Padlock, like in game */}
            <svg aria-hidden className="absolute bottom-1 right-1 drop-shadow" width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z" />
            </svg>
          </button>
        ))}
      </div>

      <PlugTooltip tooltip={tooltip} />
    </div>
  );
};

export default SubclassEditor;
