"use client"

import Item from "./Item"
import { equipItem } from "@/lib/bungie"
import { useNotifications } from "@/app/components/NotificationsProvider"
import { ItemDefinition } from "@/lib/hooks/useDefinitions"
import useAuth from "@/lib/hooks/useAuth"
import { useProfile } from "@/lib/hooks/useProfile"
import { EquipmentItem } from "@/lib/types/destinyTypes"

interface InventoryItemsProps {
    items: EquipmentItem[],
    open: boolean,
    characterId: string;
    right: boolean
    armors: boolean
}

const InventoryItems = ({
    items,
    open,
    characterId,
    right,
    armors
}: InventoryItemsProps) => {

    const { addNotification } = useNotifications()

    const { token } = useAuth()
    const { user, equipItemLocally } = useProfile()

    const equip = async (item: ItemDefinition, itemInstanceId: string, state: number, hash: number, ornamentItem?: any,) => {
        try {
            await equipItem(token as string, user.membershipType, characterId, itemInstanceId)
            equipItemLocally(characterId, itemInstanceId)
            addNotification("Successfully Equipped " + item.displayProperties.name + " !", "", "success", "https://www.bungie.net" + (ornamentItem ? ornamentItem.displayProperties.icon : item.displayProperties.icon), 5000)
        } catch (err: any) {
            addNotification("Error while equipping " + item.displayProperties.name + " !", err.message, "error", "https://www.bungie.net" + (ornamentItem ? ornamentItem.displayProperties.icon : item.displayProperties.icon), 5000)
        }
    }

    return (
        <div>
            {open ? (
                <div className="relative">
                    {items.map((item, index) => (
                        <div key={index} className="absolute" style={{ top: `${Math.floor(index / 3) * 65}px`, right: `${(!right ? (((index % 3) * 65) + (right ? -65 * 4 : 0) - (right ? 5 : 0)) : -128 - 6 - (index % 3 * 65))}px`, height: "64px", width: "64px", padding: "0px", zIndex: 10 }}>
                            <Item
                                itemHash={item.hash}
                                itemInstanceId={item.itemInstanceId}
                                ornamentItem={item.ornamentItem}
                                onDoubleClick={() => equip(item.item, item.itemInstanceId, item.state, item.hash, item.ornamentItem)}
                                state={item.state}
                                characterId={characterId}
                                perks={item.perks}
                                stats={item.stats}
                                armor={armors}
                                quantity={item.quantity || 1}
                            />
                        </div>
                    ))}
                </div>
            ) :
                <div className="relative">
                    {items.map((_, index) => {
                        const row = Math.floor(index / 3);
                        const col = index % 3;
                        const topPosition = row * 12;

                        const adjustedCol = right ? (2 - col) : col;

                        let rightPosition;
                        if (right) {
                            rightPosition = -105 + (adjustedCol * 12);
                        } else {
                            rightPosition = (adjustedCol * 12);
                        }

                        return (
                            <div key={index} className="absolute" style={{
                                top: `${topPosition}px`,
                                right: `${rightPosition}px`,
                                height: "10px",
                                width: "10px",
                                backgroundColor: "#777777",
                                opacity: 0.5,
                            }}></div>
                        );
                    })}
                </div>
            }
        </div>
    )
}

export default InventoryItems