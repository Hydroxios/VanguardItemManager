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

export const refreshToken = async (refreshToken: string) => {
    const response = await fetch("https://www.bungie.net/Platform/App/OAuth/token/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
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
        return data.access_token;
    } else {
        console.error("Failed to refresh access token:", data);
        throw new Error("Failed to refresh token");
    }
}

export const getCurrentUser = async (token :string) => {
   const res = await fetch(rootPath + "/User/GetMembershipsForCurrentUser/", {
    headers: {
        Authorization: "Bearer " + token,
        "X-Api-Key": apiKey
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
    const validToken = await checkToken(token);
    const res = await fetch(rootPath + `/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,103,200,201,202,205,206,300,302,304`, {
        headers: {
            Authorization: "Bearer " + validToken,
            "X-Api-Key": apiKey
        }
    })
    if(res.status === 401){
        window.location.reload()
    }
    const data = await res.json()
    return data.Response
}

export const getDefinitions = async (locale? :string) => {
    const res = await fetch(rootPath + "/Destiny2/Manifest/", {
        headers: {
            "X-Api-Key": apiKey
        }
    });
    const data = await res.json();
    const aggregateUrl = "https://www.bungie.net" + data.Response.jsonWorldContentPaths[locale ?? "en"]
    const aggregateRes = await fetch(aggregateUrl);
    const aggregateData = await aggregateRes.json();
    return aggregateData;
}

export const getGlobalAlerts = async () => {
    const res = await fetch(rootPath + "/GlobalAlerts/", {
        headers: {
            "X-Api-Key": apiKey
        }
    })
    const data = await res.json()
    return data.Response
}

export const getCharacter = async (token: string, membershipId: string, membershipType: number, characterId: string) => {
    const res = await fetch(rootPath + `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=103,201,205`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey
        }
    });
    const data = await res.json();
    return {equipment: data.Response.equipment.data.items ,items: data.Response.inventory.data.items as any[], loadouts: data.Response.loadouts.data.loadouts};
}

export const getCharacterInventory = async (token: string, membershipId: string, membershipType: number, characterId: string) => {
    const res = await fetch(rootPath + `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=201`, {
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey
        }
    });
    const data = await res.json();
    return {items: data.Response.inventory.data.items as any[]};
}

export const getItem = async (token: string, membershipType: number, membershipId: string, itemInstanceId: string, components :string) => {
    try {
        const res = await fetch(rootPath + `/Destiny2/${membershipType}/Profile/${membershipId}/Item/${itemInstanceId}/?components=${components}`, {
            headers: {
                Authorization: "Bearer " + token,
                "X-API-Key": apiKey
            }
        });
        const data = await res.json();
        return data.Response;
    } catch {
        return undefined;
    }
}

export const equipLoadout = async (token: string, membershipType: number, characterId: string, loadoutIndex: number) => {
    await fetch(rootPath + `/Destiny2/Actions/Loadouts/EquipLoadout/`, {
        method: 'POST',
        headers: {
            Authorization: "Bearer " + token,
            "X-Api-Key": apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex
        })
    });
}

export const transferItem = async (token: string, membershipType: number, itemHash: string, itemInstanceId: string, characterId: string, toVault: boolean, quantity?: number) => {
    await fetch(rootPath + `/Destiny2/Actions/Items/TransferItem/`, {
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
}

export const equipItems = async (token: string, membershipType: number, characterId: number, itemIds: number[]) => {
    await fetch(rootPath + `/Destiny2/Actions/Items/EquipItems/`, {
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

const checkToken = async (token :string) => {
    const now = Date.now()
    if(!lastUpdate) lastUpdate = localStorage.getItem("lastUpdate");
    if((now - lastUpdate) >= 3600000){
        lastUpdate = now;
        console.log("Token Refreshed !")
        localStorage.setItem("lastUpdate", now.toString())
        return await refreshToken(localStorage.getItem("rtoken") as string)
    }
    return token;
}