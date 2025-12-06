import { ItemDefinition, useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import Image from "next/image";

interface TooltipSubclassProps {
    item: ItemDefinition;
    itemInstanceId?: string;
}

const TooltipSubclass = ({ item, itemInstanceId }: TooltipSubclassProps) => {

    const { itemComponents, } = useProfile();
    const { perksDefinitions, itemDefinitions } = useDefinitions();

    return (
        <div className="flex flex-col items-start justify-start gap-2 p-2">
            {itemComponents.perks[itemInstanceId!].perks.map((p, index) => p.isActive && p.visible && (
                <div key={index} className="flex flex-row items-center justify-center gap-2">
                    {Object.values(itemDefinitions).filter((i) => i.itemCategoryHashes?.includes(1043342778) && i.perks.find((pe) => pe.perkHash === p.perkHash))?.map((i) => <Image src={"https://www.bungie.net" + i.displayProperties.icon} alt="Perk" height={48} width={48} />)}
                    <div className="text-md font-bold">{perksDefinitions[p.perkHash].displayProperties.name}</div>
                </div>
            ))}
        </div>
    );
};

export default TooltipSubclass;
