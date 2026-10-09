import { createContext, ReactNode, useCallback, useContext, useEffect, useState, useMemo, useRef } from "react";
import { getCurrentUser, getProfile } from "@/lib/bungie";
import { BungieUser, Character, Currency, InstanceComponents, Item, ItemInstance, ItemComponents, ItemPlug, Loadout, PlugSets, ProfileData } from "@/lib/types";
import { BUCKETS, ITEM_STATE } from "@/lib/constants";
import { moveItemInState } from "@/lib/helpers/inventory";


export interface Profile {
    loadingProfile: boolean
    profileError?: string
    user: BungieUser
    refreshing: boolean;
    refresh: () => Promise<void>
    characterEquipment: Record<string, { items: Item[] }>
    characterInventories: Record<string, { items: Item[] }>
    characterLoadouts: Record<string, { loadouts: Loadout[] }>
    characters: Record<string, Character>
    itemComponents: ItemComponents
    plugSets: PlugSets
    profile: ProfileData
    profileCurrencies: Currency[]
    profileInventory: Item[]
    lastRefresh?: number;
    setCharacterEquipment: (characterId: string, items: Item[]) => void;
    setCharacterInventory: (characterId: string, items: Item[]) => void;
    setProfileInventory: (items: Item[]) => void;
    moveItem: (itemHash: number, itemInstanceId: string | undefined, fromId: string, toId: string, quantity: number, updates?: Partial<Item>, sourceBucketHash?: number) => void;
    changeEmblem: (characterId: string, emblemHash: number) => void;
    setCharacterStatsLocally: (characterId: string, stats: Record<string, number>) => void;
    equipItemLocally: (characterId: string, itemInstanceId: string) => void;
    transferEquippedItem: (itemHash: number, itemInstanceId: string, fromId: string, toId: string, replacementItemInstanceId: string) => void;
    equipLoadoutLocally: (characterId: string, loadoutItems: Item[]) => void;
    updateLoadoutLocally: (characterId: string, loadoutIndex: number, loadout: Loadout) => void;
    setItemLockedLocally: (itemInstanceId: string, locked: boolean) => void;
    setItemComponentsLocally: (itemInstanceId: string, components: InstanceComponents) => void;
}

const ProfileContext = createContext<Profile | undefined>(undefined)

interface ProfileProviderProps {
    children: ReactNode
}

export const ProfileProvider = ({ children }: ProfileProviderProps) => {

    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string>()
    const [refreshing, setRefreshing] = useState(false)
    const [user, setUser] = useState<BungieUser>()

    const [characterEquipment, setCharacterEquipementState] = useState<Record<string, { items: Item[] }>>({})
    const [characterInventories, setCharacterInventoriesState] = useState<Record<string, { items: Item[] }>>({})
    const [characterLoadouts, setCharacterLoadouts] = useState<Record<string, { loadouts: Loadout[] }>>({})
    const [characters, setCharacters] = useState<Record<string, Character>>({})

    const [itemComponents, setItemComponents] = useState<ItemComponents>({ instances: {}, perks: {}, sockets: {}, stats: {}, plugObjectives: {}, reusablePlugs: {} })
    const [plugSets, setPlugSets] = useState<PlugSets>({ profile: {}, characters: {} })

    const [profileData, setProfileData] = useState<ProfileData>({ userInfo: undefined, characterIds: [], currentGuardianRank: 0, currentSeasonHash: 0 })
    const [profileCurrencies, setProfileCurrencies] = useState<Currency[]>([])
    const [profileInventory, setProfileInventoryState] = useState<Item[]>([])

    const [lastRefresh, setLastRefresh] = useState<number>()

    // Refs to hold the latest state for atomic operations
    const characterEquipmentRef = useRef(characterEquipment);
    const characterInventoriesRef = useRef(characterInventories);
    const profileInventoryRef = useRef(profileInventory);
    const itemComponentsRef = useRef(itemComponents);

    // Update refs whenever state changes
    useEffect(() => { characterEquipmentRef.current = characterEquipment; }, [characterEquipment]);
    useEffect(() => { characterInventoriesRef.current = characterInventories; }, [characterInventories]);
    useEffect(() => { profileInventoryRef.current = profileInventory; }, [profileInventory]);
    useEffect(() => { itemComponentsRef.current = itemComponents; }, [itemComponents]);

    // A fetch outlives the render that started it, so it reads the cached user and its own progress through refs
    const userRef = useRef<BungieUser | undefined>(undefined);
    const loadedRef = useRef(false);
    const fetchingRef = useRef<Promise<void> | null>(null);

    /** Loads the profile into the state. A fetch already running serves every caller; errors only block the UI on the first load. */
    const fetchProfile = useCallback(() => {
        fetchingRef.current ??= (async () => {
            const u = userRef.current ?? await getCurrentUser();
            userRef.current = u;
            return { u, profile: await getProfile(u.membershipId, u.membershipType) };
        })().then(({ u, profile }) => {
            setUser(u)
            setLoadError(undefined)

            setCharacterEquipementState(profile.characterEquipment.data)
            setCharacterInventoriesState(profile.characterInventories.data)
            setCharacterLoadouts(profile.characterLoadouts.data)
            setCharacters(profile.characters.data)

            const itemcomps: ItemComponents = {
                instances: profile.itemComponents.instances.data,
                perks: profile.itemComponents.perks.data,
                sockets: profile.itemComponents.sockets?.data ?? {},
                stats: profile.itemComponents.stats.data,
                plugObjectives: profile.itemComponents.plugObjectives?.data ?? {},
                reusablePlugs: profile.itemComponents.reusablePlugs?.data ?? {}
            }
            setItemComponents(itemcomps)

            // Unlocked plugs (mods...) come with the ItemSockets component
            const characterPlugSets: Record<string, { plugs: Record<string, ItemPlug[]> }> = profile.characterPlugSets?.data ?? {}
            setPlugSets({
                profile: profile.profilePlugSets?.data?.plugs ?? {},
                characters: Object.fromEntries(Object.entries(characterPlugSets).map(([id, set]) => [id, set.plugs ?? {}])),
            })

            setProfileData(profile.profile.data)
            setProfileCurrencies(profile.profileCurrencies.data.items)
            setProfileInventoryState(profile.profileInventory.data.items)

            setLoading(false)
            loadedRef.current = true
            setLastRefresh(Date.now())
        }).catch((error) => {
            console.error("Failed to fetch profile:", error)
            // Only block the UI on the first load; later refreshes keep the current data
            if (!loadedRef.current) setLoadError(error instanceof Error ? error.message : "Could not load your profile.")
        }).finally(() => {
            fetchingRef.current = null;
        });
        return fetchingRef.current;
    }, []);

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchProfile();
        } finally {
            setRefreshing(false);
        }
    }, [fetchProfile]);

    // These setters update the refs synchronously so several local moves in a row
    // always build on the latest state, whatever React does with the updates
    const setCharacterEquipment = useCallback((characterId: string, items: Item[]) => {
        const newState = { ...characterEquipmentRef.current, [characterId]: { items } };
        characterEquipmentRef.current = newState;
        setCharacterEquipementState(newState);
    }, []);
    const setCharacterInventory = useCallback((characterId: string, items: Item[]) => {
        const newState = { ...characterInventoriesRef.current, [characterId]: { items } };
        characterInventoriesRef.current = newState;
        setCharacterInventoriesState(newState);
    }, []);
    const setProfileInventory = useCallback((items: Item[]) => {
        setProfileInventoryState(items)
        profileInventoryRef.current = items;
    }, []);

    const moveItem = useCallback((itemHash: number, itemInstanceId: string | undefined, fromId: string, toId: string, quantity: number, updates?: Partial<Item>, sourceBucketHash?: number) => {
        const current = {
            profileInventory: profileInventoryRef.current,
            characterInventories: characterInventoriesRef.current,
            characterEquipment: characterEquipmentRef.current,
        };
        const { state, movedItem } = moveItemInState(current, { itemHash, itemInstanceId, fromId, toId, quantity, updates, sourceBucketHash });

        if (!movedItem) {
            console.warn("Could not find item to move locally");
            return;
        }

        if (state.profileInventory !== current.profileInventory) setProfileInventory(state.profileInventory);
        new Set([fromId, toId]).forEach((characterId) => {
            if (state.characterInventories[characterId] !== current.characterInventories[characterId]) {
                setCharacterInventory(characterId, state.characterInventories[characterId].items);
            }
            if (state.characterEquipment[characterId] !== current.characterEquipment[characterId]) {
                setCharacterEquipment(characterId, state.characterEquipment[characterId].items);
            }
        });

        if (movedItem.itemInstanceId) {
            setItemComponents(prev => ({
                ...prev,
                instances: {
                    ...prev.instances,
                    [movedItem.itemInstanceId]: { ...prev.instances[movedItem.itemInstanceId], isEquipped: false }
                }
            }));
        }
    }, [setCharacterEquipment, setCharacterInventory, setProfileInventory]);

    const setItemLockedLocally = useCallback((itemInstanceId: string, locked: boolean) => {
        const withLock = (items: Item[]) => {
            const index = items.findIndex((i) => i.itemInstanceId === itemInstanceId);
            if (index === -1) return undefined;
            const updated = [...items];
            updated[index] = { ...items[index], state: locked ? items[index].state | ITEM_STATE.LOCKED : items[index].state & ~ITEM_STATE.LOCKED };
            return updated;
        };
        const vault = withLock(profileInventoryRef.current);
        if (vault) return setProfileInventory(vault);
        for (const [characterId, { items }] of Object.entries(characterInventoriesRef.current)) {
            const inventory = withLock(items);
            if (inventory) return setCharacterInventory(characterId, inventory);
        }
        for (const [characterId, { items }] of Object.entries(characterEquipmentRef.current)) {
            const equipment = withLock(items);
            if (equipment) return setCharacterEquipment(characterId, equipment);
        }
    }, [setCharacterEquipment, setCharacterInventory, setProfileInventory]);

    /** Replaces an item's sockets, stats or perks, e.g. with the ones Bungie sends back after a change */
    const setItemComponentsLocally = useCallback((itemInstanceId: string, { sockets, stats, perks }: InstanceComponents) => {
        setItemComponents(prev => ({
            ...prev,
            sockets: sockets ? { ...prev.sockets, [itemInstanceId]: sockets } : prev.sockets,
            stats: stats ? { ...prev.stats, [itemInstanceId]: stats } : prev.stats,
            perks: perks ? { ...prev.perks, [itemInstanceId]: perks } : prev.perks,
        }));
    }, []);

    const setCharacterStatsLocally = useCallback((characterId: string, stats: Record<string, number>) => {
        setCharacters(prev => prev[characterId] ? { ...prev, [characterId]: { ...prev[characterId], stats } } : prev);
    }, []);

    const changeEmblem = useCallback((characterId: string, emblemHash: number) => {
        setCharacters(prev => ({
            ...prev,
            [characterId]: {
                ...prev[characterId],
                emblemHash
            }
        }));

        const currentEquipment = characterEquipmentRef.current[characterId]?.items || [];
        const currentInventory = characterInventoriesRef.current[characterId]?.items || [];

        const newEmblemIndex = currentInventory.findIndex(i => i.itemHash === emblemHash);

        if (newEmblemIndex !== -1) {
            const newEmblemItem = currentInventory[newEmblemIndex];
            const oldEmblemIndex = currentEquipment.findIndex(i => i.bucketHash === BUCKETS.EMBLEM);

            if (oldEmblemIndex !== -1) {
                const oldEmblemItem = currentEquipment[oldEmblemIndex];
                const updatedInventory = [...currentInventory];
                updatedInventory.splice(newEmblemIndex, 1);
                updatedInventory.push(oldEmblemItem);

                const updatedEquipment = [...currentEquipment];
                updatedEquipment.splice(oldEmblemIndex, 1);
                updatedEquipment.push(newEmblemItem);

                setCharacterInventory(characterId, updatedInventory);
                setCharacterEquipment(characterId, updatedEquipment);
            }
        }
    }, [setCharacterEquipment, setCharacterInventory]);

    const equipItemLocally = useCallback((characterId: string, itemInstanceId: string) => {
        const inventory = characterInventoriesRef.current[characterId];
        const equipment = characterEquipmentRef.current[characterId];

        if (!inventory || !equipment) return;

        const itemToEquipIndex = inventory.items.findIndex(i => i.itemInstanceId === itemInstanceId);
        if (itemToEquipIndex === -1) return;

        const itemToEquip = inventory.items[itemToEquipIndex];
        const bucketHash = itemToEquip.bucketHash;

        const currentlyEquippedIndex = equipment.items.findIndex(i => i.bucketHash === bucketHash);
        if (currentlyEquippedIndex === -1) return;

        const currentlyEquipped = equipment.items[currentlyEquippedIndex];

        const newInventoryItems = [...inventory.items];
        newInventoryItems.splice(itemToEquipIndex, 1);
        newInventoryItems.push(currentlyEquipped);

        const newEquipmentItems = [...equipment.items];
        newEquipmentItems[currentlyEquippedIndex] = itemToEquip;

        setCharacterInventory(characterId, newInventoryItems);
        setCharacterEquipment(characterId, newEquipmentItems);

        setItemComponents(prev => ({
            ...prev,
            instances: {
                ...prev.instances,
                [itemInstanceId]: { ...prev.instances[itemInstanceId], isEquipped: true },
                [currentlyEquipped.itemInstanceId]: { ...prev.instances[currentlyEquipped.itemInstanceId], isEquipped: false }
            }
        }));
    }, [setCharacterEquipment, setCharacterInventory]);

    const transferEquippedItem = useCallback((itemHash: number, itemInstanceId: string, fromId: string, toId: string, replacementItemInstanceId: string) => {
        const inventory = characterInventoriesRef.current[fromId];
        const equipment = characterEquipmentRef.current[fromId];

        if (!inventory || !equipment) return;

        const replacementIndex = inventory.items.findIndex(i => i.itemInstanceId === replacementItemInstanceId);
        if (replacementIndex === -1) return;
        const replacementItem = inventory.items[replacementIndex];

        const exoticIndex = equipment.items.findIndex(i => i.itemInstanceId === itemInstanceId);
        if (exoticIndex === -1) return;
        const exoticItem = equipment.items[exoticIndex];

        const newInventory = [...inventory.items];
        newInventory.splice(replacementIndex, 1);

        const newEquipment = [...equipment.items];
        newEquipment[exoticIndex] = replacementItem;

        const movedItem = { ...exoticItem, location: 1 };

        const addItem = (items: Item[], item: Item): Item[] => {
            const newItems = [...items];
            newItems.push(item);
            return newItems;
        };

        if (toId === "vault") {
            movedItem.location = 2;
            setProfileInventory(addItem(profileInventoryRef.current, movedItem));
        } else {
            const targetInventory = characterInventoriesRef.current[toId]?.items || [];
            setCharacterInventory(toId, addItem(targetInventory, movedItem));
        }

        setCharacterInventory(fromId, newInventory);
        setCharacterEquipment(fromId, newEquipment);

        setItemComponents(prev => ({
            ...prev,
            instances: {
                ...prev.instances,
                [replacementItemInstanceId]: { ...prev.instances[replacementItemInstanceId], isEquipped: true },
                [itemInstanceId]: { ...prev.instances[itemInstanceId], isEquipped: false }
            }
        }));
    }, [setCharacterEquipment, setCharacterInventory, setProfileInventory]);

    const equipLoadoutLocally = useCallback((characterId: string, loadoutItems: Item[]) => {
        const inventory = characterInventoriesRef.current[characterId];
        const equipment = characterEquipmentRef.current[characterId];

        if (!inventory || !equipment) return;

        const newInventoryItems = [...inventory.items];
        const newEquipmentItems = [...equipment.items];
        const updatedInstances: Record<string, ItemInstance> = {};

        loadoutItems.forEach(itemToEquip => {
            // Check if already equipped
            const isAlreadyEquipped = newEquipmentItems.some(i => i.itemInstanceId === itemToEquip.itemInstanceId);
            if (isAlreadyEquipped) return;

            // Find item in inventory
            const itemIndex = newInventoryItems.findIndex(i => i.itemInstanceId === itemToEquip.itemInstanceId);
            if (itemIndex === -1) {
                // Item might have been just transferred and is in the ref but maybe we missed it?
                // Or it's not on the character yet (shouldn't happen if we called moveItem correctly before)
                return;
            }

            // Find what to unequip
            const bucketHash = itemToEquip.bucketHash;
            const currentlyEquippedIndex = newEquipmentItems.findIndex(i => i.bucketHash === bucketHash);

            if (currentlyEquippedIndex !== -1) {
                const currentlyEquipped = newEquipmentItems[currentlyEquippedIndex];

                // Swap
                newInventoryItems.splice(itemIndex, 1); // Remove new item from inventory
                newInventoryItems.push(currentlyEquipped); // Add old item to inventory

                newEquipmentItems[currentlyEquippedIndex] = itemToEquip; // Put new item in equipment

                // Update instances status
                if (itemComponentsRef.current.instances[itemToEquip.itemInstanceId]) {
                    updatedInstances[itemToEquip.itemInstanceId] = { ...itemComponentsRef.current.instances[itemToEquip.itemInstanceId], isEquipped: true };
                }
                if (itemComponentsRef.current.instances[currentlyEquipped.itemInstanceId]) {
                    updatedInstances[currentlyEquipped.itemInstanceId] = { ...itemComponentsRef.current.instances[currentlyEquipped.itemInstanceId], isEquipped: false };
                }
            }
        });

        setCharacterInventory(characterId, newInventoryItems);
        setCharacterEquipment(characterId, newEquipmentItems);

        if (Object.keys(updatedInstances).length > 0) {
            setItemComponents(prev => ({
                ...prev,
                instances: {
                    ...prev.instances,
                    ...updatedInstances
                }
            }));
        }
    }, [setCharacterEquipment, setCharacterInventory]);

    const updateLoadoutLocally = useCallback((characterId: string, loadoutIndex: number, loadout: Loadout) => {
        setCharacterLoadouts(prev => {
            const loadouts = [...(prev[characterId]?.loadouts ?? [])];
            loadouts[loadoutIndex] = loadout;
            return { ...prev, [characterId]: { loadouts } };
        });
    }, []);

    const contextValue = useMemo(() => ({
        loadingProfile: loading,
        profileError: loadError,
        user: user as BungieUser,
        refreshing,
        refresh,
        characterEquipment,
        characterInventories,
        characterLoadouts,
        characters,
        itemComponents,
        plugSets,
        profile: profileData,
        profileCurrencies,
        profileInventory,
        lastRefresh,
        setCharacterEquipment,
        setCharacterInventory,
        setProfileInventory,
        moveItem,
        changeEmblem,
        setCharacterStatsLocally,
        equipItemLocally,
        transferEquippedItem,
        equipLoadoutLocally,
        updateLoadoutLocally,
        setItemLockedLocally,
        setItemComponentsLocally
    }), [loading, loadError, user, refreshing, refresh, characterEquipment, characterInventories, characterLoadouts, characters, itemComponents, plugSets, profileData, profileCurrencies, profileInventory, lastRefresh,
        setCharacterEquipment, setCharacterInventory, setProfileInventory, moveItem, changeEmblem, setCharacterStatsLocally, equipItemLocally, transferEquippedItem, equipLoadoutLocally, updateLoadoutLocally, setItemLockedLocally, setItemComponentsLocally]);

    return (
        <ProfileContext.Provider value={contextValue}>
            {children}
        </ProfileContext.Provider>
    )

}

export const useProfile = () => {
    const context = useContext(ProfileContext)
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
}
