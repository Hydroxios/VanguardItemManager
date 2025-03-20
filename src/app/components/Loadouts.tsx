"use client";

import {
  equipItem,
  equipLoadout,
  getItem,
  transferItem,
} from "@/lib/bungie";
import { useEffect, useState } from "react";
import { useNotifications } from "./NotificationsProvider";

interface LoadoutsProps {
  loadouts: any[];
  itemDefinition: any;
  loadoutsColorDefinition: any;
  loadoutIconDefinition: any;
  token: string;
  membershipType: number;
  membershipeId: string;
  characterId: string;
  itemInstances: any;
  character: any;
  charactersInventory :any
  refreshChar: () => Promise<void>;
}

const Loadouts = ({
  loadouts,
  loadoutsColorDefinition,
  loadoutIconDefinition,
  token,
  membershipType,
  membershipeId,
  characterId,
  refreshChar,
  itemDefinition,
  charactersInventory
}: LoadoutsProps) => {
  const [elements, setElements] = useState<any>();

  const [onCooldown, setOnCooldown] = useState(false);

  const { addNotification } = useNotifications()

  useEffect(() => {
    const ls: any[] = [];
    for (let index = 0; index < loadouts.length; index++) {
      const l = loadouts[index];
      const color = loadoutsColorDefinition[l.colorHash];
      const icon = loadoutIconDefinition[l.iconHash];
      ls.push({ color: color?.colorImagePath, icon: icon?.iconImagePath });
    }
    setElements(() => ls);
  }, [loadouts]);

  const handleEquip = async (index: number) => {
    setOnCooldown(() => true);
    const l = loadouts[index];
    console.log("equipping");
    const itemToDesequip :any[] = []
    for (let i = 0; i < l.items.length; i++) {
      const loadoutItem = l.items[i];
      const itemInstance = await getItem(
        token,
        membershipType,
        membershipeId,
        loadoutItem.itemInstanceId,
        "307"
      );
      if(itemInstance){
        if (itemInstance.characterId) {
          if(itemInstance.characterId !== characterId){
            const transfertStatus = itemInstance.item.data.transferStatus
            if(transfertStatus === 0){
              await transferItem(token, membershipType, itemInstance.item.data.itemHash, loadoutItem.itemInstanceId, itemInstance.characterId, true)
              await transferItem(token, membershipType, itemInstance.item.data.itemHash, loadoutItem.itemInstanceId, characterId, false)
            } else if(transfertStatus === 1){
              itemToDesequip.push({characterId: itemInstance.characterId, itemInstance: itemInstance, item: itemDefinition[itemInstance.item.data.itemHash]})
            }
          }
        } else {
          await transferItem(token, membershipType, itemInstance.item.data.itemHash, loadoutItem.itemInstanceId, characterId, false)
        }
      }
    }

    const characters :any = {}
    for (let index = 0; index < itemToDesequip.length; index++) {
      const item = itemToDesequip[index];
      if(!characters[item.characterId]){
        characters[item.characterId] = charactersInventory[item.characterId].items
      }

      let validItem :any;
      characters[item.characterId].forEach((i :any)=> {
          if(validItem) return;
          if(i.itemHash !== item.item.hash){
            const itemObject = itemDefinition[i.itemHash]
            if(itemObject.equippingBlock){
              if(itemObject.equippingBlock.equipmentSlotTypeHash === item.item.equippingBlock.equipmentSlotTypeHash){
                if(itemObject.inventory.tierType < 6){
                  validItem = i;
                  return;
                }
              }
            }
          }
      });

      await equipItem(token, membershipType, item.characterId, validItem.itemInstanceId)
      await transferItem(token, membershipType, item.item.hash, item.itemInstance.item.data.itemInstanceId, item.characterId, true)
      await transferItem(token, membershipType, item.item.hash, item.itemInstance.item.data.itemInstanceId, characterId, false)
    }


    await equipLoadout(token, membershipType, characterId, index);
    const icon = loadoutIconDefinition[l.iconHash];
    addNotification("Succesfully equiped your loadaout !", "", "success", "https://www.bungie.net" + icon, 5000)
    setTimeout(async () => {
      await refreshChar();
      setOnCooldown(() => false);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-2 grid-rows-6 gap-2 p-4 fixed left-5 top-1/2 transform -translate-y-1/2">
      {elements &&
        elements.map((element: any, index: number) => (
          <div
            key={index}
            style={{
              border: "2px solid white",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
              cursor: element.icon && !onCooldown ? "pointer" : "",
            }}
            onClick={() => (element.icon ? handleEquip(index) : "")}
          >
            {onCooldown ? (
              <div
                className="size-[48px] border-2 border-white relative flex items-center justify-center"
                style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)" }}
              >
                <div className="w-8 h-8 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {element.color && (
                  <img
                    src={"https://bungie.net" + element.color}
                    height={48}
                    width={48}
                  />
                )}
                {element.icon ? (
                  <img
                    src={"https://bungie.net" + element.icon}
                    height={48}
                    width={48}
                    style={{ position: "absolute", top: 0, left: 0 }}
                  />
                ) : (
                  <img
                    src={"./new_loadout.svg"}
                    height={48}
                    width={48}
                  />
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default Loadouts;
