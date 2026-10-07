import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { useMemo } from "react";
import Item from '@/app/components/character/Item';
import { equipItem } from "@/lib/bungie";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { BUCKETS } from "@/lib/constants";

interface EmblemSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: string;
}


const EmblemSelector = ({ isOpen, onClose, characterId }: EmblemSelectorProps) => {
    const {
        characterInventories,
        user,
        changeEmblem
    } = useProfile();

    const { itemDefinitions } = useDefinitions();

    const { addNotification } = useNotifications();

    const emblems = useMemo(() => {
        const allEmblems: any[] = [];

        // Helper to process items
        const processItems = (items: any[], sourceId: string) => {
            items.forEach((item) => {
                const def = itemDefinitions[item.itemHash];
                if (def && def.inventory && def.inventory.bucketTypeHash === BUCKETS.EMBLEM) {
                    allEmblems.push({
                        ...item,
                        sourceId,
                        def
                    });
                }
            });
        };

        // Check character inventories
        if (characterInventories[characterId]) {
            processItems(characterInventories[characterId].items, characterId);
        }

        return allEmblems;
    }, [characterInventories, characterId, itemDefinitions]);

    const handleEmblemClick = async (emblem: any) => {
        try {
            // Equip the emblem
            await equipItem(
                user.membershipType,
                characterId,
                emblem.itemInstanceId
            );

            changeEmblem(characterId, emblem.itemHash);
            addNotification("Emblem equipped", "The emblem has been successfully equipped.", "success");
            onClose();

        } catch (error: any) {
            addNotification("Error equipping emblem", error.message, "error");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-[75px] left-[250px] z-[1002] flex items-start justify-start bg-transparent hover:backdrop-blur-sm hover:bg-gray-300/10 flex-col text-left transition-all duration-150 hover:shadow-lg" onClick={onClose}>
            <div className="flex items-center justify-between w-full">
                <p className="text-white text-md pl-2 pt-2 uppercase tracking-wider">Emblems</p>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    onClick={onClose}
                    className="cursor-pointer"
                >
                    <path
                        stroke="currentColor"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </div>
            <div className="w-[80%] h-[1px] bg-gray-400 opacity-30 mx-auto"></div>
            <div className="p-2 max-h-[80vh] overflow-y-hidden grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                {emblems.map((emblem) => (
                    <div key={emblem.itemInstanceId} onClick={() => handleEmblemClick(emblem)} className="cursor-pointer hover:scale-105 transition-transform">
                        <Item
                            itemHash={emblem.itemHash}
                            itemInstanceId={emblem.itemInstanceId}
                            state={emblem.state}
                            characterId={characterId}
                            perks={undefined}
                            stats={undefined}
                            armor={false}
                            tooltipDisabled={true}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmblemSelector;
