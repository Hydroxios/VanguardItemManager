import { createContext, ReactNode, useContext, useEffect, useState, useMemo } from "react";
import { getDefinitions } from "../bungie";
import { DisplayPropertiesDefinition } from "../types";
import { it } from "node:test";


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

export interface ItemDefinitions extends Record<string, ItemDefinition> { }
export interface ClassDefinitions extends Record<string, ClassDefinition> { }
export interface StatsDefinitions extends Record<string, StatsDefinition> { }
export interface PerksDefinitions extends Record<string, PerkDefinition> { }
export interface RecordsDefinitions extends Record<string, RecordDefinition> { }
export interface LoadoutColorDefinitions extends Record<string, LoadoutColorDefinition> { }
export interface LoadoutIconDefinitions extends Record<string, LoadoutIconDefinition> { }
export interface RaceDefinitions extends Record<string, RaceDefinition> { }
export interface BucketDefinitions extends Record<string, RaceDefinition> { }
export interface ItemConstantsDefinitions extends Record<string, ItemConstantsDefinition> { }
export interface SeasonDefinitions extends Record<string, SeasonDefinition> { }

interface Definitions {
    loadingDefinitions: boolean
    itemDefinitions: ItemDefinitions
    classDefinitions: ClassDefinitions
    statsDefinitions: StatsDefinitions
    perksDefinitions: PerksDefinitions
    recordsDefinitions: RecordsDefinitions;
    loadoutColorDefinitions: LoadoutColorDefinitions
    loadoutIconDefinitions: LoadoutIconDefinitions
    raceDefinitions: RaceDefinitions
    bucketDefinitions: BucketDefinitions
    itemConstantsDefinitions: ItemConstantsDefinitions
    seasonDefinitions: SeasonDefinitions
}

const DefinitionsContext = createContext<Definitions | undefined>(undefined)

export const DefinitionsProvider = ({ children }: { children: ReactNode }) => {

    const [loading, setLoading] = useState(true)
    const [itemDefinitions, setItemDefinitions] = useState<ItemDefinitions>({})
    const [classDefinitions, setClassDefinitions] = useState<ClassDefinitions>({})
    const [statsDefinitions, setStatsDefinitions] = useState<StatsDefinitions>({})
    const [perksDefinitions, setPerksDefinitions] = useState<PerksDefinitions>({})
    const [recordsDefinitions, setRecordsDefinitions] = useState<RecordsDefinitions>({})
    const [loadoutColorDefinitions, setLoadoutColorDefinitions] = useState<LoadoutColorDefinitions>({})
    const [loadoutIconDefinitions, setLoadoutIconDefinitions] = useState<LoadoutIconDefinitions>({})
    const [raceDefinitions, setRaceDefinitions] = useState<RaceDefinitions>({})
    const [bucketDefinitions, setBucketDefinitions] = useState<RaceDefinitions>({})
    const [itemConstantsDefinitions, setItemConstantsDefinitions] = useState<ItemConstantsDefinitions>({})
    const [seasonDefinitions, setSeasonDefinitions] = useState<SeasonDefinitions>({})
    useEffect(() => {
        const fetchDefinitions = async () => {
            if (!loading) return;
            const db = await getDefinitions(localStorage.getItem("locale") ?? "en")
            setItemDefinitions(db.DestinyInventoryItemDefinition)
            setClassDefinitions(db.DestinyClassDefinition)
            setStatsDefinitions(db.DestinyStatDefinition)
            setPerksDefinitions(db.DestinySandboxPerkDefinition)
            setRecordsDefinitions(db.DestinyRecordDefinition)
            setLoadoutColorDefinitions(db.DestinyLoadoutColorDefinition)
            setLoadoutIconDefinitions(db.DestinyLoadoutIconDefinition)
            setRaceDefinitions(db.DestinyRaceDefinition)
            setBucketDefinitions(db.DestinyInventoryBucketDefinition)
            setItemConstantsDefinitions(db.DestinyInventoryItemConstantsDefinition)
            setSeasonDefinitions(db.DestinySeasonDefinition)
            setLoading(false)
        }
        fetchDefinitions()
    }, [])

    const contextValue = useMemo(() => ({
        loadingDefinitions: loading,
        itemDefinitions,
        classDefinitions,
        statsDefinitions,
        perksDefinitions,
        recordsDefinitions,
        loadoutColorDefinitions,
        loadoutIconDefinitions,
        raceDefinitions,
        bucketDefinitions,
        itemConstantsDefinitions,
        seasonDefinitions
    }), [loading, itemDefinitions, classDefinitions, statsDefinitions, perksDefinitions, recordsDefinitions, loadoutColorDefinitions, loadoutIconDefinitions, raceDefinitions, bucketDefinitions, itemConstantsDefinitions]);

    return (
        <DefinitionsContext.Provider
            value={contextValue}>
            {children}
        </DefinitionsContext.Provider>
    )
}

export const useDefinitions = () => {
    const context = useContext(DefinitionsContext)
    if (context === undefined) {
        throw new Error('useDefinitions must be used within a DefinitionsProvider');
    }
    return context;
}