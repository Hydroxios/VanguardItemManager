"use client";

import Image from "next/image";
import PlugIcon from "../character/PlugIcon";
import PlugTooltip, { plugTooltipContent, PlugTooltipContent, usePlugTooltip } from "./PlugTooltip";
import { ArmorSockets, isEnhancedPerk, WeaponSockets } from "@/lib/helpers/item-sockets";
import { EquipableItemSetDefinition, ItemDefinition, PerksDefinitions } from "@/lib/types";

type TooltipHandlers = ReturnType<typeof usePlugTooltip>["handlers"];

/** A plug's name and description, next to its icon */
const PlugLine = ({ plug, perksDefinitions, handlers }: { plug: ItemDefinition, perksDefinitions: PerksDefinitions, handlers: TooltipHandlers }) => {
    const { description } = plugTooltipContent(plug, perksDefinitions);
    return (
        <div className="flex w-full min-w-0 flex-row items-start gap-3 text-left">
            <span {...handlers(plugTooltipContent(plug, perksDefinitions))} className="cursor-help">
                <PlugIcon plug={plug} size={32} showCost={false} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-gray-100">{plug.displayProperties.name}</span>
                {description && <span className="break-words text-xs text-gray-400">{description}</span>}
            </div>
        </div>
    );
};

/** A row of mod icons (masterwork first), with their energy cost */
const ModRow = ({ plugs, perksDefinitions, handlers, showCost }: { plugs: ItemDefinition[], perksDefinitions: PerksDefinitions, handlers: TooltipHandlers, showCost: boolean }) => (
    <div className="flex flex-row flex-wrap gap-1.5">
        {plugs.map((plug, index) => (
            <span key={`${plug.hash}-${index}`} {...handlers(plugTooltipContent(plug, perksDefinitions))} className="cursor-help">
                <PlugIcon plug={plug} size={36} showCost={showCost} />
            </span>
        ))}
    </div>
);

export const WeaponPerks = ({ sockets, perksDefinitions }: { sockets: WeaponSockets, perksDefinitions: PerksDefinitions }) => {
    const { tooltip, handlers } = usePlugTooltip();
    const { intrinsic, columns, masterwork, mods } = sockets;
    if (!intrinsic && columns.length === 0 && !masterwork && mods.length === 0) return null;

    return (
        <div className="flex w-full flex-col border-t border-white/10">
            {intrinsic && (
                <div className="w-full bg-white/[0.04] p-2">
                    <PlugLine plug={intrinsic} perksDefinitions={perksDefinitions} handlers={handlers} />
                </div>
            )}
            {columns.length > 0 && (
                <div className="flex w-full flex-row items-start justify-center gap-1 p-2">
                    {columns.map((column) => (
                        <div key={column.socketIndex} className={`flex flex-col items-center gap-1 px-1 ${column.origin ? "border-l border-white/15 pl-2" : ""}`}>
                            {column.options.map((option) => {
                                const active = option.hash === column.current.hash;
                                const base = plugTooltipContent(option, perksDefinitions);
                                const content: PlugTooltipContent = active ? base : {
                                    ...base,
                                    typeName: [base.typeName, "Also on this roll"].filter(Boolean).join(" · "),
                                };
                                return (
                                    <span
                                        key={option.hash}
                                        {...handlers(content)}
                                        // Every perk sits in a white bubble, like in game; the selected one is filled with blue
                                        className={`relative cursor-help rounded-full border-2 p-0.5 ${active ? "border-white bg-[#4887ba]" : "border-white/70 opacity-50"}`}
                                    >
                                        <span className="block size-9 overflow-hidden rounded-full">
                                            <Image src={`https://www.bungie.net${option.displayProperties.icon}`} width={36} height={36} alt={option.displayProperties.name} />
                                        </span>
                                        {isEnhancedPerk(option) && (
                                            <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#f2c94c] text-[9px] font-bold leading-none text-black" title="Enhanced">▲</span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
            {(masterwork || mods.length > 0) && (
                <div className="flex w-full flex-row justify-center border-t border-white/10 p-2">
                    <ModRow plugs={[...(masterwork ? [masterwork] : []), ...mods]} perksDefinitions={perksDefinitions} handlers={handlers} showCost={false} />
                </div>
            )}
            <PlugTooltip tooltip={tooltip} />
        </div>
    );
};

interface ArmorPerksProps {
    sockets: ArmorSockets
    perksDefinitions: PerksDefinitions
    itemSet?: EquipableItemSetDefinition
    /** Pieces of the set the owner has equipped, to tell which set bonuses are active */
    equippedSetCount: number
}

export const ArmorPerks = ({ sockets, perksDefinitions, itemSet, equippedSetCount }: ArmorPerksProps) => {
    const { tooltip, handlers } = usePlugTooltip();
    const setPerks = (itemSet?.setPerks ?? []).filter((perk) => perksDefinitions[perk.sandboxPerkHash]);
    if (sockets.perks.length === 0 && sockets.mods.length === 0 && setPerks.length === 0) return null;

    return (
        <div className="flex w-full flex-col gap-2 border-t border-white/10 p-2">
            {sockets.perks.map((perk) => (
                <PlugLine key={perk.hash} plug={perk} perksDefinitions={perksDefinitions} handlers={handlers} />
            ))}
            {setPerks.length > 0 && (
                <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {itemSet?.displayProperties?.name || "Set bonus"}
                    </span>
                    {setPerks.map((perk) => {
                        const definition = perksDefinitions[perk.sandboxPerkHash];
                        const active = equippedSetCount >= perk.requiredSetCount;
                        return (
                            <div key={perk.sandboxPerkHash} className={`flex flex-col ${active ? "" : "opacity-50"}`}>
                                <span className="text-sm font-semibold text-gray-100">
                                    <span className="mr-1.5 text-xs text-[#f2c94c]">{perk.requiredSetCount}×</span>
                                    {definition.displayProperties.name}
                                </span>
                                {definition.displayProperties.description && (
                                    <span className="text-xs text-gray-400">{definition.displayProperties.description}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {sockets.mods.length > 0 && (
                <ModRow plugs={sockets.mods} perksDefinitions={perksDefinitions} handlers={handlers} showCost />
            )}
            <PlugTooltip tooltip={tooltip} />
        </div>
    );
};
