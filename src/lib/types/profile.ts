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
}

export interface Loadout {
    colorHash: number
    iconHash: number
    items: { itemInstanceId: string }[]
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

export interface ItemComponents {
    instances: Record<string, ItemInstance>
    perks: Record<string, ItemPerks>
    sockets: Record<string, ItemSockets>
    stats: Record<string, ItemStats>
    plugObjectives: Record<string, ItemPlugObjectives>
}
