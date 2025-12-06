import { ItemDefinition } from "@/lib/hooks/useDefinitions";
import Image from "next/image";

interface TooltipHeaderProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: any;
    itemConstantsDefinitions: any;
    state: number;
}

const TooltipHeader = ({
    item,
    itemInstanceId,
    itemComponents,
    itemConstantsDefinitions,
    state,
}: TooltipHeaderProps) => {
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
                className="p-2"
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
                <div className="flex justify-between items-center w-full">
                    <div className="text-lg font-bold">
                        {item.displayProperties.name.toUpperCase()}
                        <div className="text-gray-300 text-md !font-normal">
                            {item.itemTypeDisplayName}
                        </div>
                    </div>
                    {item.isFeaturedItem && item.iconWatermarkShelved ? (
                        <Image
                            src={`https://www.bungie.net${item.iconWatermarkShelved}`}
                            className="absolute top-[-2px] right-[-70px]"
                            height={64}
                            width={64}
                            alt="Icon watermark shelved"
                        />
                    ) : item.iconWatermark ? (
                        <Image
                            src={`https://www.bungie.net${item.iconWatermark}`}
                            className="absolute top-[-2px] right-[-70px]"
                            height={64}
                            width={64}
                            alt="Icon watermark"
                        />
                    ) : null}
                    {itemInstanceId &&
                        itemComponents.instances[itemInstanceId] &&
                        itemComponents.instances[itemInstanceId!].gearTier > 0 ? (
                        <Image
                            src={`https://www.bungie.net${itemConstantsDefinitions["1"].gearTierOverlayImagePaths[
                                Math.max(
                                    0,
                                    itemComponents.instances[itemInstanceId!].gearTier - 1
                                )
                            ]
                                }`}
                            height={64}
                            width={64}
                            className="absolute right-[-43px] top-[10px]"
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
