import { createContext, ReactNode, useContext, useEffect, useState, useMemo } from "react";
import { BungieUser, getCurrentUser, getProfile, UserInfo } from "../bungie";
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
    primaryStat: {statHash: number, value: number}
    quality: number
    gearTier: number
}

export interface Loadout {
    colorHash: number
    iconHash: number
    items: {itemInstanceId: string}[]
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
    stats: Record<string, {statHash: number, value: number}>
}

export interface ItemPerks {
    perks: Perk[]
}

export interface ItemComponents {
    instances: Record<string, ItemInstance>
    perks: Record<string, ItemPerks>
    stats: Record<string, ItemStats>
}

export interface Profile {
    loadingProfile: boolean
    user: BungieUser
    refreshing: boolean;
    refresh: () => Promise<void>
    characterEquipment: Record<string, {items: Item[]}>
    characterInventories: Record<string, {items: Item[]}>
    characterLoadouts: Record<string, {loadouts: Loadout[]}>
    characters: Record<string, Character>
    itemComponents: ItemComponents
    profile: ProfileData
    profileCurrencies: Currency[]
    profileInventory: Item[]
    setCharacterEquipment: (characterId: string, items: Item[]) => void;
    setCharacterInventory: (characterId: string, items: Item[]) => void;
}

const ProfileContext = createContext<Profile | undefined>(undefined)

interface ProfileProviderProps {
    children: ReactNode
}

export const ProfileProvider = ({children}: ProfileProviderProps) => {

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [user, setUser] = useState<BungieUser>()

    const [characterEquipment, setCharacterEquipement] = useState<Record<string, {items: Item[]}>>({})
    const [characterInventories, setCharacterInventories] = useState<Record<string, {items: Item[]}>>({})
    const [characterLoadouts, setCharacterLoadouts] = useState<Record<string, {loadouts: Loadout[]}>>({})
    const [characters, setCharacters] = useState<Record<string, Character>>({})

    const [itemComponents, setItemComponents] = useState<ItemComponents>({instances: {}, perks: {}, stats: {}})

    const [profileData, setProfileData] = useState<ProfileData>({userInfo: undefined, characterIds: [], currentGuardianRank: 0, currentSeasonHash: 0})
    const [profileCurrencies, setProfileCurrencies] = useState<Currency[]>([])
    const [profileInventory, setProfileInventory] = useState<Item[]>([])

    const {token, lastUpdate, refreshUserToken} = useAuth()

    const fetchProfile = async () => {
        if(refreshing) return;

        let t = token;
        if(Date.now() - lastUpdate >= 3600 * 1000){
            t = await refreshUserToken()
        }

        let u;
        if(!user){
            u = await getCurrentUser(t as string);
            setUser(u as BungieUser)
        } else {
            u = user
        }
        
        const profile = await getProfile(t as string, u.membershipId, u.membershipType)

        setCharacterEquipement(profile.characterEquipment.data)

        setCharacterInventories(profile.characterInventories.data)
        setCharacterLoadouts(profile.characterLoadouts.data)
        setCharacters(profile.characters.data)

        let itemcomps: ItemComponents = {
            instances: profile.itemComponents.instances.data,
            perks: profile.itemComponents.perks.data,
            stats: profile.itemComponents.stats.data
        }
        setItemComponents(itemcomps)

        setProfileData(profile.profile.data)
        setProfileCurrencies(profile.profileCurrencies.data.items)
        setProfileInventory(profile.profileInventory.data.items)

        if(loading){
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    const setCharacterEquipment = (characterId: string, items: Item[]) => {
        setCharacterEquipement(prev => ({
            ...prev,
            [characterId]: { items }
        }));
    };
    const setCharacterInventory = (characterId: string, items: Item[]) => {
        setCharacterInventories(prev => ({
            ...prev,
            [characterId]: { items }
        }));
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
        setCharacterEquipment,
        setCharacterInventory
    }), [loading, user, refreshing, characterEquipment, characterInventories, characterLoadouts, characters, itemComponents, profileData, profileCurrencies, profileInventory]);

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