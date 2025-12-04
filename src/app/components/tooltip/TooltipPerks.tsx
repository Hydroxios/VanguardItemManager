import { ItemDefinition } from "@/lib/hooks/useDefinitions";

type ItemType = "weapon" | "armor" | "subclass";

interface TooltipPerksProps {
    itemType: ItemType;
    item: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: any;
    perksDefinitions: any;
}

const TooltipPerks = ({
    itemType,
    item,
    itemInstanceId,
    itemComponents,
    perksDefinitions,
}: TooltipPerksProps) => {
    const renderWeaponPerks = () => {
        if (!item) return null;
        if (!itemInstanceId) return;
        const filteredPerks = itemComponents.perks[itemInstanceId].perks.filter(
            (p: any) => p.isActive && p.visible
        );
        const frame = filteredPerks[0];
        const perks = [filteredPerks[1], filteredPerks[2]].filter((p) => p);
        const mod = filteredPerks.length > 4 ? filteredPerks[3] : undefined;
        const originTrait = filteredPerks[filteredPerks.length - 1];
        return (
            <div className="flex flex-col w-full">
                <div
                    key={"frame"}
                    className="flex flex-row items-center gap-4 bg-gray-500 bg-opacity-25 w-full p-2"
                >
                    <img
                        src={`https://www.bungie.net${frame.iconPath}`}
                        height={32}
                        width={32}
                    />
                    <div className="flex flex-col text-left">
                        <div>{perksDefinitions[frame.perkHash].displayProperties.name}</div>
                        {item.inventory.tierType === 6 && (
                            <div className="text-sm max-w-[300px]">
                                {perksDefinitions[frame.perkHash].displayProperties.description}
                            </div>
                        )}
                    </div>
                </div>
                <div
                    key={"perks"}
                    className="flex flex-row gap-2 w-full p-2 items-center justify-center"
                >
                    {perks.map((p: any, idx: number) => (
                        <div key={idx}>
                            {p && (
                                <div className="rounded rounded-full bg-sky-500 p-1">
                                    <img
                                        src={`https://www.bungie.net${perksDefinitions[p.perkHash].displayProperties.icon
                                            }`}
                                        height={32}
                                        width={32}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                    {originTrait && (
                        <div className="rounded rounded-full bg-sky-500 p-1">
                            <img
                                src={`https://www.bungie.net${originTrait.iconPath}`}
                                height={32}
                                width={32}
                            />
                        </div>
                    )}
                    {mod && (
                        <img
                            src={`https://www.bungie.net${mod.iconPath}`}
                            height={32}
                            width={40}
                        />
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
                                    (p: any) =>
                                        p.isActive && p.visible && (p.iconPath as string).length > 0
                                )
                                .map((p: any, idx: number) => {
                                    const perkDef = perksDefinitions[p.perkHash];
                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-row items-center gap-2 mb-2"
                                        >
                                            <img
                                                src={`https://www.bungie.net${p.iconPath}`}
                                                height={32}
                                                width={32}
                                                alt={perkDef.displayProperties.name ?? "Perk"}
                                            />
                                            <div className="flex flex-col items-start text-left">
                                                <span className="text-sm font-semibold text-gray-200">
                                                    {perkDef.displayProperties.name || "Perk"}
                                                </span>
                                                <span className="text-xs text-gray-400 max-w-[350px]">
                                                    {perkDef.displayProperties.description ?? ""}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                    </div>
                </div>
            )}
        </>
    );
};

export default TooltipPerks;
