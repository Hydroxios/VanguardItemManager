import { Item } from './hooks/useProfile';

const apiKey = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_BUNGIE_API_KEY! : process.env.NEXT_PUBLIC_BUNGIE_API_KEY_DEV!;

export interface BungieUser {
    uniqueName: string
    membershipId: string
    membershipType: number
}

export interface UserInfo {
    displayName: string
    iconPath: string
    crossSaveOverride: number
    isPublic: boolean
    bungieGlobalDisplayNameCode: number
}

export interface Character {
    characterId: string;
    emblemHash: number;
    emblemPath: string;
    light: number;
    classType: number;
    raceType: number
    classHash: number
    raceHash: number
}

export interface ItemResponse {
    characterId: string
    item: {
        data: Item
    }
}

interface BungieFetchData {
    token?: string
    method?: "GET" | "POST"
    body?: string
    onError?: (err: Error) => void
}

const baseUrl = "https://www.bungie.net/Platform"

const bungie = async (url: string, init: BungieFetchData) => {

    const headers: HeadersInit = { "X-Api-Key": apiKey }
    if (init.token) headers["Authorization"] = `Bearer ${init.token}`;
    if (init.method === "POST") headers["Content-Type"] = "application/json"

    const response = await fetch(`${baseUrl}${url}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body ?? undefined
    })
    const data = await response.json()
    if (!response.ok) {
        if (init.onError) init.onError(new Error(data.Message));
        return { error: data.Message }
    }
    return data.Response
}

export const refreshToken = async (refreshToken: string) => {
    const response = await fetch(`/api/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("rtoken", data.refresh_token);
        localStorage.setItem("lastUpdate", Date.now().toString());
        return data.access_token as string;
    } else {
        console.error("Failed to refresh access token:", data);
        throw new Error("Failed to refresh token");
    }
}

export const getCurrentUser = async (token: string) => {
    const res = await fetch(`${baseUrl}/User/GetMembershipsForCurrentUser`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            "User-Agent": "HximApp/1.0 AppId/45124 (+https://hxitemmanager.web.app;hydroxios@gmail.com)"
        }
    })
    const data = await res.json()
    const destinyMembership = data.Response.primaryMembershipId ? data.Response.destinyMemberships.filter((m: any) => m.membershipId === data.Response.primaryMembershipId)[0] : data.Response.destinyMemberships[0];
    const user: BungieUser = {
        uniqueName: data.Response.bungieNetUser.uniqueName,
        membershipId: destinyMembership.membershipId,
        membershipType: destinyMembership.membershipType
    }
    return user;
}

export const getProfile = async (token: string, membershipId: string, membershipType: number) => {
    const profile = await bungie(`/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,103,104,200,201,202,205,206,300,302,304,307,308,310,1300`, { token })
    return profile
}

export type DestinyDefinitionTableName =
    | "DestinyInventoryItemDefinition"
    | "DestinyClassDefinition"
    | "DestinyStatDefinition"
    | "DestinySandboxPerkDefinition"
    | "DestinyRecordDefinition"
    | "DestinyLoadoutColorDefinition"
    | "DestinyLoadoutIconDefinition"
    | "DestinyRaceDefinition"
    | "DestinyInventoryBucketDefinition"
    | "DestinyInventoryItemConstantsDefinition"
    | "DestinySeasonDefinition";

interface DestinyManifest {
    jsonWorldContentPaths: Record<string, string>;
    jsonWorldComponentContentPaths: Record<string, Record<string, string>>;
}

let manifestPromise: Promise<DestinyManifest> | undefined;

export const getManifest = async () => {
    if (!manifestPromise) {
        manifestPromise = bungie("/Destiny2/Manifest", {}) as Promise<DestinyManifest>;
    }
    return manifestPromise;
}

const getManifestPath = (paths: Record<string, string> | undefined, locale: string) => {
    return paths?.[locale] ?? paths?.en ?? Object.values(paths ?? {})[0];
}

export const getDefinitions = async (locale?: string) => {
    const manifests = await getManifest()
    const path = getManifestPath(manifests.jsonWorldContentPaths, locale ?? "en");
    if (!path) throw new Error("Missing Destiny manifest aggregate path");
    const response = await fetch(`https://www.bungie.net${path}`);
    const data = await response.json();
    return data;
}

export const getDefinitionTable = async <T = unknown>(tableName: DestinyDefinitionTableName, locale?: string): Promise<T> => {
    const manifest = await getManifest();
    const tablePaths = manifest.jsonWorldComponentContentPaths[locale ?? "en"] ?? manifest.jsonWorldComponentContentPaths.en;
    const path = getManifestPath(tablePaths, tableName);
    if (!path) throw new Error(`Missing Destiny manifest component path for ${tableName}`);
    const response = await fetch(`https://www.bungie.net${path}`);
    if (!response.ok) throw new Error(`Failed to load ${tableName}`);
    return response.json();
}

export const getGlobalAlerts = async () => {
    const alerts = await bungie(`/GlobalAlerts`, {})
    return alerts
}

export const getCharacter = async (token: string, membershipId: string, membershipType: number, characterId: string) => {
    const res = await fetch(`${baseUrl}/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=103,201,205`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
        }
    });
    const data = await res.json();
    return { equipment: data.Response.equipment.data.items, items: data.Response.inventory.data.items as any[], loadouts: data.Response.loadouts.data.loadouts };
}

export const getCharacterInventory = async (token: string, membershipId: string, membershipType: number, characterId: string) => {
    const res = await fetch(`${baseUrl}/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=201`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey
        }
    });
    const data = await res.json();
    return { items: data.Response.inventory.data.items as any[] };
}

export const getItem = async (token: string, membershipType: number, membershipId: string, itemInstanceId: string, components: string) => {
    try {
        const res = await fetch(`${baseUrl}/Destiny2/${membershipType}/Profile/${membershipId}/Item/${itemInstanceId}/?components=${components}`, {
            headers: {
                Authorization: "Bearer " + token,
                "X-API-Key": apiKey
            }
        });
        const data = await res.json();
        return data.Response as ItemResponse;
    } catch {
        return undefined;
    }
}

export const equipLoadout = async (token: string, membershipType: number, characterId: string, loadoutIndex: number) => {
    await bungie("/Destiny2/Actions/Loadouts/EquipLoadout", {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex
        }),
        token
    })
}

export const transferItem = async (token: string, membershipType: number, itemHash: number, itemInstanceId: string, characterId: string, toVault: boolean, quantity?: number) => {
    await bungie("/Destiny2/Actions/Items/TransferItem/", {
        method: "POST",
        body: JSON.stringify({
            itemReferenceHash: itemHash,
            transferToVault: toVault,
            stackSize: quantity ?? 1,
            itemId: itemInstanceId,
            characterId: characterId,
            membershipType: membershipType
        }),
        token,
        onError: (err) => {
            throw err;
        }
    })
}

/**
 * Check if an item is equipped and transfer it safely
 * transferStatus === 1 means the item is equipped and needs to be unequipped first
 */
export const safeTransferItem = async (token: string, membershipType: number, itemHash: number, itemInstanceId: string,
    sourceCharacterId: string, targetCharacterId: string, membershipId: string, itemDefinitions?: any): Promise<any | null> => {
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
                        // Check if it's an exotic if definitions are available
                        if (itemDefinitions) {
                            const def = itemDefinitions[item.itemHash];
                            if (def && def.inventory && def.inventory.tierType === 6) {
                                console.log(`Skipping exotic replacement item ${item.itemHash}`);
                                continue;
                            }
                        }
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
                    return replacementItem;
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
    return null;
}

export const equipItems = async (token: string, membershipType: number, characterId: number, itemIds: number[]) => {
    await fetch(`${baseUrl}/Destiny2/Actions/Items/EquipItems/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            itemIds: itemIds
        })
    });
}

export const equipItem = async (token: string, membershipType: number, characterId: string, itemId: string) => {
    const response = await fetch(`${baseUrl}/Destiny2/Actions/Items/EquipItem/`, {
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

export const pullFromPostmaster = async (token: string, membershipType: number, characterId: string, itemReferenceHash: number, itemInstanceId: string, stackSize: number = 1) => {
    const response = await fetch(`${baseUrl}/Destiny2/Actions/Items/PullFromPostmaster/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json'
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

export const clearLoadout = async (
    token: string,
    membershipType: number,
    characterId: string,
    loadoutIndex: number
) => {
    await fetch(`${baseUrl}/Destiny2/Actions/Loadouts/ClearLoadout/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex
        })
    })
}
