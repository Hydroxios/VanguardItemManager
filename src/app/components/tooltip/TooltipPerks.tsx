"use client";

import Image from "next/image";
import { useState } from "react";
import { ItemComponents, ItemDefinition, Perk, PerksDefinitions } from "@/lib/types";

type ItemType = "weapon" | "armor" | "subclass";

interface TooltipPerksProps {
    itemType: ItemType;
    item: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: ItemComponents;
    perksDefinitions: PerksDefinitions;
}

interface PerkTooltipState {
    name: string;
    description: string;
    x: number;
    y: number;
}

const getPerkDisplayProperties = (perk: Perk, perksDefinitions: PerksDefinitions) => {
    const perkDef = perksDefinitions[perk.perkHash];

    return {
        name: perkDef?.displayProperties?.name || "Perk",
        description: perkDef?.displayProperties?.description || "",
        icon: perkDef?.displayProperties?.icon || perk.iconPath,
    };
};

const TooltipPerks = ({
    itemType,
    item,
    itemInstanceId,
    itemComponents,
    perksDefinitions,
}: TooltipPerksProps) => {
    const [perkTooltip, setPerkTooltip] = useState<PerkTooltipState | null>(null);

    const showPerkTooltip = (
        event: React.MouseEvent<HTMLDivElement>,
        perk: Perk
    ) => {
        const { name, description } = getPerkDisplayProperties(perk, perksDefinitions);

        setPerkTooltip({
            name,
            description,
            x: event.clientX + 14,
            y: event.clientY + 14,
        });
    };

    const movePerkTooltip = (event: React.MouseEvent<HTMLDivElement>) => {
        setPerkTooltip((current) =>
            current
                ? {
                    ...current,
                    x: event.clientX + 14,
                    y: event.clientY + 14,
                }
                : current
        );
    };

    const hidePerkTooltip = () => {
        setPerkTooltip(null);
    };

    const renderPerkIcon = (
        perk: Perk,
        alt: string,
        size = 32,
        className = "rounded-full bg-sky-500 p-1"
    ) => {
        const { name, icon } = getPerkDisplayProperties(perk, perksDefinitions);
        if (!icon) return null;

        return (
            <div
                className={`${className} cursor-help`}
                onMouseEnter={(event) => showPerkTooltip(event, perk)}
                onMouseMove={movePerkTooltip}
                onMouseLeave={hidePerkTooltip}
            >
                <Image
                    src={`https://www.bungie.net${icon}`}
                    height={size}
                    width={size}
                    alt={name || alt}
                />
            </div>
        );
    };

    const renderWeaponPerks = () => {
        if (!item) return null;
        if (!itemInstanceId) return;
        const filteredPerks = (itemComponents.perks[itemInstanceId]?.perks ?? []).filter(
            (p) => p.isActive && p.visible
        );
        const frame = filteredPerks[0];
        const frameDef = frame ? perksDefinitions[frame.perkHash] : undefined;
        if (!frame || !frameDef) return null;
        const perks = [filteredPerks[1], filteredPerks[2]].filter((p) => p);
        const mod = filteredPerks.length > 4 ? filteredPerks[3] : undefined;
        // The origin trait comes after the frame and the two main perks; never reuse one of those
        const originTrait = filteredPerks.length > 3 ? filteredPerks[filteredPerks.length - 1] : undefined;
        return (
            <div className="flex flex-col w-full">
                <div
                    key={"frame"}
                    className="flex flex-row items-center gap-4 bg-zinc-950 bg-opacity-25 w-full p-2"
                >
                    <Image
                        src={`https://www.bungie.net${frame.iconPath}`}
                        height={32}
                        width={32}
                        alt="Perk frame"
                    />
                    <div className="flex flex-col text-left">
                        <div>{frameDef.displayProperties.name}</div>
                        {item.inventory.tierType === 6 && (
                            <div className="text-sm max-w-[300px]">
                                {frameDef.displayProperties.description}
                            </div>
                        )}
                    </div>
                </div>
                <div
                    key={"perks"}
                    className="flex flex-row gap-2 w-full p-2 items-center justify-center"
                >
                    {perks.map((p, idx) => (
                        <div key={idx}>
                            {p && perksDefinitions[p.perkHash] && (
                                renderPerkIcon(p, "Perk")
                            )}
                        </div>
                    ))}
                    {originTrait && (
                        renderPerkIcon(originTrait, "Origin trait")
                    )}
                    {mod && (
                        renderPerkIcon(mod, "Mod", 40, "cursor-help")
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {itemType === "weapon" && itemComponents.perks[itemInstanceId!] && (
                <div className="border-t border-gray-500">
                    {itemComponents.perks[itemInstanceId!].perks && renderWeaponPerks()}
                </div>
            )}
            {itemType === "armor" && (
                <div className="w-full border-t border-gray-500">
                    <div className="flex flex-col p-2">
                        {itemInstanceId &&
                            itemComponents.perks[itemInstanceId] &&
                            itemComponents.perks[itemInstanceId].perks
                                .filter(
                                    (p) =>
                                        p.isActive && p.visible && p.iconPath.length > 0
                                )
                                .map((p, idx) => {
                                    const perkDef = perksDefinitions[p.perkHash];
                                    if (!perkDef) return null;
                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-row items-start gap-2 mb-2 w-full min-w-0"
                                        >
                                            {renderPerkIcon(p, "Perk")}
                                            <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                                                <span className="text-sm font-semibold text-gray-200">
                                                    {perkDef.displayProperties.name || "Perk"}
                                                </span>
                                                <span className="max-w-full break-words text-xs text-gray-400">
                                                    {perkDef.displayProperties.description ?? ""}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                    </div>
                </div>
            )}
            {perkTooltip && (
                <div
                    className="fixed z-[1010] max-w-[300px] border border-white/25 bg-[#111318]/95 text-left shadow-[0_12px_30px_rgba(0,0,0,0.55)] pointer-events-none"
                    style={{
                        left: Math.max(8, Math.min(perkTooltip.x, window.innerWidth - 320)),
                        top: Math.max(8, Math.min(perkTooltip.y, window.innerHeight - 140)),
                    }}
                >
                    <div className="border-b border-white/15 bg-white/10 px-3 py-2 text-[13px] font-semibold uppercase tracking-wide text-white">
                        {perkTooltip.name}
                    </div>
                    {perkTooltip.description && (
                        <div className="px-3 py-2 text-xs leading-relaxed text-gray-300">
                            {perkTooltip.description}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default TooltipPerks;
