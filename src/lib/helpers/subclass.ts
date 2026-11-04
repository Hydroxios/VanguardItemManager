import { ItemComponents, ItemDefinition, ItemDefinitions, PlugSets } from "@/lib/types";
import { getAvailablePlugs, getLockedPlugs } from "./mods";

/** Aspects and fragments are unordered sets of unique plugs; supers and abilities are one plug per socket. */
export type SubclassSocketKind = "aspects" | "fragments" | "other";

export interface SubclassSocketGroup {
    categoryHash: number
    kind: SubclassSocketKind
    socketIndexes: number[]
}

export interface PlugInsertion {
    socketIndex: number
    plugHash: number
}

/** The plug a socket holds by default, which also marks it as empty for fragment sockets. */
export const getEmptyPlug = (definition: ItemDefinition, socketIndex: number) =>
    definition.sockets?.socketEntries[socketIndex]?.singleInitialItemHash || undefined;

export const isEmptyPlug = (definition: ItemDefinition, socketIndex: number, plugHash?: number) =>
    !plugHash || plugHash === getEmptyPlug(definition, socketIndex);

const kindOf = (definition: ItemDefinition, socketIndexes: number[], itemDefinitions: ItemDefinitions): SubclassSocketKind => {
    const entry = definition.sockets?.socketEntries[socketIndexes[0]];
    const samplePlug = itemDefinitions[entry?.singleInitialItemHash ?? 0] ?? itemDefinitions[entry?.reusablePlugItems?.[0]?.plugItemHash ?? 0];
    const identifier = samplePlug?.plug?.plugCategoryIdentifier ?? "";
    if (identifier.includes("aspects")) return "aspects";
    if (identifier.includes("fragments")) return "fragments";
    return "other";
};

/** Socket groups of a subclass (super, abilities, aspects, fragments...), in the game's order. */
export const getSubclassSocketGroups = (
    definition: ItemDefinition | undefined,
    itemDefinitions: ItemDefinitions,
    isShown: (socketIndex: number) => boolean
): SubclassSocketGroup[] => {
    if (!definition?.sockets) return [];
    return definition.sockets.socketCategories
        .map((category) => ({
            categoryHash: category.socketCategoryHash,
            kind: kindOf(definition, category.socketIndexes, itemDefinitions),
            socketIndexes: category.socketIndexes.filter(isShown),
        }))
        .filter((group) => group.socketIndexes.length > 0);
};

interface EditableSubclassContext {
    itemInstanceId: string
    characterId: string
    itemComponents: ItemComponents
    plugSets: PlugSets
    itemDefinitions: ItemDefinitions
}

/**
 * The subclass sockets a player can change, with the plugs available in each and those not unlocked yet. Hidden
 * sockets and sockets with a single option are left out; fragment sockets always stay, locked or not, so their
 * positions match the game.
 */
export const getEditableSubclassSockets = (
    definition: ItemDefinition | undefined,
    { itemInstanceId, characterId, itemComponents, plugSets, itemDefinitions }: EditableSubclassContext
) => {
    const optionsBySocket: Record<number, number[]> = {};
    const lockedBySocket: Record<number, number[]> = {};
    if (!definition) return { groups: [], optionsBySocket, lockedBySocket };
    const sockets = itemComponents.sockets[itemInstanceId]?.sockets ?? [];
    const groups = getSubclassSocketGroups(definition, itemDefinitions, () => true)
        .map((group) => ({
            ...group,
            socketIndexes: group.socketIndexes.filter((socketIndex) => {
                if (group.kind !== "fragments" && sockets[socketIndex]?.isVisible === false) return false;
                const context = { definition, itemInstanceId, characterId, itemComponents, plugSets };
                optionsBySocket[socketIndex] = getAvailablePlugs(socketIndex, context);
                lockedBySocket[socketIndex] = getLockedPlugs(socketIndex, optionsBySocket[socketIndex], context);
                return optionsBySocket[socketIndex].length > 1;
            }),
        }))
        .filter((group) => group.socketIndexes.length > 0);
    return { groups, optionsBySocket, lockedBySocket };
};

const socketsOf = (groups: SubclassSocketGroup[], kind: SubclassSocketKind) =>
    groups.filter((group) => group.kind === kind).flatMap((group) => group.socketIndexes);

/** How many fragment sockets the aspects open, or undefined when their definitions don't say. */
export const getFragmentCapacity = (
    groups: SubclassSocketGroup[],
    plugs: Record<number, number>,
    itemDefinitions: ItemDefinitions
): number | undefined => {
    const capacities = socketsOf(groups, "aspects").map((socketIndex) => itemDefinitions[plugs[socketIndex]]?.plug?.energyCapacity?.capacityValue);
    if (capacities.every((capacity) => capacity === undefined)) return undefined;
    return capacities.reduce<number>((total, capacity) => total + (capacity ?? 0), 0);
};

/** Number of non-empty fragments in the plugs. */
export const countFragments = (groups: SubclassSocketGroup[], plugs: Record<number, number>, definition: ItemDefinition) =>
    socketsOf(groups, "fragments").filter((socketIndex) => !isEmptyPlug(definition, socketIndex, plugs[socketIndex])).length;

/**
 * Orders the insertions that turn the subclass's current setup into the desired one without the game refusing any:
 * fragments that go away (or no longer fit) are taken out before aspects change, aspects and fragments are treated
 * as sets so swapping their position costs nothing, and new fragments only go in the sockets the aspects open.
 */
export const planSubclassChanges = (
    definition: ItemDefinition,
    groups: SubclassSocketGroup[],
    current: (number | undefined)[],
    desired: Record<number, number>,
    fragmentCapacity: number | undefined
): PlugInsertion[] => {
    const steps: PlugInsertion[] = [];
    const state = [...current];
    const insert = (socketIndex: number, plugHash: number | undefined) => {
        if (!plugHash || state[socketIndex] === plugHash) return;
        steps.push({ socketIndex, plugHash });
        state[socketIndex] = plugHash;
    };
    const wantedIn = (sockets: number[]) => sockets
        .filter((socketIndex) => !isEmptyPlug(definition, socketIndex, desired[socketIndex]))
        .map((socketIndex) => desired[socketIndex]);

    // Super and abilities
    socketsOf(groups, "other").forEach((socketIndex) => insert(socketIndex, desired[socketIndex]));

    // Take out the fragments that go away, or that sit in a socket the new aspects won't open
    const fragmentSockets = socketsOf(groups, "fragments");
    const allowedFragments = fragmentCapacity ?? fragmentSockets.length;
    const fragmentsToPlace = new Set(wantedIn(fragmentSockets));
    fragmentSockets.forEach((socketIndex, position) => {
        const plug = state[socketIndex];
        if (isEmptyPlug(definition, socketIndex, plug)) return;
        if (fragmentsToPlace.has(plug!) && position < allowedFragments) fragmentsToPlace.delete(plug!);
        else insert(socketIndex, getEmptyPlug(definition, socketIndex));
    });

    // Aspects: keep the ones already slotted, put the new ones in the other sockets
    const aspectSockets = socketsOf(groups, "aspects");
    const aspectsToPlace = new Set(wantedIn(aspectSockets));
    const freeAspectSockets = aspectSockets.filter((socketIndex) => {
        const plug = state[socketIndex];
        if (plug && aspectsToPlace.has(plug)) {
            aspectsToPlace.delete(plug);
            return false;
        }
        return true;
    });
    const newAspects = [...aspectsToPlace];
    freeAspectSockets.forEach((socketIndex, n) => insert(socketIndex, newAspects[n] ?? getEmptyPlug(definition, socketIndex)));

    // New fragments go in the first empty sockets the aspects open
    const newFragments = [...fragmentsToPlace];
    fragmentSockets.forEach((socketIndex, position) => {
        if (newFragments.length > 0 && position < allowedFragments && isEmptyPlug(definition, socketIndex, state[socketIndex])) {
            insert(socketIndex, newFragments.shift());
        }
    });

    return steps;
};
