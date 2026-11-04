// Profile data returned by the Destiny2 Profile endpoint

import { UserInfo } from "./api";

export interface Item {
    bucketHash: number
    itemHash: number
    itemInstanceId: string
    overrideStyleItemHash: number
    location: number
    quantity: number
    state: number
    transferStatus: number
}

export interface ItemInstance {
    canEquip: boolean
    damageType: number
    isEquipped: boolean
    itemLevel: number
    primaryStat: { statHash: number, value: number }
    quality: number
    gearTier: number
    /** Armor only */
    energy?: {
        energyCapacity: number
        energyUsed: number
        energyUnused: number
    }
}

export interface LoadoutItem {
    itemInstanceId: string
    plugItemHashes?: number[]
}

export interface Loadout {
    colorHash: number
    iconHash: number
    nameHash: number
    items: LoadoutItem[]
}

export interface Perk {
    iconPath: string
    perkHash: number
    isActive: boolean
    visible: boolean
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
    genderHash?: number;
    titleRecordHash?: number;
    stats: Record<string, number>;
}

export interface ProfileData {
    userInfo: UserInfo | undefined
    characterIds: string[]
    currentGuardianRank: number
    currentSeasonHash: number
}

export interface Currency {
    bucketHash: number
    itemHash: number
    location: number
    quantity: number
    state: number
    transferStatus: number
}

export interface ItemStats {
    stats: Record<string, { statHash: number, value: number }>
}

export interface ItemPerks {
    perks: Perk[]
}

export interface ItemSocket {
    plugHash?: number
    isEnabled?: boolean
    isVisible?: boolean
}

export interface ItemSockets {
    sockets: ItemSocket[]
}

/** A plug that can be inserted in a socket, from an item's reusable plugs or an unlocked plug set */
export interface ItemPlug {
    plugItemHash: number
    canInsert: boolean
    enabled: boolean
}

export interface ItemReusablePlugs {
    /** Keyed by socket index */
    plugs: Record<string, ItemPlug[]>
}

/** Unlocked plugs per plug set hash, account wide and per character */
export interface PlugSets {
    profile: Record<string, ItemPlug[]>
    characters: Record<string, Record<string, ItemPlug[]>>
}

export interface ItemObjective {
    objectiveHash: number
    progress?: number
    completionValue?: number
    complete?: boolean
    visible?: boolean
}

export interface ItemPlugObjectives {
    objectivesPerPlug: Record<string, ItemObjective[]>
}

/** The components of one item instance that change with its plugs */
export interface InstanceComponents {
    sockets?: ItemSockets
    stats?: ItemStats
    perks?: ItemPerks
}

export interface ItemComponents {
    instances: Record<string, ItemInstance>
    perks: Record<string, ItemPerks>
    sockets: Record<string, ItemSockets>
    stats: Record<string, ItemStats>
    plugObjectives: Record<string, ItemPlugObjectives>
    reusablePlugs: Record<string, ItemReusablePlugs>
}
