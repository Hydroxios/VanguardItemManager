// Manifest definition tables, as served by Bungie

import { DisplayPropertiesDefinition } from "./api";

export interface ItemDefinition {
    displayProperties: DisplayPropertiesDefinition
    iconWatermark: string
    itemTypeDisplayName: string
    inventory: {
        maxStackSize: number
        bucketTypeHash: number
        tierType: number
    }
    iconWatermarkShelved: string
    iconWatermarkFeatured: string
    secondaryIcon: string
    secondaryOverlay: string
    secondarySpecial: string
    isFeaturedItem: boolean
    equippingBlock: {
        equipmentSlotTypeHash: number
        ammoType: number
    }
    flavorText: string
    itemCategoryHashes: number[]
    itemType: number
    itemSubType: number
    defaultDamageType: number
    hash: number
    perks: {
        perkHash: number
        perkVisibility: number
    }[]
    plug?: {
        plugCategoryIdentifier: string
    }
}

export interface ClassDefinition {
    displayProperties: DisplayPropertiesDefinition
    classType: number
    hash: number
}

export interface StatsDefinition {
    displayProperties: DisplayPropertiesDefinition
    statCategory: number
    hash: number
}

export interface PerkDefinition {
    displayProperties: DisplayPropertiesDefinition
    perkIdentifier: string
    isDisplayable: boolean
    damageType: number
    hash: number
}

export interface ObjectiveDefinition {
    displayProperties: DisplayPropertiesDefinition
    progressDescription?: string
    completionValue?: number
    hash: number
}

export interface RecordDefinition {
    displayProperties: DisplayPropertiesDefinition
    titleInfo: {
        hasTitle: boolean
        titlesByGender: Record<string, string>
        titlesByGenderHash: Record<string, string>
    }
    hash: number
}

export interface LoadoutColorDefinition {
    colorImagePath: string
    hash: number
}

export interface LoadoutIconDefinition {
    iconImagePath: string
    hash: number
}

export interface RaceDefinition {
    displayProperties: DisplayPropertiesDefinition
    raceType: number
}

export interface BucketDefinition {
    displayProperties: DisplayPropertiesDefinition
    category: number
    scope: number
    itemCount: number
    location: number
}

export interface ItemConstantsDefinition {
    gearTierOverlayImagePaths: string[]
    hash: number
}

export interface SeasonDefinition {
    displayProperties: DisplayPropertiesDefinition
    seasonNumber: number
    hash: number
}

export type ItemDefinitions = Record<string, ItemDefinition>
export type ClassDefinitions = Record<string, ClassDefinition>
export type StatsDefinitions = Record<string, StatsDefinition>
export type PerksDefinitions = Record<string, PerkDefinition>
export type ObjectiveDefinitions = Record<string, ObjectiveDefinition>
export type RecordsDefinitions = Record<string, RecordDefinition>
export type LoadoutColorDefinitions = Record<string, LoadoutColorDefinition>
export type LoadoutIconDefinitions = Record<string, LoadoutIconDefinition>
export type RaceDefinitions = Record<string, RaceDefinition>
export type BucketDefinitions = Record<string, BucketDefinition>
export type ItemConstantsDefinitions = Record<string, ItemConstantsDefinition>
export type SeasonDefinitions = Record<string, SeasonDefinition>
