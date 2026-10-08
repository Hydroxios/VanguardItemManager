import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { getWeaponKillCounter } from "@/lib/helpers/kill-counter";
import Image from "next/image";
import { useMemo } from "react";
import { ITEM_STATE, ITEM_TYPES, TIER_TYPES } from "@/lib/constants";
import { ItemComponents, ItemConstantsDefinitions, ItemDefinition, ObjectiveDefinitions } from "@/lib/types";

const numberFormat = new Intl.NumberFormat();

const RARITY: Record<number, { background: string, dark?: boolean }> = {
    [TIER_TYPES.EXOTIC]: { background: "#ccad30" },
    [TIER_TYPES.LEGENDARY]: { background: "#522f65" },
    [TIER_TYPES.RARE]: { background: "#5076a3" },
    [TIER_TYPES.COMMON]: { background: "#366f42" },
    [TIER_TYPES.BASIC]: { background: "#c3bcb4", dark: true },
};
const DEFAULT_RARITY = { background: "#03cdff" };

interface TooltipHeaderProps {
    item: ItemDefinition;
    /** The ornament applied to the item, whose icon replaces the item's */
    ornament?: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: ItemComponents;
    itemConstantsDefinitions: ItemConstantsDefinitions;
    objectiveDefinitions: ObjectiveDefinitions;
    state: number;
    /** Whether a weapon has an enhanced perk slotted */
    enhanced: boolean;
    /** Shows a close button when set */
    onClose?: () => void;
}

const Badge = ({ label, color }: { label: string, color: string }) => (
    <span className="rounded-sm px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-black" style={{ background: color }}>
        {label}
    </span>
);

const TooltipHeader = ({
    item,
    ornament,
    itemInstanceId,
    itemComponents,
    itemConstantsDefinitions,
    objectiveDefinitions,
    state,
    enhanced,
    onClose,
}: TooltipHeaderProps) => {
    const { itemDefinitions } = useDefinitions();
    const killCounter = useMemo(() => item.itemType === ITEM_TYPES.WEAPON
        ? getWeaponKillCounter(itemInstanceId, itemComponents, itemDefinitions, objectiveDefinitions)
        : undefined,
        [item.itemType, itemInstanceId, itemComponents, itemDefinitions, objectiveDefinitions]);

    const rarity = RARITY[item.inventory?.tierType] ?? DEFAULT_RARITY;
    const masterworked = (state & ITEM_STATE.MASTERWORK) !== 0;
    const instance = itemInstanceId ? itemComponents.instances[itemInstanceId] : undefined;
    const gearTierOverlay = instance && instance.gearTier > 0
        ? itemConstantsDefinitions["1"]?.gearTierOverlayImagePaths[Math.max(0, instance.gearTier - 1)]
        : undefined;
    const icon = ornament?.displayProperties.icon || item.displayProperties.icon;
    const watermark = item.isFeaturedItem && item.iconWatermarkShelved ? item.iconWatermarkShelved : item.iconWatermark;

    const badges = [
        (state & ITEM_STATE.LOCKED) !== 0 && <Badge key="locked" label="Locked" color="#e5e7eb" />,
        (state & ITEM_STATE.CRAFTED) !== 0 && <Badge key="crafted" label="Crafted" color="#f87171" />,
        masterworked && item.inventory?.tierType !== TIER_TYPES.EXOTIC && <Badge key="masterwork" label="Masterwork" color="#f2c94c" />,
        enhanced && <Badge key="enhanced" label="Enhanced" color="#fcd34d" />,
        instance?.isEquipped && <Badge key="equipped" label="Equipped" color="#7dd3fc" />,
    ].filter(Boolean);

    return (
        <>
            {masterworked ? <div className="masterwork-shine-bar"></div> : null}
            <div
                className={`flex w-full flex-col gap-1.5 p-2 text-left ${rarity.dark ? "text-gray-900" : "text-white"}`}
                style={{
                    background: masterworked && item.inventory?.tierType !== TIER_TYPES.EXOTIC
                        ? `linear-gradient(to bottom, rgb(145, 110, 17) 0%, transparent 30%), ${rarity.background}`
                        : rarity.background,
                }}
            >
                <div className="flex w-full flex-row items-center gap-3">
                    {icon && (
                        <div className="relative size-12 shrink-0 border border-white/40">
                            <Image src={`https://www.bungie.net${icon}`} fill sizes="48px" alt="" />
                            {watermark && <Image src={`https://www.bungie.net${watermark}`} fill sizes="48px" alt="" />}
                            {gearTierOverlay && <Image src={`https://www.bungie.net${gearTierOverlay}`} fill sizes="48px" alt={`Tier ${instance?.gearTier}`} />}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-lg font-bold uppercase leading-tight" title={item.displayProperties.name}>
                            {item.displayProperties.name}
                        </div>
                        <div className="truncate text-sm opacity-80">{item.itemTypeDisplayName}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 self-stretch">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
                                title="Close"
                                aria-label="Close"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        )}
                        {killCounter && (
                            <div className="mt-auto flex items-center gap-1.5" title={killCounter.label}>
                                <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-85" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                                    <circle cx="12" cy="12" r="6" />
                                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                                </svg>
                                <span className="text-lg font-bold leading-none">
                                    {numberFormat.format(killCounter.objective.progress)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                {badges.length > 0 && <div className="flex flex-row flex-wrap gap-1">{badges}</div>}
            </div>
        </>
    );
};

export default TooltipHeader;
