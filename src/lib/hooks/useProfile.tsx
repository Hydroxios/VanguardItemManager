import { createContext, ReactNode, useContext, useEffect, useState, useMemo, useRef } from "react";
import { BungieUser, getCurrentUser, getProfile, UserInfo } from "@/lib/bungie";
import useAuth from "./useAuth";

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

export interface ItemComponents {
    instances: Record<string, ItemInstance>
    perks: Record<string, ItemPerks>
    sockets: Record<string, ItemSockets>
    stats: Record<string, ItemStats>
}

export interface Profile {
    loadingProfile: boolean
    user: BungieUser
    refreshing: boolean;
    refresh: () => Promise<void>
    characterEquipment: Record<string, { items: Item[] }>
    characterInventories: Record<string, { items: Item[] }>
    characterLoadouts: Record<string, { loadouts: Loadout[] }>
    characters: Record<string, Character>
    itemComponents: ItemComponents
    profile: ProfileData
    profileCurrencies: Currency[]
    profileInventory: Item[]
    lastRefresh?: number;
    setCharacterEquipment: (characterId: string, items: Item[]) => void;
    setCharacterInventory: (characterId: string, items: Item[]) => void;
    setProfileInventory: (items: Item[]) => void;
    moveItem: (itemHash: number, itemInstanceId: string, fromId: string, toId: string, quantity: number, updates?: Partial<Item>) => void;
    changeEmblem: (characterId: string, emblemHash: number) => void;
    equipItemLocally: (characterId: string, itemInstanceId: string) => void;
    transferEquippedItem: (itemHash: number, itemInstanceId: string, fromId: string, toId: string, replacementItemInstanceId: string) => void;
    equipLoadoutLocally: (characterId: string, loadoutItems: Item[]) => void;
}

const ProfileContext = createContext<Profile | undefined>(undefined)

interface ProfileProviderProps {
    children: ReactNode
}

export const ProfileProvider = ({ children }: ProfileProviderProps) => {

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [user, setUser] = useState<BungieUser>()

    const [characterEquipment, setCharacterEquipementState] = useState<Record<string, { items: Item[] }>>({})
    const [characterInventories, setCharacterInventoriesState] = useState<Record<string, { items: Item[] }>>({})
    const [characterLoadouts, setCharacterLoadouts] = useState<Record<string, { loadouts: Loadout[] }>>({})
    const [characters, setCharacters] = useState<Record<string, Character>>({})

    const [itemComponents, setItemComponents] = useState<ItemComponents>({ instances: {}, perks: {}, sockets: {}, stats: {} })

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

    const fetchProfile = async () => {
        if (refreshing) return;

        let t = token;
        if (Date.now() - lastUpdate >= 3600 * 1000) {
            t = await refreshUserToken()
        }

        let u;
        if (!user) {
            u = await getCurrentUser(t as string);
            setUser(u as BungieUser)
        } else {
            u = user
        }

        const profile = await getProfile(t as string, u.membershipId, u.membershipType)

        setCharacterEquipementState(profile.characterEquipment.data)
        setCharacterInventoriesState(profile.characterInventories.data)
        setCharacterLoadouts(profile.characterLoadouts.data)
        setCharacters(profile.characters.data)

        const itemcomps: ItemComponents = {
            instances: profile.itemComponents.instances.data,
            perks: profile.itemComponents.perks.data,
            sockets: profile.itemComponents.sockets?.data ?? {},
            stats: profile.itemComponents.stats.data
        }
        setItemComponents(itemcomps)

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

    const setCharacterEquipment = (characterId: string, items: Item[]) => {
        setCharacterEquipementState(prev => {
            const newState = { ...prev, [characterId]: { items } };
            characterEquipmentRef.current = newState;
            return newState;
        });
    };
    const setCharacterInventory = (characterId: string, items: Item[]) => {
        setCharacterInventoriesState(prev => {
            const newState = { ...prev, [characterId]: { items } };
            characterInventoriesRef.current = newState;
            return newState;
        });
    };
    const setProfileInventory = (items: Item[]) => {
        setProfileInventoryState(items)
        profileInventoryRef.current = items;
    };

    const moveItem = (itemHash: number, itemInstanceId: string, fromId: string, toId: string, quantity: number, updates?: Partial<Item>) => {
        // Use refs for current state
        const currentProfileInventory = profileInventoryRef.current;
        const currentCharacterInventories = characterInventoriesRef.current;
        const currentCharacterEquipment = characterEquipmentRef.current;

        // Helper to find and remove item from a list
        const removeItem = (items: Item[], instanceId: string, qty: number): { item: Item | undefined, newItems: Item[] } => {
            const index = items.findIndex(i => i.itemInstanceId === instanceId || (i.itemHash === itemHash && !i.itemInstanceId));
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
            const existingIndex = newItems.findIndex(i => i.itemHash === item.itemHash && i.itemInstanceId === item.itemInstanceId);

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
            setProfileInventory(addItem(profileInventoryRef.current, movedItem)); // Use ref again to be safe? actually we just updated it via setter but setter is async. 
            // Wait, if we called setProfileInventory above, profileInventoryRef.current is NOT updated yet because the setter updater function hasn't run or the effect hasn't run.
            // BUT, we manually updated the ref in our custom setters! 
            // So profileInventoryRef.current IS updated if we used our custom setters.
            // HOWEVER, we called setProfileInventory(result.newItems) which calls setProfileInventoryState.
            // Our custom wrapper `setProfileInventory` updates the ref.
            // So yes, it should be safe.
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
            const oldEmblemIndex = currentEquipment.findIndex(i => i.bucketHash === 28);

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

    const contextValue = useMemo(() => ({
        loadingProfile: loading,
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
        equipLoadoutLocally
    }), [loading, user, refreshing, characterEquipment, characterInventories, characterLoadouts, characters, itemComponents, profileData, profileCurrencies, profileInventory, lastRefresh]);

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
