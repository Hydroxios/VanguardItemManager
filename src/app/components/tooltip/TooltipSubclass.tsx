"use client";

import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import Image from "next/image";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ItemDefinition, PerkDefinition, Perk } from "@/lib/types";

const BUNGIE_BASE_URL = "https://www.bungie.net";
const SUBCLASS_ABILITY_CATEGORY_HASH = 1043342778;
const SUBCLASS_TOOLTIP_MARGIN = 8;
const SUBCLASS_TOOLTIP_OFFSET = 14;
const SUBCLASS_TOOLTIP_WIDTH = 300;
const SUBCLASS_TOOLTIP_FALLBACK_HEIGHT = 150;

interface TooltipSubclassProps {
    item: ItemDefinition;
    itemInstanceId?: string;
}

interface ActiveSubclassPerk {
    id: number;
    name: string;
    description?: string;
    icon?: string;
    typeName?: string;
    perk?: Perk;
    definition?: PerkDefinition;
    abilityItems: ItemDefinition[];
}

interface SubclassTooltipState {
    name: string;
    description: string;
    typeName?: string;
    x: number;
    y: number;
}

type SubclassSection = "super" | "abilities" | "aspects" | "fragments";

const SECTION_LABELS: Record<Exclude<SubclassSection, "super">, string> = {
    abilities: "ABILITIES",
    aspects: "ASPECTS",
    fragments: "FRAGMENTS",
};

const SECTION_PLACEHOLDERS: Record<Exclude<SubclassSection, "super">, number> = {
    abilities: 4,
    aspects: 2,
    fragments: 5,
};

const getSubclassSection = (
    activePerk: ActiveSubclassPerk
): SubclassSection => {
    const abilityItem = activePerk.abilityItems[0];
    const searchableText = [
        activePerk.typeName,
        abilityItem?.itemTypeDisplayName,
        abilityItem?.displayProperties.name,
        activePerk.name,
        activePerk.definition?.displayProperties.name,
        activePerk.definition?.perkIdentifier,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (searchableText.includes("fragment")) return "fragments";
    if (searchableText.includes("aspect")) return "aspects";
    if (searchableText.includes("super")) return "super";

    return "abilities";
};

// Scanning every item definition is expensive and the tooltip remounts on each hover,
// so the index is built once per definitions table and cached at module level
const abilityIndexCache = new WeakMap<object, Map<number, ItemDefinition[]>>();

const getSubclassAbilityItemsByPerk = (itemDefinitions: Record<string, ItemDefinition>) => {
    const cached = abilityIndexCache.get(itemDefinitions);
    if (cached) return cached;

    const abilitiesByPerk = new Map<number, ItemDefinition[]>();
    Object.values(itemDefinitions).forEach((definition) => {
        const isSubclassAbility = definition.itemCategoryHashes?.includes(
            SUBCLASS_ABILITY_CATEGORY_HASH
        );

        if (!isSubclassAbility) return;

        definition.perks?.forEach(({ perkHash }) => {
            const abilities = abilitiesByPerk.get(perkHash) ?? [];
            abilities.push(definition);
            abilitiesByPerk.set(perkHash, abilities);
        });
    });

    abilityIndexCache.set(itemDefinitions, abilitiesByPerk);
    return abilitiesByPerk;
};

const TooltipSubclass = ({ item, itemInstanceId }: TooltipSubclassProps) => {
    const [perkTooltip, setPerkTooltip] = useState<SubclassTooltipState | null>(null);
    const [tooltipSize, setTooltipSize] = useState({
        width: SUBCLASS_TOOLTIP_WIDTH,
        height: SUBCLASS_TOOLTIP_FALLBACK_HEIGHT,
    });
    const tooltipRef = useRef<HTMLDivElement>(null);
    const { itemComponents } = useProfile();
    const { perksDefinitions, itemDefinitions } = useDefinitions();

    const subclassAbilityItemsByPerk = getSubclassAbilityItemsByPerk(itemDefinitions);

    const socketSubclassPerks = useMemo<ActiveSubclassPerk[]>(() => {
        if (!itemInstanceId) return [];

        const seenPlugHashes = new Set<number>();
        const sockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];

        return sockets
            .map((socket) => socket.plugHash)
            .filter((plugHash): plugHash is number => Boolean(plugHash))
            .map((plugHash) => itemDefinitions[plugHash])
            .filter((definition): definition is ItemDefinition => {
                if (!definition) return false;
                if (seenPlugHashes.has(definition.hash)) return false;
                seenPlugHashes.add(definition.hash);

                return definition.itemCategoryHashes?.includes(
                    SUBCLASS_ABILITY_CATEGORY_HASH
                );
            })
            .map((definition) => {
                const perkDefinition = definition.perks
                    ?.map(({ perkHash }) => perksDefinitions[perkHash])
                    .find(Boolean);

                return {
                    id: definition.hash,
                    name: definition.displayProperties.name || "Subclass perk",
                    description:
                        definition.displayProperties.description ||
                        perkDefinition?.displayProperties.description ||
                        "",
                    icon: definition.displayProperties.icon,
                    typeName: definition.itemTypeDisplayName,
                    definition: perkDefinition,
                    abilityItems: [definition],
                };
            });
    }, [
        itemComponents.sockets,
        itemDefinitions,
        itemInstanceId,
        perksDefinitions,
    ]);

    const activePerks = useMemo<ActiveSubclassPerk[]>(() => {
        if (!itemInstanceId) return [];

        const instancePerks = itemComponents.perks[itemInstanceId]?.perks ?? [];

        return instancePerks
            .filter((perk) => perk.isActive && perk.visible)
            .flatMap((perk) => {
                const definition = perksDefinitions[perk.perkHash];
                if (!definition) return [];

                return [{
                    id: perk.perkHash,
                    name: definition.displayProperties.name || "Subclass perk",
                    description:
                        subclassAbilityItemsByPerk.get(perk.perkHash)?.[0]
                            ?.displayProperties.description ||
                        definition.displayProperties.description ||
                        "",
                    icon:
                        subclassAbilityItemsByPerk.get(perk.perkHash)?.[0]
                            ?.displayProperties.icon ||
                        definition.displayProperties.icon ||
                        perk.iconPath,
                    perk,
                    definition,
                    abilityItems: subclassAbilityItemsByPerk.get(perk.perkHash) ?? [],
                }];
            });
    }, [
        itemComponents.perks,
        itemInstanceId,
        perksDefinitions,
        subclassAbilityItemsByPerk,
    ]);

    const displayedPerks = socketSubclassPerks.length
        ? socketSubclassPerks
        : activePerks;

    // Must stay above the early return below so the hook order never changes between renders
    useLayoutEffect(() => {
        if (!perkTooltip || !tooltipRef.current) return;

        const rect = tooltipRef.current.getBoundingClientRect();
        setTooltipSize({
            width: rect.width,
            height: rect.height,
        });
    }, [perkTooltip]);

    if (!displayedPerks.length) return null;

    const groupedPerks = displayedPerks.reduce<Record<SubclassSection, ActiveSubclassPerk[]>>(
        (groups, activePerk) => {
            groups[getSubclassSection(activePerk)].push(activePerk);
            return groups;
        },
        {
            super: [],
            abilities: [],
            aspects: [],
            fragments: [],
        }
    );

    const showPerkTooltip = (
        event: React.MouseEvent<HTMLDivElement>,
        activePerk: Pick<ActiveSubclassPerk, "name" | "description" | "typeName">
    ) => {
        setPerkTooltip({
            name: activePerk.name,
            description: activePerk.description ?? "",
            typeName: activePerk.typeName,
            x: event.clientX,
            y: event.clientY,
        });
    };

    const movePerkTooltip = (event: React.MouseEvent<HTMLDivElement>) => {
        setPerkTooltip((current) =>
            current
                ? {
                    ...current,
                    x: event.clientX,
                    y: event.clientY,
                }
                : current
        );
    };

    const hidePerkTooltip = () => {
        setPerkTooltip(null);
    };

    const getPerkTooltipStyle = (tooltip: SubclassTooltipState) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipWidth = tooltipSize.width || SUBCLASS_TOOLTIP_WIDTH;
        const tooltipHeight = tooltipSize.height || SUBCLASS_TOOLTIP_FALLBACK_HEIGHT;

        const preferredLeft = tooltip.x + SUBCLASS_TOOLTIP_OFFSET;
        const flippedLeft =
            tooltip.x - tooltipWidth - SUBCLASS_TOOLTIP_OFFSET;
        const maxLeft =
            viewportWidth - tooltipWidth - SUBCLASS_TOOLTIP_MARGIN;
        const left =
            preferredLeft + tooltipWidth + SUBCLASS_TOOLTIP_MARGIN >
                viewportWidth
                ? Math.max(SUBCLASS_TOOLTIP_MARGIN, flippedLeft)
                : Math.min(preferredLeft, maxLeft);

        const preferredTop = tooltip.y + SUBCLASS_TOOLTIP_OFFSET;
        const flippedTop = tooltip.y - tooltipHeight - SUBCLASS_TOOLTIP_OFFSET;
        const maxTop =
            viewportHeight - tooltipHeight - SUBCLASS_TOOLTIP_MARGIN;
        const top =
            preferredTop + tooltipHeight + SUBCLASS_TOOLTIP_MARGIN >
                viewportHeight
                ? Math.max(SUBCLASS_TOOLTIP_MARGIN, flippedTop)
                : Math.min(preferredTop, maxTop);

        return {
            left,
            top,
            width: `min(${SUBCLASS_TOOLTIP_WIDTH}px, calc(100vw - ${SUBCLASS_TOOLTIP_MARGIN * 2}px))`,
        };
    };

    const renderPerkTile = (
        activePerk: Pick<
            ActiveSubclassPerk,
            "id" | "name" | "description" | "icon" | "typeName"
        >,
        size: "sm" | "lg" = "sm"
    ) => {
        return (
            <div
                key={`${activePerk.id}-${activePerk.name}`}
                onMouseEnter={(event) => showPerkTooltip(event, activePerk)}
                onMouseMove={movePerkTooltip}
                onMouseLeave={hidePerkTooltip}
                className={
                    size === "lg"
                        ? "relative flex h-16 w-16 rotate-45 cursor-help items-center justify-center border border-white/25 bg-cyan-300/35 shadow-[0_0_0_8px_rgba(255,255,255,0.04)]"
                        : "relative flex h-11 w-11 shrink-0 cursor-help items-center justify-center bg-white/12 ring-1 ring-white/10"
                }
            >
                <div className={size === "lg" ? "-rotate-45" : ""}>
                    {activePerk.icon && (
                        <Image
                            src={`${BUNGIE_BASE_URL}${activePerk.icon}`}
                            alt={activePerk.name}
                            height={size === "lg" ? 64 : 38}
                            width={size === "lg" ? 64 : 38}
                            className="opacity-95"
                        />
                    )}
                </div>
            </div>
        );
    };

    const superTile = groupedPerks.super[0] ?? {
        id: item.hash,
        name: item.displayProperties.name,
        description: item.displayProperties.description || item.flavorText,
        typeName: item.itemTypeDisplayName,
        icon: item.displayProperties.icon,
    };

    const renderEmptyTile = (section: SubclassSection, index: number) => (
        <div
            key={`${section}-empty-${index}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center bg-cyan-200/15 ring-1 ring-white/5"
        >
            <div className="h-4 w-4 rotate-45 border border-white/10" />
        </div>
    );

    const renderSection = (section: Exclude<SubclassSection, "super">) => {
        const perks = groupedPerks[section];
        const placeholderCount = Math.max(
            0,
            SECTION_PLACEHOLDERS[section] - perks.length
        );

        return (
            <div className="min-w-0 max-w-full">
                <div className="mb-1 border-b border-white/45 pb-0.5 text-[11px] font-medium leading-none text-white/55">
                    {SECTION_LABELS[section]}
                </div>
                <div className="flex min-h-14 flex-wrap gap-1 p-1">
                    {perks.map((activePerk) => renderPerkTile(activePerk))}
                    {Array.from({ length: placeholderCount }).map((_, index) =>
                        renderEmptyTile(section, index)
                    )}
                </div>
                <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: section === "fragments" ? 16 : 4 }).map(
                        (_, index) => (
                            <div
                                key={`${section}-pip-${index}`}
                                className="h-1 w-1.5 bg-white/25"
                            />
                        )
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="w-full overflow-hidden border-t border-gray-500 bg-gradient-to-br from-cyan-300/20 via-slate-500/10 to-black/20 p-3 text-left">
                <div className="flex gap-4">
                    <div className="flex w-24 shrink-0 flex-col items-center justify-center">
                        {renderPerkTile(superTile, "lg")}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(92px,auto)] gap-3">
                            {renderSection("abilities")}
                            {renderSection("aspects")}
                        </div>
                        {renderSection("fragments")}
                    </div>
                </div>
            </div>
            {perkTooltip && (
                <div
                    ref={tooltipRef}
                    className="fixed z-[1010] border border-white/25 bg-[#111318]/95 text-left shadow-[0_12px_30px_rgba(0,0,0,0.55)] pointer-events-none"
                    style={getPerkTooltipStyle(perkTooltip)}
                >
                    <div className="border-b border-white/15 bg-white/10 px-3 py-2">
                        <div className="text-[13px] font-semibold uppercase tracking-wide text-white">
                            {perkTooltip.name}
                        </div>
                        {perkTooltip.typeName && (
                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/75">
                                {perkTooltip.typeName}
                            </div>
                        )}
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

export default TooltipSubclass;
