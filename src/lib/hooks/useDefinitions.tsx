import { createContext, ReactNode, useContext, useEffect, useState, useMemo } from "react";
import { DestinyDefinitionTableName, getDefinitions, getDefinitionTable } from "../bungie";
import { BucketDefinitions, ClassDefinitions, ItemConstantsDefinitions, ItemDefinitions, LoadoutColorDefinitions, LoadoutIconDefinitions, ObjectiveDefinitions, PerksDefinitions, RaceDefinitions, RecordsDefinitions, SeasonDefinitions, StatsDefinitions } from "@/lib/types";

interface DefinitionsAggregate {
    DestinyInventoryItemDefinition?: ItemDefinitions
    DestinyClassDefinition?: ClassDefinitions
    DestinyStatDefinition?: StatsDefinitions
    DestinySandboxPerkDefinition?: PerksDefinitions
    DestinyObjectiveDefinition?: ObjectiveDefinitions
    DestinyRecordDefinition?: RecordsDefinitions
    DestinyLoadoutColorDefinition?: LoadoutColorDefinitions
    DestinyLoadoutIconDefinition?: LoadoutIconDefinitions
    DestinyRaceDefinition?: RaceDefinitions
    DestinyInventoryBucketDefinition?: BucketDefinitions
    DestinyInventoryItemConstantsDefinition?: ItemConstantsDefinitions
    DestinySeasonDefinition?: SeasonDefinitions
}

type DefinitionLoadState = Record<DestinyDefinitionTableName, boolean>

interface Definitions {
    loadingDefinitions: boolean
    definitionsError?: string
    definitionsLoaded: DefinitionLoadState
    itemDefinitions: ItemDefinitions
    classDefinitions: ClassDefinitions
    statsDefinitions: StatsDefinitions
    perksDefinitions: PerksDefinitions
    objectiveDefinitions: ObjectiveDefinitions
    recordsDefinitions: RecordsDefinitions;
    loadoutColorDefinitions: LoadoutColorDefinitions
    loadoutIconDefinitions: LoadoutIconDefinitions
    raceDefinitions: RaceDefinitions
    bucketDefinitions: BucketDefinitions
    itemConstantsDefinitions: ItemConstantsDefinitions
    seasonDefinitions: SeasonDefinitions
}

const DefinitionsContext = createContext<Definitions | undefined>(undefined)

const initialDefinitionsLoaded: DefinitionLoadState = {
    DestinyInventoryItemDefinition: false,
    DestinyClassDefinition: false,
    DestinyStatDefinition: false,
    DestinySandboxPerkDefinition: false,
    DestinyObjectiveDefinition: false,
    DestinyRecordDefinition: false,
    DestinyLoadoutColorDefinition: false,
    DestinyLoadoutIconDefinition: false,
    DestinyRaceDefinition: false,
    DestinyInventoryBucketDefinition: false,
    DestinyInventoryItemConstantsDefinition: false,
    DestinySeasonDefinition: false,
}

export const DefinitionsProvider = ({ children }: { children: ReactNode }) => {

    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string>()
    const [definitionsLoaded, setDefinitionsLoaded] = useState<DefinitionLoadState>(initialDefinitionsLoaded)
    const [itemDefinitions, setItemDefinitions] = useState<ItemDefinitions>({})
    const [classDefinitions, setClassDefinitions] = useState<ClassDefinitions>({})
    const [statsDefinitions, setStatsDefinitions] = useState<StatsDefinitions>({})
    const [perksDefinitions, setPerksDefinitions] = useState<PerksDefinitions>({})
    const [objectiveDefinitions, setObjectiveDefinitions] = useState<ObjectiveDefinitions>({})
    const [recordsDefinitions, setRecordsDefinitions] = useState<RecordsDefinitions>({})
    const [loadoutColorDefinitions, setLoadoutColorDefinitions] = useState<LoadoutColorDefinitions>({})
    const [loadoutIconDefinitions, setLoadoutIconDefinitions] = useState<LoadoutIconDefinitions>({})
    const [raceDefinitions, setRaceDefinitions] = useState<RaceDefinitions>({})
    const [bucketDefinitions, setBucketDefinitions] = useState<BucketDefinitions>({})
    const [itemConstantsDefinitions, setItemConstantsDefinitions] = useState<ItemConstantsDefinitions>({})
    const [seasonDefinitions, setSeasonDefinitions] = useState<SeasonDefinitions>({})
    useEffect(() => {
        let active = true;
        const locale = localStorage.getItem("locale") ?? "en";

        const markLoaded = (tableName: DestinyDefinitionTableName) => {
            setDefinitionsLoaded((prev) => ({ ...prev, [tableName]: true }));
        }

        const loadTable = async <T,>(tableName: DestinyDefinitionTableName, setter: (data: T) => void) => {
            const data = await getDefinitionTable<T>(tableName, locale);
            if (!active) return;
            setter(data);
            markLoaded(tableName);
        }

        const setAggregateDefinitions = (db: DefinitionsAggregate) => {
            setItemDefinitions(db.DestinyInventoryItemDefinition ?? {})
            setClassDefinitions(db.DestinyClassDefinition ?? {})
            setStatsDefinitions(db.DestinyStatDefinition ?? {})
            setPerksDefinitions(db.DestinySandboxPerkDefinition ?? {})
            setObjectiveDefinitions(db.DestinyObjectiveDefinition ?? {})
            setRecordsDefinitions(db.DestinyRecordDefinition ?? {})
            setLoadoutColorDefinitions(db.DestinyLoadoutColorDefinition ?? {})
            setLoadoutIconDefinitions(db.DestinyLoadoutIconDefinition ?? {})
            setRaceDefinitions(db.DestinyRaceDefinition ?? {})
            setBucketDefinitions(db.DestinyInventoryBucketDefinition ?? {})
            setItemConstantsDefinitions(db.DestinyInventoryItemConstantsDefinition ?? {})
            setSeasonDefinitions(db.DestinySeasonDefinition ?? {})
            setDefinitionsLoaded(Object.fromEntries(
                Object.keys(initialDefinitionsLoaded).map((key) => [key, true])
            ) as DefinitionLoadState)
        }

        const fetchDefinitions = async () => {
            try {
                await Promise.all([
                    loadTable<ItemDefinitions>("DestinyInventoryItemDefinition", setItemDefinitions),
                    loadTable<ClassDefinitions>("DestinyClassDefinition", setClassDefinitions),
                    loadTable<RaceDefinitions>("DestinyRaceDefinition", setRaceDefinitions),
                ]);
                if (!active) return;
                setLoading(false);

                void Promise.allSettled([
                    loadTable<StatsDefinitions>("DestinyStatDefinition", setStatsDefinitions),
                    loadTable<PerksDefinitions>("DestinySandboxPerkDefinition", setPerksDefinitions),
                    loadTable<ObjectiveDefinitions>("DestinyObjectiveDefinition", setObjectiveDefinitions),
                    loadTable<RecordsDefinitions>("DestinyRecordDefinition", setRecordsDefinitions),
                    loadTable<LoadoutColorDefinitions>("DestinyLoadoutColorDefinition", setLoadoutColorDefinitions),
                    loadTable<LoadoutIconDefinitions>("DestinyLoadoutIconDefinition", setLoadoutIconDefinitions),
                    loadTable<BucketDefinitions>("DestinyInventoryBucketDefinition", setBucketDefinitions),
                    loadTable<ItemConstantsDefinitions>("DestinyInventoryItemConstantsDefinition", setItemConstantsDefinitions),
                    loadTable<SeasonDefinitions>("DestinySeasonDefinition", setSeasonDefinitions),
                ]);
            } catch (error) {
                console.error("Failed to load component definitions, falling back to aggregate manifest", error);
                try {
                    const db = await getDefinitions(locale);
                    if (!active) return;
                    setAggregateDefinitions(db);
                    setLoading(false);
                } catch (fallbackError) {
                    console.error("Failed to load aggregate manifest", fallbackError);
                    if (active) setLoadError("Could not load the Destiny databases. Bungie may be down for maintenance.");
                }
            }
        }
        fetchDefinitions()

        return () => {
            active = false;
        }
    }, [])

    const contextValue = useMemo(() => ({
        loadingDefinitions: loading,
        definitionsError: loadError,
        definitionsLoaded,
        itemDefinitions,
        classDefinitions,
        statsDefinitions,
        perksDefinitions,
        objectiveDefinitions,
        recordsDefinitions,
        loadoutColorDefinitions,
        loadoutIconDefinitions,
        raceDefinitions,
        bucketDefinitions,
        itemConstantsDefinitions,
        seasonDefinitions
    }), [loading, loadError, definitionsLoaded, itemDefinitions, classDefinitions, statsDefinitions, perksDefinitions, objectiveDefinitions, recordsDefinitions, loadoutColorDefinitions, loadoutIconDefinitions, raceDefinitions, bucketDefinitions, itemConstantsDefinitions, seasonDefinitions]);

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
