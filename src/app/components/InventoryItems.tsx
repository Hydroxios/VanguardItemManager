"use client"

import Item from "./Item"
import { equipItem, safeTransferItem } from "@/lib/bungie"
import { useNotifications } from "./NotificationsProvider"

interface InventoryItemsProps {
    token: string
    items: any[],
    itemInstances: any
    open: boolean,
    membershipType: number;
    characterId: string;
    membershipId?: string;
    perksDefinition: any;
    statsDefinition: any;
    characters: any;
    classDefinition: any;
    refresh: () => Promise<void>
    right: boolean
    armors: boolean
    onEquip?: (item: any, itemInstanceId: string, state: number, ornamentItem?: any) => Promise<void>
}

const InventoryItems = ({ 
    token, 
    items, 
    itemInstances, 
    open, 
    membershipType, 
    characterId, 
    membershipId,
    refresh, 
    right, 
    onEquip, 
    classDefinition, 
    statsDefinition, 
    perksDefinition, 
    characters, 
    armors 
}: InventoryItemsProps) => {

    const { addNotification } = useNotifications()

    const equip = async (item: any, itemInstance: any, state: number, ornamentItem?: any) => {
        try {
            await equipItem(token, membershipType, characterId, itemInstance.itemInstanceId)
            if(onEquip){
                await onEquip(item, itemInstance.itemInstanceId, state, ornamentItem);
                addNotification("Successfully Equipped " + item.displayProperties.name + " !", "", "success", "https://www.bungie.net" + (ornamentItem ? ornamentItem.displayProperties.icon : item.displayProperties.icon), 5000)
            }
        } catch (err: any) {
            addNotification("Error while equipping " + item.displayProperties.name + " !", err.message, "error", "https://www.bungie.net" + (ornamentItem ? ornamentItem.displayProperties.icon : item.displayProperties.icon), 5000)
        }
    }

    return (
        <div>
            {open ? (
                <div className="relative">
                    {items.map((item, index) => (
                        <div key={index} className="absolute" style={{ top: `${Math.floor(index / 3) * 65}px`, right: `${(!right ? (((index % 3) * 65) + (right ? -65 * 4 : 0) - (right ? 5 : 0)) : -128-6 - (index % 3 * 65))}px`, height: "64px", width: "64px", padding: "0px", zIndex: 10}}>
                            <Item 
                                item={item.item} 
                                itemInstance={item.itemInstance} 
                                ornamentItem={item.ornamentItem} 
                                onDoubleClick={() => equip(item.item, item.itemInstance, item.state, item.ornamentItem)} 
                                state={item.state}
                                characterId={characterId}
                                characters={characters}
                                perks={item.perks}
                                stats={item.stats}
                                classDefinition={classDefinition}
                                perksDefinition={perksDefinition}
                                statsDefinition={statsDefinition}
                                armor={armors}
                                itemInstances={itemInstances}
                                membershipId={membershipId}
                                membershipType={membershipType}
                                token={token}
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
                        }}></div>
                    );
                })}
            </div>
            }
        </div>
    )
}

export default InventoryItems