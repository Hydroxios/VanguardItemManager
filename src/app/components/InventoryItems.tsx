"use client"

import Item from "./Item"
import { equipItem } from "@/lib/bungie"
import { useNotifications } from "./NotificationsProvider"

interface InventoryItemsProps {
    token: string
    items: any[],
    itemInstances :any
    open: boolean,
    membershipType: number;
    characterId: string;
    perksDefinition :any;
    statsDefinition :any;
    characters :any;
    classDefinition :any;
    refresh: () => Promise<void>
    right: boolean
    armors :boolean
    onEquip?: (item :any, itemInstanceId :string, state :number, ornamentItem? :any) => Promise<void>
}

const InventoryItems = ({ token, items, itemInstances, open, membershipType, characterId, refresh, right, onEquip, classDefinition, statsDefinition, perksDefinition, characters, armors }:InventoryItemsProps) => {

    const { addNotification } = useNotifications()

    const equip = async (item :any, itemInstance :any, state :number, ornamentItem? :any) => {
        try {
            await equipItem(token, membershipType, characterId, itemInstance.itemInstanceId)
            if(onEquip){
                await onEquip(item, itemInstance.itemInstanceId, state, ornamentItem);
                addNotification("Succesfully Equiped " + item.displayProperties.name + " !", "", "success", "https://www.bungie.net" + (ornamentItem ? ornamentItem.displayProperties.icon : item.displayProperties.icon),5000)
            }
        } catch (err :any) {
            addNotification("Error while equiping " + item.displayProperties.name + " !", err.message, "error", "https://www.bungie.net" + (ornamentItem ? ornamentItem.displayProperties.icon : item.displayProperties.icon), 5000)
        }
    }

    return (
        <div>
            {open ? (
                <div className="relative">
                    {items.map((item, index) => (
                        <div key={index} className="absolute" style={{ top: `${Math.floor(index / 3) * 65}px`, right: `${(!right ? (((index % 3) * 65) + (right ? -65 * 4 : 0) - (right ? 5 : 0)) : -128-6 - (index % 3 * 65))}px`, height: "64px", width: "64px", padding: "0px", zIndex: 900 }}>
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
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="relative">
                    {items.map((_, index) => (
                        <div key={index} className="absolute" style={{ top: `${Math.floor(index / 3) * 10}px`, right: `${(!right ? ((index % 3) * 10) + (right ? (-10 * 4)-64 : 0) : -64-18 - (index % 3 * 10))}px`, padding: "1px" }}>
                            <div key={index} className="w-2 h-2 bg-gray-400 bg-opacity-75"/>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default InventoryItems