"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getEnergyCost } from "@/lib/helpers/mods";
import { ItemDefinition, PerksDefinitions } from "@/lib/types";
import DestinyText from "@/app/components/destiny-ui/DestinyText";

const TOOLTIP_MARGIN = 8;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_FALLBACK_HEIGHT = 150;

export interface PlugTooltipContent {
    name: string
    description?: string
    typeName?: string
    /** Stats the plug changes once slotted (fragments...) */
    stats?: { name: string, value: number }[]
    /** Why the plug can't be picked, shown under the description */
    warning?: string
}

interface PlugTooltipState extends PlugTooltipContent {
    x: number
    y: number
}

/** Tooltip content for a plug (ability, aspect, fragment, mod) from its definition. */
export const plugTooltipContent = (plug: ItemDefinition, perksDefinitions: PerksDefinitions, warning?: string): PlugTooltipContent => {
    const cost = getEnergyCost(plug);
    const perkDescription = plug.perks?.map(({ perkHash }) => perksDefinitions[perkHash]?.displayProperties.description).find(Boolean);
    return {
        name: plug.displayProperties.name,
        description: plug.displayProperties.description || perkDescription,
        typeName: [plug.itemTypeDisplayName, cost > 0 ? `${cost} energy` : ""].filter(Boolean).join(" · "),
        warning,
    };
};

/** Cursor-following tooltip state; spread `handlers(content)` on the hovered element. */
export const usePlugTooltip = () => {
    const [tooltip, setTooltip] = useState<PlugTooltipState | null>(null);
    const handlers = (content: PlugTooltipContent) => ({
        onMouseEnter: (e: React.MouseEvent) => setTooltip({ ...content, x: e.clientX, y: e.clientY }),
        onMouseMove: (e: React.MouseEvent) => setTooltip((current) => current ? { ...current, x: e.clientX, y: e.clientY } : current),
        onMouseLeave: () => setTooltip(null),
    });
    return { tooltip, handlers, hideTooltip: () => setTooltip(null) };
};

/**
 * Small tooltip next to the cursor, flipped to stay in the viewport. Rendered in the body: inside the item tooltip,
 * its blur and scrolling would otherwise make it fixed to the item tooltip and clip it.
 */
const PlugTooltip = ({ tooltip }: { tooltip: PlugTooltipState | null }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: TOOLTIP_WIDTH, height: TOOLTIP_FALLBACK_HEIGHT });

    useLayoutEffect(() => {
        if (!tooltip || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
    }, [tooltip]);

    if (!tooltip) return null;

    const width = size.width || TOOLTIP_WIDTH;
    const height = size.height || TOOLTIP_FALLBACK_HEIGHT;
    const preferredLeft = tooltip.x + TOOLTIP_OFFSET;
    const left = preferredLeft + width + TOOLTIP_MARGIN > window.innerWidth
        ? Math.max(TOOLTIP_MARGIN, tooltip.x - width - TOOLTIP_OFFSET)
        : Math.min(preferredLeft, window.innerWidth - width - TOOLTIP_MARGIN);
    const preferredTop = tooltip.y + TOOLTIP_OFFSET;
    const top = preferredTop + height + TOOLTIP_MARGIN > window.innerHeight
        ? Math.max(TOOLTIP_MARGIN, tooltip.y - height - TOOLTIP_OFFSET)
        : Math.min(preferredTop, window.innerHeight - height - TOOLTIP_MARGIN);

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[1010] border border-white/25 bg-[#111318]/95 text-left shadow-[0_12px_30px_rgba(0,0,0,0.55)] pointer-events-none"
            style={{ left, top, width: `min(${TOOLTIP_WIDTH}px, calc(100vw - ${TOOLTIP_MARGIN * 2}px))` }}
        >
            <div className="border-b border-white/15 bg-white/10 px-3 py-2">
                <div className="text-[13px] font-semibold uppercase tracking-wide text-white">
                    {tooltip.name}
                </div>
                {tooltip.typeName && (
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/75">
                        {tooltip.typeName}
                    </div>
                )}
            </div>
            {tooltip.description && (
                <div className="px-3 py-2 text-xs leading-relaxed text-gray-300">
                    <DestinyText text={tooltip.description} />
                </div>
            )}
            {!!tooltip.stats?.length && (
                <div className={`flex flex-col gap-0.5 px-3 pb-2 text-xs font-medium tabular-nums ${tooltip.description ? "" : "pt-2"}`}>
                    {tooltip.stats.map((stat) => (
                        <div key={stat.name} className={stat.value > 0 ? "text-green-400" : "text-red-400"}>
                            {stat.value > 0 ? `+${stat.value}` : stat.value} {stat.name}
                        </div>
                    ))}
                </div>
            )}
            {tooltip.warning && (
                <div className="px-3 pb-2 text-xs font-medium text-red-400">
                    {tooltip.warning}
                </div>
            )}
        </div>,
        document.body
    );
};

export default PlugTooltip;
