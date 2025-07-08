// This file is kept for backwards compatibility but delegates to the new API client
// export * from './api/bungieApiClient';
import { 
  clearLoadout as apiClearLoadout,
  refreshToken as apiRefreshToken,
  getCurrentUser as apiGetCurrentUser,
  getProfile as apiGetProfile,
  getDefinitions as apiGetDefinitions,
  getGlobalAlerts as apiGetGlobalAlerts,
  getCharacter as apiGetCharacter,
  getCharacterInventory as apiGetCharacterInventory,
  getItem as apiGetItem,
  equipLoadout as apiEquipLoadout,
  transferItem as apiTransferItem,
  safeTransferItem as apiSafeTransferItem,
  equipItem as apiEquipItem,
  equipItems as apiEquipItems,
  pullFromPostmaster as apiPullFromPostmaster
} from './api/bungieApiClient';
import { Item } from './hooks/useProfile';

const rootPath = "https://www.bungie.net/Platform"
const apiKey = process.env.NODE_ENV === 'production' ? "401004d697cc44a8a8f76fdc47105211" : "56071839a5234888ae60e56b80d63141";

let lastUpdate :any = undefined;

export interface BungieUser {
    uniqueName: string
    membershipId: string
    membershipType: number
}

export interface Character {
    characterId: string;
    emblemHash: number;
    emblemPath: string;
    light: number;
    classType: number;
    raceType: number
    classHash :number
    raceHash :number
}

export interface ItemResponse {
    characterId: string
    item: {
      data: Item
    }
}

export const refreshToken = async (refreshToken: string) => {
    const response = await fetch("https://www.bungie.net/Platform/App/OAuth/token/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        },
        body: new URLSearchParams({
            client_id: process.env.NODE_ENV === "production" ? "46066" : "45124", // Replace with your actual client_id
            client_secret: process.env.NODE_ENV === "production" ? "MkdPd6spUjiFiPbCKac3ZdMlT0pdDV7ErAZ-9eEfUg8" : "HSNNQvKDJuZZvzmswHAy66ZeS9y3c..tZ6U8keEb.v4", // Replace with your actual client_secret
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });

    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("rtoken", data.refresh_token);
        localStorage.setItem("lastUpdate", Date.now().toString());
        lastUpdate = Date.now()
        return data.access_token as string;
    } else {
        console.error("Failed to refresh access token:", data);
        throw new Error("Failed to refresh token");
    }
}

export const getCurrentUser = async (token :string) => {
   const res = await fetch("/api/User/GetMembershipsForCurrentUser", {
    headers: {
        Authorization: "Bearer " + token,
        "X-Api-Key": apiKey,
        "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
    }
   }) 
   const data = await res.json()
   let destinyMembership = data.Response.primaryMembershipId ? data.Response.destinyMemberships.filter((m :any) => m.membershipId === data.Response.primaryMembershipId)[0] : data.Response.destinyMemberships[0];
   const user :BungieUser = {
    uniqueName: data.Response.bungieNetUser.uniqueName,
    membershipId: destinyMembership.membershipId,
    membershipType: destinyMembership.membershipType
   }
   return user;
}

export const getProfile = async (token :string, membershipId: string, membershipType: number) => {
    const res = await fetch(`/api/Destiny2/${membershipType}/Profile/${membershipId}?components=100,102,103,104,200,201,202,205,206,300,302,304,307,308,310,1300`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        }
    })
    const data = await res.json()
    return data.Response
}

export const getDefinitions = async (locale? :string) => {
    const res = await fetch("/api/Destiny2/Manifest", {
        headers: {
            "X-Api-Key": apiKey,
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        }
    });
    const data = await res.json();
    const aggregateUrl = "https://www.bungie.net" + data.Response.jsonWorldContentPaths[locale ?? "en"]
    const aggregateRes = await fetch(aggregateUrl);
    const aggregateData = await aggregateRes.json();
    return aggregateData;
}

export const getGlobalAlerts = async () => {
    const res = await fetch("/api/GlobalAlerts", {
        headers: {
            "X-Api-Key": apiKey,
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        }
    })
    const data = await res.json()
    return data.Response
}

export const getCharacter = async (token: string, membershipId: string, membershipType: number, characterId: string) => {
    const res = await fetch(`/api/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=103,201,205`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        }
    });
    const data = await res.json();
    return {equipment: data.Response.equipment.data.items ,items: data.Response.inventory.data.items as any[], loadouts: data.Response.loadouts.data.loadouts};
}

export const getCharacterInventory = async (token: string, membershipId: string, membershipType: number, characterId: string) => {
    const res = await fetch(`/api/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=201`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        }
    });
    const data = await res.json();
    return {items: data.Response.inventory.data.items as any[]};
}

export const getItem = async (token: string, membershipType: number, membershipId: string, itemInstanceId: string, components :string) => {
    try {
        const res = await fetch(`/api/Destiny2/${membershipType}/Profile/${membershipId}/Item/${itemInstanceId}?components=${components}`, {
            headers: {
                Authorization: "Bearer " + token,
                "X-API-Key": apiKey,
                "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
            }
        });
        const data = await res.json();
        return data.Response as ItemResponse;
    } catch {
        return undefined;
    }
}

export const equipLoadout = async (token: string, membershipType: number, characterId: string, loadoutIndex: number) => {
    await fetch(`/api/Destiny2/Actions/Loadouts/EquipLoadout`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json',
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        },
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex
        })
    });
}

export const transferItem = async (token: string, membershipType: number, itemHash: number, itemInstanceId: string, characterId: string, toVault: boolean, quantity?: number) => {
    const response = await fetch(`/api/Destiny2/Actions/Items/TransferItem/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            itemReferenceHash: itemHash,
            transferToVault: toVault,
            stackSize: quantity ?? 1,
            itemId: itemInstanceId,
            characterId: characterId,
            membershipType: membershipType
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message);
    }
}

/**
 * Check if an item is equipped and transfer it safely
 * transferStatus === 1 means the item is equipped and needs to be unequipped first
 */
export const safeTransferItem = async (token: string, membershipType: number, itemHash: number, itemInstanceId: string, 
                                       sourceCharacterId: string, targetCharacterId: string, membershipId: string) => {
    // First check if the item is equipped
    const itemResponse = await getItem(token, membershipType, membershipId, itemInstanceId, "307,302,304,305");
    
    if (itemResponse && itemResponse.item) {
        const transferStatus = itemResponse.item.data.transferStatus;
        const equipmentSlotHash = itemResponse.item.data.bucketHash; // The slot this item is equipped in
        
        // If transferStatus is 1, the item is equipped and we need to unequip it
        if (transferStatus === 1) {
            console.log(`Item ${itemHash} is equipped. Finding replacement...`);
            
            // Get character inventory to find replacement items
            const characterInventory = await getCharacterInventory(token, membershipId, membershipType, sourceCharacterId);
            
            // Try to find another item of the same type in the inventory to equip
            let replacementItem = null;
            if (characterInventory && characterInventory.items) {
                for (const item of characterInventory.items) {
                    // Avoid using the same item as replacement
                    if (item.itemInstanceId !== itemInstanceId && item.bucketHash === equipmentSlotHash) {
                        replacementItem = item;
                        break;
                    }
                }
            }
            
            if (replacementItem) {
                // Equip the replacement item first
                console.log(`Equipping replacement item ${replacementItem.itemInstanceId}`);
                try {
                    await equipItem(token, membershipType, sourceCharacterId, replacementItem.itemInstanceId);
                    
                    // Now that another item is equipped, transfer the original item
                    console.log(`Transferring original item ${itemInstanceId} to ${targetCharacterId === "vault" ? "vault" : "character"}`);
                    await transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
                    
                    // If not going to vault, transfer to target character
                    if (targetCharacterId !== "vault") {
                        await transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                    }
                } catch (error) {
                    console.error("Error during replacement equip:", error);
                    // If equipping replacement fails, try direct transfer as fallback
                    await transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
                    if (targetCharacterId !== "vault") {
                        await transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                    }
                }
            } else {
                console.log("No replacement found, trying direct transfer");
                // No replacement found, try direct transfer (may fail if equipping constraints prevent it)
                await transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
                if (targetCharacterId !== "vault") {
                    await transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                }
            }
        } else {
            // Item is not equipped, can transfer directly
            if (targetCharacterId === "vault") {
                await transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
            } else {
                // If moving between characters
                if (sourceCharacterId !== targetCharacterId) {
                    await transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
                    await transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                }
            }
        }
    } else {
        // Fallback if we couldn't get item data
        if (targetCharacterId === "vault") {
            await transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
        } else if (sourceCharacterId !== targetCharacterId) {
            await transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
            await transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
        }
    }
}

export const equipItems = async (token: string, membershipType: number, characterId: number, itemIds: number[]) => {
    await fetch(rootPath + `/Destiny2/Actions/Items/EquipItems/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json',
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        },
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            itemIds: itemIds
        })
    });
}

export const equipItem = async (token: string, membershipType: number, characterId: string, itemId: string) => {
    const response = await fetch(rootPath + `/Destiny2/Actions/Items/EquipItem/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            itemId: itemId
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message);
    }
}

export const pullFromPostmaster = async (token: string, membershipType: number, characterId: string, itemReferenceHash: string, itemInstanceId: string, stackSize: number = 1) => {
    const response = await fetch(rootPath + `/Destiny2/Actions/Items/PullFromPostmaster/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json',
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        },
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            itemReferenceHash: itemReferenceHash,
            itemId: itemInstanceId,
            stackSize: stackSize
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message);
    }
}

export const updateLoadout = async (
    token: string, 
    membershipType: number, 
    characterId: string, 
    loadoutIndex: number, 
    name: string, 
    iconHash: number, 
    colorHash: number,
    items: { itemInstanceId: string, plugItemHashes: number[] }[]
) => {
    const response = await fetch(rootPath + `/Destiny2/Actions/Loadouts/UpdateLoadout/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json',
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        },
        body: JSON.stringify({
            colorHash,
            iconHash,
            membershipType,
            characterId,
            loadoutIndex,
            name,
            items
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message);
    }
    
    return response.json();
}

export const createLoadout = async (
    token: string, 
    membershipType: number, 
    characterId: string, 
    name: string, 
    iconHash: number, 
    colorHash: number,
    items: { itemInstanceId: string, plugItemHashes: number[] }[]
) => {
    const response = await fetch(rootPath + `/Destiny2/Actions/Loadouts/CreateLoadout/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json',
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        },
        body: JSON.stringify({
            colorHash,
            iconHash,
            membershipType,
            characterId,
            name,
            items
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message);
    }
    
    return response.json();
}

export const clearLoadout = async (
    token: string,
    membershipType: number,
    characterId: string,
    loadoutIndex: number
) => {
    try {
        // Use the API client implementation
        return await apiClearLoadout(token, membershipType, characterId, loadoutIndex);
    } catch (error: any) {
        throw new Error(error.message || "Failed to clear loadout");
    }
}