import { ItemComponents, ItemDefinition, ItemDefinitions, ItemPlug, MaterialRequirementSetDefinitions, PlugSets } from "@/lib/types";
import { SOCKET_CATEGORIES } from "@/lib/constants";

export interface ModSocket {
    socketIndex: number
    categoryHash: number
}

// Weapon mod sockets share their category with masterworks and trackers, which cost materials
const WEAPON_MOD_PLUG_CATEGORY = ".weapon.mod_";

/** Mod sockets of an item (armor mods, weapon mods), in the order the game shows them. */
export const getModSockets = (definition: ItemDefinition | undefined, itemDefinitions: ItemDefinitions): ModSocket[] => {
    const sockets = definition?.sockets;
    if (!sockets) return [];
    return sockets.socketCategories
        .filter((category) => category.socketCategoryHash === SOCKET_CATEGORIES.ARMOR_MODS || category.socketCategoryHash === SOCKET_CATEGORIES.WEAPON_MODS)
        .flatMap((category) => category.socketIndexes
            .filter((socketIndex) => {
                if (category.socketCategoryHash !== SOCKET_CATEGORIES.WEAPON_MODS) return true;
                const initialPlug = itemDefinitions[sockets.socketEntries[socketIndex]?.singleInitialItemHash];
                return initialPlug?.plug?.plugCategoryIdentifier?.includes(WEAPON_MOD_PLUG_CATEGORY) ?? false;
            })
            .map((socketIndex) => ({ socketIndex, categoryHash: category.socketCategoryHash })));
};

/** Ornament and shader sockets of a weapon or armor piece, in the game's order. Hidden ones are left out. */
export const getCosmeticSockets = (definition: ItemDefinition | undefined, itemInstanceId: string, itemComponents: ItemComponents): ModSocket[] => {
    const sockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
    return (definition?.sockets?.socketCategories ?? [])
        .filter((category) => category.socketCategoryHash === SOCKET_CATEGORIES.WEAPON_COSMETICS || category.socketCategoryHash === SOCKET_CATEGORIES.ARMOR_COSMETICS)
        .flatMap((category) => category.socketIndexes
            .filter((socketIndex) => sockets[socketIndex]?.isVisible !== false)
            .map((socketIndex) => ({ socketIndex, categoryHash: category.socketCategoryHash })));
};

interface AvailablePlugsContext {
    definition: ItemDefinition
    itemInstanceId: string
    characterId: string
    itemComponents: ItemComponents
    plugSets: PlugSets
}

/**
 * Plugs the player can insert in a socket: the item's own reusable plugs plus the unlocked plugs
 * of the socket's plug set, falling back to the definition's list. The empty plug always comes first.
 */
export const getAvailablePlugs = (
    socketIndex: number,
    { definition, itemInstanceId, characterId, itemComponents, plugSets }: AvailablePlugsContext
): number[] => {
    const entry = definition.sockets?.socketEntries[socketIndex];
    if (!entry) return [];

    const hashes = new Set<number>();
    if (entry.singleInitialItemHash) hashes.add(entry.singleInitialItemHash);

    const addUnlocked = (plugs?: ItemPlug[]) => plugs?.forEach((plug) => {
        if (plug.canInsert !== false && plug.enabled !== false) hashes.add(plug.plugItemHash);
    });
    addUnlocked(itemComponents.reusablePlugs[itemInstanceId]?.plugs[socketIndex]);
    if (entry.reusablePlugSetHash) {
        addUnlocked(plugSets.profile[entry.reusablePlugSetHash]);
        addUnlocked(plugSets.characters[characterId]?.[entry.reusablePlugSetHash]);
    }
    if (hashes.size <= 1) entry.reusablePlugItems?.forEach((plug) => hashes.add(plug.plugItemHash));

    // The plug in place stays listed even when it's no longer unlocked (old artifact mods...)
    const current = itemComponents.sockets[itemInstanceId]?.sockets[socketIndex]?.plugHash;
    if (current) hashes.add(current);

    return [...hashes];
};

/**
 * Plugs of a socket the player hasn't unlocked yet (fragments, aspects...): the ones the item, account or character
 * plug sets list but can't insert, minus those already available. Empty when Bungie doesn't list them.
 */
export const getLockedPlugs = (socketIndex: number, available: number[], context: AvailablePlugsContext): number[] => {
    const { definition, itemInstanceId, characterId, itemComponents, plugSets } = context;
    const entry = definition.sockets?.socketEntries[socketIndex];
    if (!entry) return [];
    const listed = [
        ...(itemComponents.reusablePlugs[itemInstanceId]?.plugs[socketIndex] ?? []),
        ...(entry.reusablePlugSetHash ? plugSets.profile[entry.reusablePlugSetHash] ?? [] : []),
        ...(entry.reusablePlugSetHash ? plugSets.characters[characterId]?.[entry.reusablePlugSetHash] ?? [] : []),
    ];
    const unlocked = new Set(available);
    return [...new Set(listed.map((plug) => plug.plugItemHash))].filter((plugHash) => !unlocked.has(plugHash));
};

export const getEnergyCost = (plug: ItemDefinition | undefined) => plug?.plug?.energyCost?.energyCost ?? 0;

/**
 * An armor piece's mod energy: from its instance when Bungie sends it, otherwise from the plug that sets it
 * (the armor's energy/tier socket). Undefined for items without energy.
 */
export const getEnergyCapacity = (itemInstanceId: string, itemComponents: ItemComponents, itemDefinitions: ItemDefinitions): number | undefined => {
    const energy = itemComponents.instances[itemInstanceId]?.energy;
    if (energy?.energyCapacity) return energy.energyCapacity;
    for (const socket of itemComponents.sockets[itemInstanceId]?.sockets ?? []) {
        const capacity = itemDefinitions[socket.plugHash ?? 0]?.plug?.energyCapacity?.capacityValue;
        if (capacity) return capacity;
    }
    return undefined;
};

/**
 * Whether the game lets a plug be inserted for free; others (crafted weapon perks...) cost materials.
 * A requirement set without counted materials is free; an unknown one is treated as free and left to Bungie.
 */
export const isFreePlug = (plug: ItemDefinition | undefined, materialRequirementDefinitions: MaterialRequirementSetDefinitions) => {
    const requirementHash = plug?.plug?.insertionMaterialRequirementHash;
    if (!requirementHash) return true;
    const requirements = materialRequirementDefinitions[requirementHash];
    return !requirements?.materials?.some((material) => material.count > 0 && !material.omitFromRequirements);
};

/**
 * Perks a weapon's perk socket can switch between: only the ones this roll has (its reusable plugs),
 * never the whole random pool. The current perk is always included.
 */
export const getPerkOptions = (socketIndex: number, itemInstanceId: string, itemComponents: ItemComponents): number[] => {
    const hashes = new Set<number>();
    const current = itemComponents.sockets[itemInstanceId]?.sockets[socketIndex]?.plugHash;
    if (current) hashes.add(current);
    itemComponents.reusablePlugs[itemInstanceId]?.plugs[socketIndex]?.forEach((plug) => {
        if (plug.canInsert !== false && plug.enabled !== false) hashes.add(plug.plugItemHash);
    });
    return [...hashes];
};

/** Weapon perk sockets (barrel, magazine, traits...) that offer a choice, in the game's order. */
export const getPerkSockets = (definition: ItemDefinition | undefined, itemInstanceId: string, itemComponents: ItemComponents): number[] => {
    const sockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
    return (definition?.sockets?.socketCategories ?? [])
        .filter((category) => category.socketCategoryHash === SOCKET_CATEGORIES.WEAPON_PERKS)
        .flatMap((category) => category.socketIndexes)
        .filter((socketIndex) => sockets[socketIndex]?.isVisible !== false && getPerkOptions(socketIndex, itemInstanceId, itemComponents).length > 1);
};
