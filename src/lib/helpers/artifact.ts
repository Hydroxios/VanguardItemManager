import { ItemComponents, ItemDefinition, PlugSets } from "@/lib/types";
import { ARTIFACT_RESET_SOCKET_TYPE } from "@/lib/constants";
import { getAvailablePlugs, getLockedPlugs } from "./mods";
import { getEmptyPlug, isEmptyPlug, PlugInsertion } from "./subclass";

export interface ArtifactTier {
    categoryHash: number
    socketIndexes: number[]
}

interface EditableArtifactContext {
    itemInstanceId: string
    characterId: string
    itemComponents: ItemComponents
    plugSets: PlugSets
}

/**
 * The perk sockets of an artifact, by tier (each tier also takes the perks of the tiers below), with the perks
 * unlocked for each socket and those not unlocked yet. The reset socket is left out.
 */
export const getEditableArtifactSockets = (
    definition: ItemDefinition | undefined,
    { itemInstanceId, characterId, itemComponents, plugSets }: EditableArtifactContext
) => {
    const optionsBySocket: Record<number, number[]> = {};
    const lockedBySocket: Record<number, number[]> = {};
    if (!definition?.sockets) return { tiers: [], optionsBySocket, lockedBySocket };
    const { socketEntries, socketCategories } = definition.sockets;
    const context = { definition, itemInstanceId, characterId, itemComponents, plugSets };
    const tiers = socketCategories
        .map((category) => ({
            categoryHash: category.socketCategoryHash,
            socketIndexes: category.socketIndexes.filter((socketIndex) => {
                if (socketEntries[socketIndex]?.socketTypeHash === ARTIFACT_RESET_SOCKET_TYPE) return false;
                optionsBySocket[socketIndex] = getAvailablePlugs(socketIndex, context);
                lockedBySocket[socketIndex] = getLockedPlugs(socketIndex, optionsBySocket[socketIndex], context);
                return true;
            }),
        }))
        .filter((tier) => tier.socketIndexes.length > 0);
    return { tiers, optionsBySocket, lockedBySocket };
};

/**
 * Orders the insertions that give the artifact its desired perks. A perk can only be slotted once, so the perks
 * that move to another socket are taken out first.
 */
export const planArtifactChanges = (
    definition: ItemDefinition,
    socketIndexes: number[],
    current: (number | undefined)[],
    desired: Record<number, number>
): PlugInsertion[] => {
    const steps: PlugInsertion[] = [];
    const state = [...current];
    const insert = (socketIndex: number, plugHash: number | undefined) => {
        if (!plugHash || state[socketIndex] === plugHash) return;
        steps.push({ socketIndex, plugHash });
        state[socketIndex] = plugHash;
    };
    const changed = socketIndexes.filter((socketIndex) => desired[socketIndex] && desired[socketIndex] !== state[socketIndex]);
    const moving = new Set(changed.map((socketIndex) => desired[socketIndex]));
    changed.forEach((socketIndex) => {
        const plug = state[socketIndex];
        if (!isEmptyPlug(definition, socketIndex, plug) && moving.has(plug!)) insert(socketIndex, getEmptyPlug(definition, socketIndex));
    });
    changed.forEach((socketIndex) => insert(socketIndex, desired[socketIndex]));
    return steps;
};
