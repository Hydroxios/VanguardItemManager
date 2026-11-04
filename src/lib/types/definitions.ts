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
        /** Armor set the item belongs to, for its set bonuses */
        equipableItemSetHash?: number
    }
    flavorText: string
    itemCategoryHashes: number[]
    itemType: number
    itemSubType: number
    defaultDamageType: number
    /** Subclasses: the element they show in the HUD (a DamageType), kinetic for prismatic */
    talentGrid?: { hudDamageType?: number }
    /** 0 Titan, 1 Hunter, 2 Warlock, 3 any class */
    classType?: number
    hash: number
    perks: {
        perkHash: number
        perkVisibility: number
    }[]
    plug?: {
        plugCategoryIdentifier: string
        plugCategoryHash?: number
        energyCost?: { energyCost: number }
        /** Aspects: how many fragment sockets they open */
        energyCapacity?: { capacityValue: number }
        /** Non-zero when inserting the plug costs materials (crafted weapon perks...) */
        insertionMaterialRequirementHash?: number
    }
    /** Base stats, and the stat group that says how to show them */
    stats?: {
        statGroupHash?: number
        stats: Record<string, { statHash: number, value: number, displayMaximum?: number }>
    }
    /** Stats the item (or plug, once inserted) adds */
    investmentStats?: { statTypeHash: number, value: number, isConditionallyActive?: boolean }[]
    sockets?: {
        socketEntries: SocketEntryDefinition[]
        socketCategories: { socketCategoryHash: number, socketIndexes: number[] }[]
    }
}

export interface SocketEntryDefinition {
    socketTypeHash: number
    singleInitialItemHash: number
    reusablePlugSetHash?: number
    randomizedPlugSetHash?: number
    reusablePlugItems?: { plugItemHash: number }[]
}

/** How a stat's investment value maps to the value the game shows, and how it is drawn */
export interface ScaledStatDefinition {
    statHash: number
    maximumValue: number
    displayAsNumeric: boolean
    displayInterpolation: { value: number, weight: number }[]
}

export interface StatGroupDefinition {
    maximumValue: number
    /** In the order the game lists them */
    scaledStats: ScaledStatDefinition[]
    hash: number
}

/** An armor set and the perks it grants with enough pieces equipped */
export interface EquipableItemSetDefinition {
    displayProperties: DisplayPropertiesDefinition
    setItems: number[]
    setPerks: { requiredSetCount: number, sandboxPerkHash: number }[]
    hash: number
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
    index: number
}

export interface LoadoutIconDefinition {
    iconImagePath: string
    hash: number
    index: number
}

export interface LoadoutNameDefinition {
    name: string
    hash: number
    index: number
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

export interface SocketCategoryDefinition {
    displayProperties: DisplayPropertiesDefinition
    hash: number
}

/** What inserting a plug costs; a set without counted materials is free */
export interface MaterialRequirementSetDefinition {
    materials: { itemHash: number, count: number, omitFromRequirements?: boolean }[]
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
export type LoadoutNameDefinitions = Record<string, LoadoutNameDefinition>
export type RaceDefinitions = Record<string, RaceDefinition>
export type BucketDefinitions = Record<string, BucketDefinition>
export type ItemConstantsDefinitions = Record<string, ItemConstantsDefinition>
export type SeasonDefinitions = Record<string, SeasonDefinition>
export type SocketCategoryDefinitions = Record<string, SocketCategoryDefinition>
export type MaterialRequirementSetDefinitions = Record<string, MaterialRequirementSetDefinition>
export type StatGroupDefinitions = Record<string, StatGroupDefinition>
export type EquipableItemSetDefinitions = Record<string, EquipableItemSetDefinition>
