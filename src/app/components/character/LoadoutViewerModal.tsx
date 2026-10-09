import React, { useMemo } from "react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import ItemComponent from "./Item";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { Item, Loadout } from "@/lib/types";

interface LoadoutViewerModalProps {
    open: boolean;
    onClose: () => void;
    loadout: Loadout | null;
    characterId: string;
}

const LoadoutViewerModal: React.FC<LoadoutViewerModalProps> = ({
    open,
    onClose,
    loadout,
    characterId,
}) => {
    const { characterInventories, characterEquipment, profileInventory, itemComponents } = useProfile();
    const { itemDefinitions } = useDefinitions();

    const loadoutItems = useMemo(() => {
        if (!loadout) return [];

        const allItems = [
            ...Object.values(characterInventories).flatMap((i) => i.items),
            ...Object.values(characterEquipment).flatMap((i) => i.items),
            ...profileInventory,
        ];

        return loadout.items
            .map((loadoutItem) => {
                const foundItem = allItems.find(
                    (item) => item.itemInstanceId === loadoutItem.itemInstanceId
                );
                return foundItem;
            })
            .filter((item): item is Item => item !== undefined);
    }, [loadout, characterInventories, characterEquipment, profileInventory]);

    useModalKeys(onClose, { enabled: open && !!loadout });

    if (!open || !loadout) return null;

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center z-[1000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            onClick={onClose}
        >
            <div
                className={`relative flex flex-col items-center w-[90vw] max-w-[600px] min-h-[300px] rounded-2xl shadow-2xl shadow-purple-900/20 border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md transition-all duration-300 ease-out
          ${open ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
        `}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center w-full justify-between p-4 border-b border-white/5">
                    <span className="text-xl text-white font-semibold pl-2">
                        Loadout Viewer
                    </span>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
                        title="Close"
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="w-full p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {loadoutItems.length === 0 ? (
                        <div className="text-gray-400 text-center py-10">
                            No items found for this loadout.
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 justify-items-center">
                            {loadoutItems.map((item) => {
                                const def = itemDefinitions[item.itemHash];
                                if (!def) return null;

                                const ornamentDef = item.overrideStyleItemHash ? itemDefinitions[item.overrideStyleItemHash] : undefined;

                                return (
                                    <ItemComponent
                                        key={item.itemInstanceId}
                                        itemHash={item.itemHash}
                                        itemInstanceId={item.itemInstanceId}
                                        state={item.state}
                                        characterId={characterId}
                                        ornamentItem={ornamentDef}
                                        perks={itemComponents.perks[item.itemInstanceId]} // Not strictly needed for basic view
                                        stats={itemComponents.stats[item.itemInstanceId]} // Not strictly needed for basic view
                                        size={64}
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadoutViewerModal;
