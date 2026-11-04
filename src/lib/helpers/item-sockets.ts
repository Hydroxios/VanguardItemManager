// What an item's sockets hold, read from the sockets component and the socket categories of its definition.
// The perks component only lists perk effects, in no guaranteed order, so it can't tell a barrel from an origin trait.

import { ITEM_TYPES, MATERIAL_CATEGORY, SOCKET_CATEGORIES, TIER_TYPES } from "@/lib/constants";
import { getModSockets } from "@/lib/helpers/mods";
import { ItemComponents, ItemDefinition, ItemDefinitions, ItemSocket } from "@/lib/types";

export type ItemKind = "weapon" | "armor" | "subclass" | "material" | "generic";

export const getItemKind = (definition: ItemDefinition): ItemKind => {
    switch (definition.itemType) {
        case ITEM_TYPES.WEAPON: return "weapon";
        case ITEM_TYPES.ARMOR: return "armor";
        case ITEM_TYPES.SUBCLASS: return "subclass";
    }
    return definition.itemCategoryHashes?.includes(MATERIAL_CATEGORY) ? "material" : "generic";
};

export interface PerkColumn {
    socketIndex: number
    current: ItemDefinition
    /** The perks this roll can switch between in this column, the current one included, in the game's order */
    options: ItemDefinition[]
    origin: boolean
}

export interface WeaponSockets {
    /** The frame (legendary) or intrinsic perk (exotic) */
    intrinsic?: ItemDefinition
    columns: PerkColumn[]
    masterwork?: ItemDefinition
    mods: ItemDefinition[]
}

export interface ArmorSockets {
    /** Exotic perk, archetype... */
    perks: ItemDefinition[]
    mods: ItemDefinition[]
    /** The plug that sets the armor's energy and masterwork stats */
    masterwork?: ItemDefinition
}

const ORIGIN_PLUG_CATEGORY = "origins";

/** Enhanced perks are the only weapon perks with this tier */
export const isEnhancedPerk = (plug: ItemDefinition | undefined) => plug?.inventory?.tierType === TIER_TYPES.COMMON;

const socketIndexes = (definition: ItemDefinition, categoryHash: number) =>
    (definition.sockets?.socketCategories ?? [])
        .filter((category) => category.socketCategoryHash === categoryHash)
        .flatMap((category) => category.socketIndexes);

/** The plug in a socket, when the game shows one there */
const shownPlug = (socket: ItemSocket | undefined, itemDefinitions: ItemDefinitions) => {
    if (!socket?.plugHash || socket.isVisible === false) return undefined;
    const plug = itemDefinitions[socket.plugHash];
    return plug?.displayProperties?.name && plug.displayProperties.icon ? plug : undefined;
};

const plugCategory = (plug: ItemDefinition) => plug.plug?.plugCategoryIdentifier ?? "";

export const getWeaponSockets = (
    definition: ItemDefinition,
    itemInstanceId: string | undefined,
    itemComponents: ItemComponents,
    itemDefinitions: ItemDefinitions
): WeaponSockets => {
    const sockets = itemComponents.sockets[itemInstanceId ?? ""]?.sockets ?? [];
    const plugAt = (socketIndex: number) => shownPlug(sockets[socketIndex], itemDefinitions);

    const intrinsic = socketIndexes(definition, SOCKET_CATEGORIES.WEAPON_INTRINSIC).map(plugAt).find(Boolean);

    const columns = socketIndexes(definition, SOCKET_CATEGORIES.WEAPON_PERKS).flatMap((socketIndex): PerkColumn[] => {
        const current = plugAt(socketIndex);
        // Kill trackers share the perk sockets on some weapons
        if (!current || plugCategory(current).includes("tracker")) return [];
        const reusable = (itemComponents.reusablePlugs[itemInstanceId ?? ""]?.plugs[socketIndex] ?? [])
            .filter((plug) => plug.canInsert !== false && plug.enabled !== false)
            .map((plug) => itemDefinitions[plug.plugItemHash])
            .filter((plug): plug is ItemDefinition => !!plug);
        const options = reusable.some((plug) => plug.hash === current.hash) ? reusable : [current, ...reusable];
        return [{ socketIndex, current, options, origin: plugCategory(current) === ORIGIN_PLUG_CATEGORY }];
    });

    let masterwork: ItemDefinition | undefined;
    const mods: ItemDefinition[] = [];
    socketIndexes(definition, SOCKET_CATEGORIES.WEAPON_MODS).forEach((socketIndex) => {
        const plug = plugAt(socketIndex);
        if (!plug) return;
        const category = plugCategory(plug);
        // Trackers and crafting sockets (level boosts, mementos...) aren't worth a tooltip line
        if (category.includes("tracker") || category.startsWith("crafting.")) return;
        if (category.includes("masterwork")) masterwork ??= plug;
        else mods.push(plug);
    });

    return { intrinsic, columns, masterwork, mods };
};

export const getArmorSockets = (
    definition: ItemDefinition,
    itemInstanceId: string | undefined,
    itemComponents: ItemComponents,
    itemDefinitions: ItemDefinitions
): ArmorSockets => {
    const sockets = itemComponents.sockets[itemInstanceId ?? ""]?.sockets ?? [];
    const plugAt = (socketIndex: number) => shownPlug(sockets[socketIndex], itemDefinitions);

    // Empty perk sockets hold a placeholder plug with nothing to say
    const perks = socketIndexes(definition, SOCKET_CATEGORIES.ARMOR_PERKS)
        .map(plugAt)
        .filter((plug): plug is ItemDefinition => !!plug && (!!plug.displayProperties.description || (plug.perks?.length ?? 0) > 0));

    const mods = getModSockets(definition, itemDefinitions)
        .filter((socket) => socket.categoryHash === SOCKET_CATEGORIES.ARMOR_MODS)
        .map((socket) => itemDefinitions[sockets[socket.socketIndex]?.plugHash ?? 0])
        .filter((plug): plug is ItemDefinition => !!plug?.displayProperties?.icon);

    const masterwork = socketIndexes(definition, SOCKET_CATEGORIES.ARMOR_TIER)
        .map((socketIndex) => itemDefinitions[sockets[socketIndex]?.plugHash ?? 0])
        .find(Boolean);

    return { perks, mods, masterwork };
};
