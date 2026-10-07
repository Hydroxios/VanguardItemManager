"use client";

import React, { useMemo } from "react";
import PlugIcon from "./PlugIcon";
import PlugTooltip, { plugTooltipContent, usePlugTooltip } from "../tooltip/PlugTooltip";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { getPerkOptions, getPerkSockets, isFreePlug } from "@/lib/helpers/mods";
import { ItemDefinition } from "@/lib/types";

interface PerkEditorProps {
  itemHash: number;
  itemInstanceId: string;
  /** Perk wanted in each perk socket, by socket index */
  plugs: Record<number, number>;
  onChange: (socketIndex: number, plugHash: number) => void;
}

/** Picks a weapon's perk in each column among the ones its roll has. Changes are reported to the parent, which applies them. */
const PerkEditor = ({ itemHash, itemInstanceId, plugs, onChange }: PerkEditorProps) => {
  const { itemComponents } = useProfile();
  const { itemDefinitions, perksDefinitions, materialRequirementDefinitions } = useDefinitions();
  const { tooltip, handlers: tooltipHandlers } = usePlugTooltip();

  const columns = useMemo(() => getPerkSockets(itemDefinitions[itemHash], itemInstanceId, itemComponents).map((socketIndex) => ({
    socketIndex,
    options: getPerkOptions(socketIndex, itemInstanceId, itemComponents)
      .map((hash) => itemDefinitions[hash])
      .filter((plug): plug is ItemDefinition => !!plug),
  })), [itemHash, itemInstanceId, itemComponents, itemDefinitions]);

  if (columns.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-gray-500">This weapon has no perk to choose from.</div>;
  }

  const currentSockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
  const hasPaidPerks = columns.some(({ options }) => options.some((plug) => !isFreePlug(plug, materialRequirementDefinitions)));

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex gap-3 overflow-auto custom-scrollbar pb-2">
        {columns.map(({ socketIndex, options }) => {
          const label = itemDefinitions[currentSockets[socketIndex]?.plugHash ?? 0]?.itemTypeDisplayName;
          return (
            <div key={socketIndex} className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
              <span className="w-full truncate text-center text-[10px] uppercase tracking-wider text-gray-400" title={label}>{label || "Perk"}</span>
              {options.map((plug) => {
                const isSelected = plugs[socketIndex] === plug.hash;
                const isCurrent = currentSockets[socketIndex]?.plugHash === plug.hash;
                // Switching to a perk that costs materials has to be done in game; going back to the current one is free
                const available = isSelected || isCurrent || isFreePlug(plug, materialRequirementDefinitions);
                return (
                  <button
                    key={plug.hash}
                    // aria-disabled rather than disabled: a disabled button gets no hover events, so no tooltip
                    aria-disabled={!available}
                    onClick={() => available && onChange(socketIndex, plug.hash)}
                    {...tooltipHandlers(plugTooltipContent(plug, perksDefinitions, available ? undefined : "Costs materials: change it in game"))}
                    className={`relative rounded-full p-1 transition-colors aria-disabled:opacity-30 aria-disabled:cursor-not-allowed ${isSelected ? "bg-[#7e57c2]/40 ring-2 ring-[#7e57c2]" : "hover:bg-white/10"}`}
                  >
                    <PlugIcon plug={plug} size={48} showCost={false} round />
                    {isSelected && !isCurrent && <span className="absolute top-0 right-0 size-2.5 rounded-full bg-[#7e57c2]" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {hasPaidPerks && (
        <p className="text-xs text-gray-500 shrink-0">Perks that cost materials (crafted weapons, enhanced perks) can only be changed in game.</p>
      )}

      <PlugTooltip tooltip={tooltip} />
    </div>
  );
};

export default PerkEditor;
