import { ItemDefinition, ObjectiveDefinitions } from "@/lib/hooks/useDefinitions";
import { getWeaponKillCounter } from "@/lib/helpers/kill-counter";
import Image from "next/image";

interface TooltipHeaderProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: any;
    itemConstantsDefinitions: any;
    objectiveDefinitions: ObjectiveDefinitions;
    state: number;
}

const TooltipHeader = ({
    item,
    itemInstanceId,
    itemComponents,
    itemConstantsDefinitions,
    objectiveDefinitions,
    state,
}: TooltipHeaderProps) => {
    const killCounter = item.itemType === 3
        ? getWeaponKillCounter(itemInstanceId, itemComponents, objectiveDefinitions)
        : undefined;

    const getBackgroundColor = () => {
        if (!item) return "";
        switch (item.inventory.tierType) {
            case 6:
                return "#ccad30";
            case 5:
                return "#522f65";
            default:
                return "#03cdff";
        }
    };

    return (
        <>
            {state & 4 ? <div className="masterwork-shine-bar"></div> : null}
            <div
                className="relative p-2"
                style={{
                    background:
                        state & 4 && item.inventory.tierType !== 6
                            ? `linear-gradient(to bottom,rgb(145, 110, 17) 0%, transparent 30%), ${getBackgroundColor()}`
                            : getBackgroundColor(),
                    width: "100%",
                    textAlign: "left",
                    height: "75px",
                }}
            >
                <div className="flex justify-between items-center gap-3 w-full pr-5">
                    <div className="min-w-0 text-lg font-bold">
                        {item.displayProperties.name.toUpperCase()}
                        <div className="text-gray-300 text-md !font-normal">
                            {item.itemTypeDisplayName}
                        </div>
                    </div>
                    {killCounter && (
                        <div
                            className="absolute bottom-1 right-7 flex items-center gap-1.5 text-white"
                            title={killCounter.label}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4 text-white/85"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-hidden
                            >
                                <circle cx="12" cy="12" r="6" />
                                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                            </svg>
                            <span className="text-lg font-bold leading-none">
                                {new Intl.NumberFormat().format(killCounter.objective.progress)}
                            </span>
                        </div>
                    )}
                    {item.isFeaturedItem && item.iconWatermarkShelved ? (
                        <Image
                            src={`https://www.bungie.net${item.iconWatermarkShelved}`}
                            className="absolute top-[-1px] right-[-42px]"
                            height={64}
                            width={64}
                            alt="Icon watermark shelved"
                        />
                    ) : item.iconWatermark ? (
                        <Image
                            src={`https://www.bungie.net${item.iconWatermark}`}
                            className="absolute top-0 right-[-42px]"
                            height={64}
                            width={64}
                            alt="Icon watermark"
                        />
                    ) : null}
                    {itemInstanceId &&
                        itemComponents.instances[itemInstanceId] &&
                        itemComponents.instances[itemInstanceId!].gearTier > 0 &&
                        itemConstantsDefinitions["1"] ? (
                        <Image
                            src={`https://www.bungie.net${itemConstantsDefinitions["1"].gearTierOverlayImagePaths[
                                Math.max(
                                    0,
                                    itemComponents.instances[itemInstanceId!].gearTier - 1
                                )
                            ]}`}
                            height={64}
                            width={64}
                            className="absolute right-[-42px] top-[5px]"
                            alt="Gear tier"
                        />
                    ) : (
                        ""
                    )}
                </div>
            </div>
        </>
    );
};

export default TooltipHeader;
