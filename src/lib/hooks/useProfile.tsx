import { createContext, ReactNode, useContext, useEffect, useState, useMemo, useRef } from "react";
import { getCurrentUser, getProfile } from "@/lib/bungie";
import useAuth from "./useAuth";
import { BungieUser, Character, Currency, Item, ItemInstance, ItemComponents, ItemPlug, Loadout, PlugSets, ProfileData } from "@/lib/types";
import { BUCKETS } from "@/lib/constants";


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
    equipItemLocally: (characterId: string, itemInstanceId: string) => void;
    transferEquippedItem: (itemHash: number, itemInstanceId: string, fromId: string, toId: string, replacementItemInstanceId: string) => void;
    equipLoadoutLocally: (characterId: string, loadoutItems: Item[]) => void;
    updateLoadoutLocally: (characterId: string, loadoutIndex: number, loadout: Loadout) => void;
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

    const { token, lastUpdate, refreshUserToken } = useAuth()

    // fetchProfile is captured by the memoized context value, so read auth state through refs
    const tokenRef = useRef(token);
    const lastUpdateRef = useRef(lastUpdate);
    useEffect(() => { tokenRef.current = token; }, [token]);
    useEffect(() => { lastUpdateRef.current = lastUpdate; }, [lastUpdate]);

    const fetchProfile = async () => {
        if (refreshing) return;

        let profile;
        let u;
        try {
            let t = tokenRef.current;
            if (Date.now() - lastUpdateRef.current >= 3600 * 1000) {
                t = await refreshUserToken() ?? t
            }
            if (!t) throw new Error("You are not logged in.");

            if (!user) {
                u = await getCurrentUser(t);
                setUser(u)
            } else {
                u = user
            }

            profile = await getProfile(t, u.membershipId, u.membershipType)
        } catch (error) {
            console.error("Failed to fetch profile:", error)
            // Only block the UI on the first load; later refreshes keep the current data
            if (loading) setLoadError(error instanceof Error ? error.message : "Could not load your profile.")
            return
        }
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

        if (loading) {
            setLoading(false)
        }

        setLastRefresh(Date.now())
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    // These setters update the refs synchronously so several local moves in a row
    // always build on the latest state, whatever React does with the updates
    const setCharacterEquipment = (characterId: string, items: Item[]) => {
        const newState = { ...characterEquipmentRef.current, [characterId]: { items } };
        characterEquipmentRef.current = newState;
        setCharacterEquipementState(newState);
    };
    const setCharacterInventory = (characterId: string, items: Item[]) => {
        const newState = { ...characterInventoriesRef.current, [characterId]: { items } };
        characterInventoriesRef.current = newState;
        setCharacterInventoriesState(newState);
    };
    const setProfileInventory = (items: Item[]) => {
        setProfileInventoryState(items)
        profileInventoryRef.current = items;
    };

    const moveItem = (itemHash: number, itemInstanceId: string | undefined, fromId: string, toId: string, quantity: number, updates?: Partial<Item>, sourceBucketHash?: number) => {
        // Use refs for current state
        const currentProfileInventory = profileInventoryRef.current;
        const currentCharacterInventories = characterInventoriesRef.current;
        const currentCharacterEquipment = characterEquipmentRef.current;

        // Helper to find and remove item from a list
        const removeItem = (items: Item[], instanceId: string | undefined, qty: number): { item: Item | undefined, newItems: Item[] } => {
            // Instanced items match by instance id only; stacks match by hash (and bucket when given)
            const index = instanceId && instanceId !== "0"
                ? items.findIndex(i => i.itemInstanceId === instanceId)
                : items.findIndex(i => i.itemHash === itemHash && !i.itemInstanceId && (sourceBucketHash === undefined || i.bucketHash === sourceBucketHash));
            if (index === -1) return { item: undefined, newItems: items };

            const item = { ...items[index] };
            const newItems = [...items];

            // Handle stackable items
            if (item.quantity > qty) {
                item.quantity = qty; // The moved item has the moved quantity
                newItems[index] = { ...newItems[index], quantity: newItems[index].quantity - qty }; // Remaining item has reduced quantity
            } else {
                // Remove the item entirely if moving all or more
                newItems.splice(index, 1);
            }
            return { item, newItems };
        };

        // Helper to add item to a list
        const addItem = (items: Item[], item: Item): Item[] => {
            const newItems = [...items];
            // Check if stackable item already exists
            const existingIndex = newItems.findIndex(i => i.itemHash === item.itemHash && i.itemInstanceId === item.itemInstanceId && i.bucketHash === item.bucketHash);

            if (existingIndex !== -1 && !item.itemInstanceId) {
                newItems[existingIndex] = { ...newItems[existingIndex], quantity: newItems[existingIndex].quantity + item.quantity };
            } else {
                newItems.push(item);
            }
            return newItems;
        };

        let itemToMove: Item | undefined;

        // 1. Remove from source
        if (fromId === "vault") {
            const result = removeItem(currentProfileInventory, itemInstanceId, quantity);
            itemToMove = result.item;
            if (result.newItems !== currentProfileInventory) setProfileInventory(result.newItems);
        } else {
            const inventory = currentCharacterInventories[fromId]?.items || [];
            const result = removeItem(inventory, itemInstanceId, quantity);
            itemToMove = result.item;
            if (result.newItems !== inventory) setCharacterInventory(fromId, result.newItems);

            // Also check equipment if not found in inventory
            if (!itemToMove) {
                const equipment = currentCharacterEquipment[fromId]?.items || [];
                const resultEq = removeItem(equipment, itemInstanceId, quantity);
                itemToMove = resultEq.item;
                if (resultEq.newItems !== equipment) setCharacterEquipment(fromId, resultEq.newItems);
            }
        }

        if (itemToMove && itemToMove.itemInstanceId) {
            setItemComponents(prev => ({
                ...prev,
                instances: {
                    ...prev.instances,
                    [itemToMove!.itemInstanceId]: { ...prev.instances[itemToMove!.itemInstanceId], isEquipped: false }
                }
            }));
        }

        if (!itemToMove) {
            console.warn("Could not find item to move locally");
            return;
        }

        // 2. Add to destination
        const movedItem = { ...itemToMove, ...updates };
        if (toId === "vault") {
            movedItem.location = 2; // Vault location
            // The custom setters update the refs synchronously, so this sees the removal above
            setProfileInventory(addItem(profileInventoryRef.current, movedItem));
        } else {
            movedItem.location = 1; // Character location
            const targetInventory = characterInventoriesRef.current[toId]?.items || [];
            setCharacterInventory(toId, addItem(targetInventory, movedItem));
        }
    };

    const changeEmblem = (characterId: string, emblemHash: number) => {
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
    };

    const equipItemLocally = (characterId: string, itemInstanceId: string) => {
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
    };

    const transferEquippedItem = (itemHash: number, itemInstanceId: string, fromId: string, toId: string, replacementItemInstanceId: string) => {
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
    };

    const equipLoadoutLocally = (characterId: string, loadoutItems: Item[]) => {
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
    };

    const updateLoadoutLocally = (characterId: string, loadoutIndex: number, loadout: Loadout) => {
        setCharacterLoadouts(prev => {
            const loadouts = [...(prev[characterId]?.loadouts ?? [])];
            loadouts[loadoutIndex] = loadout;
            return { ...prev, [characterId]: { loadouts } };
        });
    };

    const contextValue = useMemo(() => ({
        loadingProfile: loading,
        profileError: loadError,
        user: user as BungieUser,
        refreshing,
        refresh: async () => {
            if (refreshing) return;
            setRefreshing(true);
            try {
                await fetchProfile();
            } finally {
                setRefreshing(false);
            }
        },
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
        equipItemLocally,
        transferEquippedItem,
        equipLoadoutLocally,
        updateLoadoutLocally
    }), [loading, loadError, user, refreshing, characterEquipment, characterInventories, characterLoadouts, characters, itemComponents, plugSets, profileData, profileCurrencies, profileInventory, lastRefresh]);

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
