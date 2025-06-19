const ROOT_PATH = "https://www.bungie.net/Platform";
const API_KEY = process.env.NODE_ENV === 'production' 
  ? "401004d697cc44a8a8f76fdc47105211" 
  : "56071839a5234888ae60e56b80d63141";
const CLIENT_ID = process.env.NODE_ENV === 'production' ? "46066" : "45124";
const CLIENT_SECRET = process.env.NODE_ENV === 'production' 
  ? "MkdPd6spUjiFiPbCKac3ZdMlT0pdDV7ErAZ-9eEfUg8" 
  : "HSNNQvKDJuZZvzmswHAy66ZeS9y3c..tZ6U8keEb.v4";

export interface BungieUser {
  uniqueName: string;
  membershipId: string;
  membershipType: number;
}

export interface Character {
  characterId: string;
  emblemHash: number;
  emblemPath: string;
  light: number;
  classType: number;
  raceType: number;
  classHash: number;
  raceHash: number;
}

class BungieApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}, 
    token?: string
  ): Promise<T> {
    const headers: HeadersInit = {
      "X-Api-Key": API_KEY,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${ROOT_PATH}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.Message || "API request failed");
    }

    const data = await response.json();
    return data.Response;
  }

  // Auth API
  async refreshToken(refreshToken: string): Promise<string> {
    const response = await fetch(`${ROOT_PATH}/App/OAuth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("rtoken", data.refresh_token);
      localStorage.setItem("lastUpdate", Date.now().toString());
      return data.access_token;
    } else {
      console.error("Failed to refresh access token:", data);
      throw new Error("Failed to refresh token");
    }
  }

  // User API
  async getCurrentUser(token: string): Promise<BungieUser> {
    const data = await this.request<any>(
      "/User/GetMembershipsForCurrentUser/", 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    let destinyMembership = data.primaryMembershipId 
      ? data.destinyMemberships.filter((m: any) => m.membershipId === data.primaryMembershipId)[0] 
      : data.destinyMemberships[0];
    
    return {
      uniqueName: data.bungieNetUser.uniqueName,
      membershipId: destinyMembership.membershipId,
      membershipType: destinyMembership.membershipType
    };
  }

  // Profile API
  async getProfile(
    token: string, 
    membershipId: string, 
    membershipType: number
  ): Promise<any> {
    const components = "100,102,103,104,200,201,202,205,206,300,302,304";
    return this.request<any>(
      `/Destiny2/${membershipType}/Profile/${membershipId}/?components=${components}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async getCharacter(
    token: string, 
    membershipId: string, 
    membershipType: number, 
    characterId: string
  ): Promise<any> {
    const data = await this.request<any>(
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=103,201,205`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return {
      equipment: data.equipment.data.items,
      items: data.inventory.data.items,
      loadouts: data.loadouts.data.loadouts
    };
  }

  async getCharacterInventory(
    token: string, 
    membershipId: string, 
    membershipType: number, 
    characterId: string
  ): Promise<any> {
    const data = await this.request<any>(
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=201`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return { items: data.inventory.data.items };
  }

  // Item API
  async getItem(
    token: string, 
    membershipType: number, 
    membershipId: string, 
    itemInstanceId: string, 
    components: string
  ): Promise<any> {
    try {
      return await this.request<any>(
        `/Destiny2/${membershipType}/Profile/${membershipId}/Item/${itemInstanceId}/?components=${components}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      return undefined;
    }
  }

  async transferItem(
    token: string, 
    membershipType: number, 
    itemHash: string, 
    itemInstanceId: string, 
    characterId: string, 
    toVault: boolean, 
    quantity: number = 1
  ): Promise<void> {
    await this.request(
      `/Destiny2/Actions/Items/TransferItem/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemReferenceHash: itemHash,
          transferToVault: toVault,
          stackSize: quantity,
          itemId: itemInstanceId,
          characterId: characterId,
          membershipType: membershipType
        })
      }
    );
  }

  async equipItem(
    token: string, 
    membershipType: number, 
    characterId: string, 
    itemId: string
  ): Promise<void> {
    await this.request(
      `/Destiny2/Actions/Items/EquipItem/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: itemId,
          characterId: characterId,
          membershipType: membershipType
        })
      }
    );
  }

  async equipItems(
    token: string, 
    membershipType: number, 
    characterId: number, 
    itemIds: number[]
  ): Promise<void> {
    await this.request(
      `/Destiny2/Actions/Items/EquipItems/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemIds: itemIds,
          characterId: characterId,
          membershipType: membershipType
        })
      }
    );
  }

  async pullFromPostmaster(
    token: string, 
    membershipType: number, 
    characterId: string, 
    itemReferenceHash: string, 
    itemInstanceId: string, 
    stackSize: number = 1
  ): Promise<void> {
    await this.request(
      `/Destiny2/Actions/Items/PullFromPostmaster/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemReferenceHash: itemReferenceHash,
          stackSize: stackSize,
          itemId: itemInstanceId,
          characterId: characterId,
          membershipType: membershipType
        })
      }
    );
  }

  // Loadout API
  async equipLoadout(
    token: string, 
    membershipType: number, 
    characterId: string, 
    loadoutIndex: number
  ): Promise<void> {
    await this.request(
      `/Destiny2/Actions/Loadouts/EquipLoadout/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          membershipType: membershipType,
          characterId: characterId,
          loadoutIndex: loadoutIndex
        })
      }
    );
  }

  async clearLoadout(
    token: string, 
    membershipType: number, 
    characterId: string, 
    loadoutIndex: number
  ): Promise<void> {
    await this.request(
      `/Destiny2/Actions/Loadouts/ClearLoadout/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          membershipType: membershipType,
          characterId: characterId,
          loadoutIndex: loadoutIndex
        })
      }
    );
  }

  // Definition API
  async getDefinitions(locale: string = "en"): Promise<any> {
    const manifestData = await this.request<any>("/Destiny2/Manifest/");
    const aggregateUrl = `https://www.bungie.net${manifestData.jsonWorldContentPaths[locale]}`;
    const response = await fetch(aggregateUrl);
    return await response.json();
  }

  // Alerts API
  async getGlobalAlerts(): Promise<any[]> {
    return this.request<any[]>("/GlobalAlerts/");
  }

  // Safe item transfer handling special cases
  async safeTransferItem(
    token: string, 
    membershipType: number, 
    itemHash: string, 
    itemInstanceId: string, 
    sourceCharacterId: string, 
    targetCharacterId: string, 
    membershipId: string
  ): Promise<void> {
    // First check if the item is equipped
    const itemData = await this.getItem(token, membershipType, membershipId, itemInstanceId, "307,302,304,305");
    
    if (itemData && itemData.item && itemData.item.data) {
      const transferStatus = itemData.item.data.transferStatus;
      const equipmentSlotHash = itemData.item.data.bucketHash; // The slot this item is equipped in
      
      // If transferStatus is 1, the item is equipped and we need to unequip it
      if (transferStatus === 1) {
        console.log(`Item ${itemHash} is equipped. Finding replacement...`);
        
        // Get character inventory to find replacement items
        const characterInventory = await this.getCharacterInventory(token, membershipId, membershipType, sourceCharacterId);
        
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
            await this.equipItem(token, membershipType, sourceCharacterId, replacementItem.itemInstanceId);
            
            // Now that another item is equipped, transfer the original item
            console.log(`Transferring original item ${itemInstanceId} to ${targetCharacterId === "vault" ? "vault" : "character"}`);
            await this.transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
            
            // If not going to vault, transfer to target character
            if (targetCharacterId !== "vault") {
              await this.transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
            }
          } catch (error) {
            console.error("Error during replacement equip:", error);
            // If equipping replacement fails, try direct transfer as fallback
            await this.transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
            if (targetCharacterId !== "vault") {
              await this.transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
            }
          }
        } else {
          console.log("No replacement found, trying direct transfer");
          // No replacement found, try direct transfer (may fail if equipping constraints prevent it)
          await this.transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
          if (targetCharacterId !== "vault") {
            await this.transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
          }
        }
      } else {
        // Item is not equipped, can transfer directly
        if (targetCharacterId === "vault") {
          await this.transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
        } else {
          // If moving between characters
          await this.transferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
          await this.transferItem(token, membershipType, itemHash, itemInstanceId, targetCharacterId, false);
        }
      }
    }
  }
}

// Export singleton instance
export const bungieApi = new BungieApiClient();

// Re-export specific functions to maintain backwards compatibility
export const refreshToken = (refreshToken: string) => bungieApi.refreshToken(refreshToken);
export const getCurrentUser = (token: string) => bungieApi.getCurrentUser(token);
export const getProfile = (token: string, membershipId: string, membershipType: number) => bungieApi.getProfile(token, membershipId, membershipType);
export const getDefinitions = (locale?: string) => bungieApi.getDefinitions(locale);
export const getGlobalAlerts = () => bungieApi.getGlobalAlerts();
export const getCharacter = (token: string, membershipId: string, membershipType: number, characterId: string) => bungieApi.getCharacter(token, membershipId, membershipType, characterId);
export const getCharacterInventory = (token: string, membershipId: string, membershipType: number, characterId: string) => bungieApi.getCharacterInventory(token, membershipId, membershipType, characterId);
export const getItem = (token: string, membershipType: number, membershipId: string, itemInstanceId: string, components: string) => bungieApi.getItem(token, membershipType, membershipId, itemInstanceId, components);
export const equipLoadout = (token: string, membershipType: number, characterId: string, loadoutIndex: number) => bungieApi.equipLoadout(token, membershipType, characterId, loadoutIndex);
export const transferItem = (token: string, membershipType: number, itemHash: string, itemInstanceId: string, characterId: string, toVault: boolean, quantity?: number) => bungieApi.transferItem(token, membershipType, itemHash, itemInstanceId, characterId, toVault, quantity);
export const safeTransferItem = (token: string, membershipType: number, itemHash: string, itemInstanceId: string, sourceCharacterId: string, targetCharacterId: string, membershipId: string) => bungieApi.safeTransferItem(token, membershipType, itemHash, itemInstanceId, sourceCharacterId, targetCharacterId, membershipId);
export const equipItem = (token: string, membershipType: number, characterId: string, itemId: string) => bungieApi.equipItem(token, membershipType, characterId, itemId);
export const equipItems = (token: string, membershipType: number, characterId: number, itemIds: number[]) => bungieApi.equipItems(token, membershipType, characterId, itemIds);
export const pullFromPostmaster = (token: string, membershipType: number, characterId: string, itemReferenceHash: string, itemInstanceId: string, stackSize?: number) => bungieApi.pullFromPostmaster(token, membershipType, characterId, itemReferenceHash, itemInstanceId, stackSize);
export const clearLoadout = (token: string, membershipType: number, characterId: string, loadoutIndex: number) => bungieApi.clearLoadout(token, membershipType, characterId, loadoutIndex); 