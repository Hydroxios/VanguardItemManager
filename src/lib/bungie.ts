import { BungieUser, InstanceComponents, Item, ItemDefinitions } from "@/lib/types";
import { fetchManifestFile, pruneManifestCache } from "./manifest-cache";

const apiKey = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_BUNGIE_API_KEY! : process.env.NEXT_PUBLIC_BUNGIE_API_KEY_DEV!;

export interface ItemResponse {
    characterId: string
    item: {
        data: Item
    }
}

interface BungieFetchData {
    /** Sends the user's access token */
    auth?: boolean
    method?: "GET" | "POST"
    body?: string
}

/** Where authenticated calls get the access token; registered by the AuthProvider. */
export interface TokenSource {
    /** The current access token, renewed first when it is about to expire */
    getToken: () => Promise<string | null>
    /** A token to use instead of the one Bungie just rejected */
    renewToken: (rejectedToken: string) => Promise<string | null>
}

let tokenSource: TokenSource | undefined;

export const setTokenSource = (source: TokenSource | undefined) => {
    tokenSource = source;
}

/** Why a Bungie call failed, for the cases the user can do something about. */
export type BungieErrorKind = "maintenance" | "throttled" | "auth" | "network" | "api";

/** A failed Bungie call, with a message meant for the user. */
export class BungieApiError extends Error {
    kind: BungieErrorKind;
    /** Bungie's `ErrorStatus` (PlatformErrorCodes name), when it sent one */
    errorStatus?: string;

    constructor(kind: BungieErrorKind, message: string, errorStatus?: string) {
        super(message);
        this.name = "BungieApiError";
        this.kind = kind;
        this.errorStatus = errorStatus;
    }
}

const MAINTENANCE_MESSAGE = "Bungie.net is down for maintenance or unavailable. Try again later.";

// What Bungie answers when the access token is missing, expired or revoked
const AUTH_ERROR_STATUSES = ["WebAuthRequired", "AccessTokenHasExpired", "AuthorizationRecordExpired", "AuthorizationRecordRevoked"];

interface BungieResponse {
    Response?: unknown
    ErrorCode?: number
    ErrorStatus?: string
    Message?: string
    ThrottleSeconds?: number
}

const isAuthError = (response: Response, data?: BungieResponse) =>
    response.status === 401 || AUTH_ERROR_STATUSES.includes(data?.ErrorStatus ?? "");

/** Turns a failed response into an error the user can act on. */
const toBungieError = (response: Response, data?: BungieResponse) => {
    const status = data?.ErrorStatus;
    if (status === "SystemDisabled" || response.status === 503) {
        return new BungieApiError("maintenance", MAINTENANCE_MESSAGE, status);
    }
    // ThrottleLimitExceeded, PerEndpointRequestThrottleExceeded, DestinyThrottledByGameServer...
    if (status?.includes("Throttl") || response.status === 429) {
        const wait = data?.ThrottleSeconds ? `${data.ThrottleSeconds} seconds` : "a few seconds";
        return new BungieApiError("throttled", `Too many requests to Bungie. Wait ${wait} and try again.`, status);
    }
    if (isAuthError(response, data)) {
        return new BungieApiError("auth", "Your Bungie session has expired. Log in again.", status);
    }
    return new BungieApiError("api", data?.Message ?? `Bungie request failed (${response.status}).`, status);
}

const baseUrl = "https://www.bungie.net/Platform"

/**
 * Calls the Bungie API and returns `Response`.
 * Throws a `BungieApiError` when the HTTP call or the API reports an error.
 */
const bungie = async (url: string, init: BungieFetchData) => {

    const send = async (token?: string) => {
        const headers: HeadersInit = { "X-Api-Key": apiKey }
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (init.method === "POST") headers["Content-Type"] = "application/json"

        let response: Response;
        try {
            response = await fetch(`${baseUrl}${url}`, {
                method: init.method ?? "GET",
                headers,
                body: init.body ?? undefined
            })
        } catch {
            // Offline, or Bungie answering without CORS headers, which happens when it is down
            throw new BungieApiError("network", "Could not reach Bungie.net. Check your connection, Bungie may also be down.");
        }
        return { response, data: await response.json().catch(() => undefined) }
    }

    let result;
    if (init.auth) {
        const token = await tokenSource?.getToken();
        if (!token) throw new BungieApiError("auth", "Could not authenticate with Bungie, try logging in again.");
        result = await send(token);
        // A rejected token means the request wasn't processed, so it is safe to send it once more with a new one
        if (isAuthError(result.response, result.data)) {
            const newToken = await tokenSource?.renewToken(token);
            if (newToken) result = await send(newToken);
        }
    } else {
        result = await send();
    }

    const { response, data } = result;
    // ErrorCode 1 is "Success"; anything else is an API level failure even on HTTP 200
    if (!response.ok || !data || (data.ErrorCode !== undefined && data.ErrorCode !== 1)) {
        throw toBungieError(response, data);
    }
    return data.Response
}

/** Thrown when Bungie rejects the refresh token itself, meaning the user has to log in again. */
export class InvalidRefreshTokenError extends Error { }

export interface AccessToken {
    value: string
    /** `Date.now()` time at which Bungie stops accepting it */
    expiresAt: number
}

/**
 * Gets a fresh access token. The refresh token is sent by the browser as an httpOnly cookie;
 * `legacyRefreshToken` only migrates a session stored in localStorage by older versions.
 */
export const refreshToken = async (legacyRefreshToken?: string): Promise<AccessToken> => {
    let response: Response;
    try {
        response = await fetch(`/api/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(legacyRefreshToken ? { refresh_token: legacyRefreshToken } : {}),
        });
    } catch {
        throw new BungieApiError("network", "Could not reach the server to restore your session. Check your connection.");
    }

    const data = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 401) {
        throw new InvalidRefreshTokenError("Refresh token rejected");
    }
    if (data.access_token) {
        // Bungie access tokens last an hour
        return { value: data.access_token as string, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
    }
    console.error("Failed to refresh access token:", data);
    // The route answers 502 when Bungie's token endpoint is unreachable, and passes Bungie's own failures through
    if (response.status === 502 || response.status === 503 || data.ErrorStatus === "SystemDisabled") {
        throw new BungieApiError("maintenance", MAINTENANCE_MESSAGE, data.ErrorStatus);
    }
    throw new BungieApiError("api", `Could not restore your Bungie session (${data.error ?? response.status}).`, data.ErrorStatus);
}

export const getCurrentUser = async () => {
    const data = await bungie(`/User/GetMembershipsForCurrentUser`, { auth: true })
    const destinyMembership = data.primaryMembershipId ? data.destinyMemberships.filter((m: Omit<BungieUser, "uniqueName">) => m.membershipId === data.primaryMembershipId)[0] : data.destinyMemberships[0];
    const user: BungieUser = {
        uniqueName: data.bungieNetUser.uniqueName,
        membershipId: destinyMembership.membershipId,
        membershipType: destinyMembership.membershipType
    }
    return user;
}

export const getProfile = async (membershipId: string, membershipType: number) => {
    const profile = await bungie(`/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,103,104,200,201,202,205,206,300,302,304,305,307,308,309,310,1300`, { auth: true })
    return profile
}

export type DestinyDefinitionTableName =
    | "DestinyInventoryItemDefinition"
    | "DestinyClassDefinition"
    | "DestinyStatDefinition"
    | "DestinySandboxPerkDefinition"
    | "DestinyObjectiveDefinition"
    | "DestinyRecordDefinition"
    | "DestinyLoadoutColorDefinition"
    | "DestinyLoadoutIconDefinition"
    | "DestinyLoadoutNameDefinition"
    | "DestinyRaceDefinition"
    | "DestinyInventoryBucketDefinition"
    | "DestinyInventoryItemConstantsDefinition"
    | "DestinySeasonDefinition"
    | "DestinySocketCategoryDefinition"
    | "DestinyMaterialRequirementSetDefinition"
    | "DestinyStatGroupDefinition"
    | "DestinyEquipableItemSetDefinition";

interface DestinyManifest {
    jsonWorldContentPaths: Record<string, string>;
    jsonWorldComponentContentPaths: Record<string, Record<string, string>>;
}

let manifestPromise: Promise<DestinyManifest> | undefined;

export const getManifest = async () => {
    if (!manifestPromise) {
        manifestPromise = bungie("/Destiny2/Manifest", {}) as Promise<DestinyManifest>;
        // Don't keep a failed request cached, so a later call can retry
        manifestPromise.catch(() => { manifestPromise = undefined; });
        // Once the current version is known, cached copies of older versions can go
        manifestPromise.then((manifest) => pruneManifestCache([
            ...Object.values(manifest.jsonWorldContentPaths),
            ...Object.values(manifest.jsonWorldComponentContentPaths).flatMap((tables) => Object.values(tables)),
        ])).catch((error) => console.warn("Failed to prune the manifest cache", error));
    }
    return manifestPromise;
}

const getManifestPath = (paths: Record<string, string> | undefined, locale: string) => {
    return paths?.[locale] ?? paths?.en ?? Object.values(paths ?? {})[0];
}

export const getDefinitions = async <T = unknown>(locale?: string): Promise<T> => {
    const manifests = await getManifest()
    const path = getManifestPath(manifests.jsonWorldContentPaths, locale ?? "en");
    if (!path) throw new Error("Missing Destiny manifest aggregate path");
    return fetchManifestFile<T>(path);
}

export const getDefinitionTable = async <T = unknown>(tableName: DestinyDefinitionTableName, locale?: string): Promise<T> => {
    const manifest = await getManifest();
    const tablePaths = manifest.jsonWorldComponentContentPaths[locale ?? "en"] ?? manifest.jsonWorldComponentContentPaths.en;
    const path = tablePaths?.[tableName];
    if (!path) throw new Error(`Missing Destiny manifest component path for ${tableName}`);
    return fetchManifestFile<T>(path);
}

export const getGlobalAlerts = async () => {
    try {
        return await bungie(`/GlobalAlerts`, {})
    } catch (error) {
        console.error("Failed to load global alerts:", error)
        return []
    }
}

export const getCharacterInventory = async (membershipId: string, membershipType: number, characterId: string) => {
    const data = await bungie(`/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=201`, { auth: true });
    return { items: data.inventory.data.items as Item[] };
}

export const getItem = async (membershipType: number, membershipId: string, itemInstanceId: string, components: string) => {
    try {
        return await bungie(`/Destiny2/${membershipType}/Profile/${membershipId}/Item/${itemInstanceId}/?components=${components}`, { auth: true }) as ItemResponse;
    } catch {
        return undefined;
    }
}

export const equipLoadout = async (membershipType: number, characterId: string, loadoutIndex: number) => {
    await bungie("/Destiny2/Actions/Loadouts/EquipLoadout", {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex
        }),
        auth: true
    })
}

export const transferItem = async (membershipType: number, itemHash: number, itemInstanceId: string, characterId: string, toVault: boolean, quantity?: number) => {
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
        auth: true
    })
}

/**
 * Check if an item is equipped and transfer it safely
 * transferStatus & 1 means the item is equipped and needs to be unequipped first
 */
export const safeTransferItem = async (membershipType: number, itemHash: number, itemInstanceId: string,
    sourceCharacterId: string, targetCharacterId: string, membershipId: string, itemDefinitions?: ItemDefinitions): Promise<Item | null> => {
    // First check if the item is equipped
    const itemResponse = await getItem(membershipType, membershipId, itemInstanceId, "307,302,304,305");

    if (itemResponse && itemResponse.item) {
        const transferStatus = itemResponse.item.data.transferStatus;
        const equipmentSlotHash = itemResponse.item.data.bucketHash; // The slot this item is equipped in

        // transferStatus is a bitmask: 1 = equipped, 2 = not transferrable, 4 = no room in destination
        if (transferStatus & 1) {
            console.log(`Item ${itemHash} is equipped. Finding replacement...`);

            // Get character inventory to find replacement items
            const characterInventory = await getCharacterInventory(membershipId, membershipType, sourceCharacterId);

            // Try to find another item of the same type in the inventory to equip
            let replacementItem: Item | null = null;
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
                let replacementEquipped = true;
                try {
                    await equipItem(membershipType, sourceCharacterId, replacementItem.itemInstanceId);
                } catch (error) {
                    // If equipping the replacement fails, still try a direct transfer below
                    console.error("Error during replacement equip:", error);
                    replacementEquipped = false;
                }

                // Errors from here on are real transfer failures and are surfaced to the caller
                console.log(`Transferring original item ${itemInstanceId} to ${targetCharacterId === "vault" ? "vault" : "character"}`);
                await transferItem(membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
                if (targetCharacterId !== "vault") {
                    await transferItem(membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                }
                if (replacementEquipped) return replacementItem;
            } else {
                console.log("No replacement found, trying direct transfer");
                // No replacement found, try direct transfer (may fail if equipping constraints prevent it)
                await transferItem(membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
                if (targetCharacterId !== "vault") {
                    await transferItem(membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                }
            }
        } else {
            // Item is not equipped, can transfer directly
            if (targetCharacterId === "vault") {
                await transferItem(membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
            } else {
                // If moving between characters
                if (sourceCharacterId !== targetCharacterId) {
                    await transferItem(membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
                    await transferItem(membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                }
            }
        }
    } else {
        // Fallback if we couldn't get item data
        if (targetCharacterId === "vault") {
            await transferItem(membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
        } else if (sourceCharacterId !== targetCharacterId) {
            await transferItem(membershipType, itemHash, itemInstanceId, sourceCharacterId, true);
            await transferItem(membershipType, itemHash, itemInstanceId, targetCharacterId, false);
        }
    }
    return null;
}

export interface EquipItemResult {
    itemInstanceId: string
    /** A PlatformErrorCodes value, 1 meaning success */
    equipStatus: number
}

/** Equips several items at once; Bungie reports a status per item instead of failing the whole call. */
export const equipItems = async (membershipType: number, characterId: string, itemIds: string[]) => {
    const data = await bungie(`/Destiny2/Actions/Items/EquipItems/`, {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            itemIds: itemIds
        }),
        auth: true
    });
    return (data?.equipResults ?? []) as EquipItemResult[];
}

export const equipItem = async (membershipType: number, characterId: string, itemId: string) => {
    await bungie(`/Destiny2/Actions/Items/EquipItem/`, {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            itemId: itemId
        }),
        auth: true
    });
}

export const pullFromPostmaster = async (membershipType: number, characterId: string, itemReferenceHash: number, itemInstanceId: string, stackSize: number = 1) => {
    await bungie(`/Destiny2/Actions/Items/PullFromPostmaster/`, {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            itemReferenceHash: itemReferenceHash,
            itemId: itemInstanceId,
            stackSize: stackSize
        }),
        auth: true
    });
}

export const clearLoadout = async (
    membershipType: number,
    characterId: string,
    loadoutIndex: number
) => {
    await bungie(`/Destiny2/Actions/Loadouts/ClearLoadout/`, {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex
        }),
        auth: true
    })
}

export interface LoadoutIdentifiers {
    colorHash: number
    iconHash: number
    nameHash: number
}

/** Saves the character's currently equipped gear, subclass setup and mods into the loadout slot. */
export const snapshotLoadout = async (
    membershipType: number,
    characterId: string,
    loadoutIndex: number,
    identifiers: LoadoutIdentifiers
) => {
    await bungie(`/Destiny2/Actions/Loadouts/SnapshotLoadout/`, {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex,
            ...identifiers
        }),
        auth: true
    })
}

/** Changes the loadout's name, color and icon without touching its items. */
export const updateLoadoutIdentifiers = async (
    membershipType: number,
    characterId: string,
    loadoutIndex: number,
    identifiers: LoadoutIdentifiers
) => {
    await bungie(`/Destiny2/Actions/Loadouts/UpdateLoadoutIdentifiers/`, {
        method: "POST",
        body: JSON.stringify({
            membershipType: membershipType,
            characterId: characterId,
            loadoutIndex: loadoutIndex,
            ...identifiers
        }),
        auth: true
    })
}

/**
 * Inserts a plug (mod...) in an item socket. Only works for plugs that cost no materials,
 * on items held by a character (not in the vault). Resolves with the item's components as they are after the change.
 */
export const insertSocketPlugFree = async (
    membershipType: number,
    characterId: string,
    itemInstanceId: string,
    socketIndex: number,
    plugItemHash: number
): Promise<InstanceComponents> => {
    const response = await bungie(`/Destiny2/Actions/Items/InsertSocketPlugFree/`, {
        method: "POST",
        body: JSON.stringify({
            // socketArrayType 0: the item's default sockets
            plug: { socketIndex, socketArrayType: 0, plugItemHash },
            itemId: itemInstanceId,
            characterId: characterId,
            membershipType: membershipType
        }),
        auth: true
    })
    // A DestinyItemChangeResponse: the changed item comes back with its components
    const item = response?.item;
    return { sockets: item?.sockets?.data, stats: item?.stats?.data, perks: item?.perks?.data };
}

/** Locks or unlocks an item. A vault item takes any of the player's characters as `characterId`. */
export const setItemLockState = async (membershipType: number, characterId: string, itemInstanceId: string, locked: boolean) => {
    await bungie(`/Destiny2/Actions/Items/SetLockState/`, {
        method: "POST",
        body: JSON.stringify({
            state: locked,
            itemId: itemInstanceId,
            characterId: characterId,
            membershipType: membershipType
        }),
        auth: true
    })
}
