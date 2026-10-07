import { Item } from "@/lib/types";

export interface InventoryState {
    profileInventory: Item[]
    characterInventories: Record<string, { items: Item[] }>
    characterEquipment: Record<string, { items: Item[] }>
}

export interface ItemMove {
    itemHash: number
    itemInstanceId: string | undefined
    fromId: string
    toId: string
    quantity: number
    updates?: Partial<Item>
    sourceBucketHash?: number
}

const VAULT_LOCATION = 2;
const CHARACTER_LOCATION = 1;

/**
 * Takes an item (or part of a stack) out of a list. Instanced items match by instance id only;
 * stacks match by hash, and by bucket when one is given. The list is returned unchanged when nothing matches.
 */
export const takeItem = (items: Item[], { itemHash, itemInstanceId, quantity, sourceBucketHash }: Pick<ItemMove, "itemHash" | "itemInstanceId" | "quantity" | "sourceBucketHash">) => {
    const index = itemInstanceId && itemInstanceId !== "0"
        ? items.findIndex((i) => i.itemInstanceId === itemInstanceId)
        : items.findIndex((i) => i.itemHash === itemHash && !i.itemInstanceId && (sourceBucketHash === undefined || i.bucketHash === sourceBucketHash));
    if (index === -1) return { item: undefined, items };

    const item = { ...items[index] };
    const remaining = [...items];
    if (item.quantity > quantity) {
        item.quantity = quantity;
        remaining[index] = { ...remaining[index], quantity: remaining[index].quantity - quantity };
    } else {
        remaining.splice(index, 1);
    }
    return { item, items: remaining };
};

/** Adds an item to a list, merging it into an existing stack of the same item and bucket. */
export const putItem = (items: Item[], item: Item): Item[] => {
    const stackIndex = item.itemInstanceId
        ? -1
        : items.findIndex((i) => i.itemHash === item.itemHash && !i.itemInstanceId && i.bucketHash === item.bucketHash);
    if (stackIndex === -1) return [...items, item];
    const merged = [...items];
    merged[stackIndex] = { ...merged[stackIndex], quantity: merged[stackIndex].quantity + item.quantity };
    return merged;
};

/**
 * Applies a transfer to the inventories, as the game will once Bungie accepts it. The source is the vault or a
 * character's inventory, then its equipment. Lists that don't change keep their reference.
 * `movedItem` is undefined when the item isn't found, and the state is then returned as is.
 */
export const moveItemInState = (state: InventoryState, move: ItemMove): { state: InventoryState, movedItem?: Item } => {
    const { fromId, toId, updates } = move;
    let { profileInventory, characterInventories, characterEquipment } = state;
    let taken: Item | undefined;

    if (fromId === "vault") {
        const result = takeItem(profileInventory, move);
        taken = result.item;
        profileInventory = result.items;
    } else {
        const fromInventory = takeItem(characterInventories[fromId]?.items ?? [], move);
        taken = fromInventory.item;
        if (taken) {
            characterInventories = { ...characterInventories, [fromId]: { items: fromInventory.items } };
        } else {
            const fromEquipment = takeItem(characterEquipment[fromId]?.items ?? [], move);
            taken = fromEquipment.item;
            if (taken) characterEquipment = { ...characterEquipment, [fromId]: { items: fromEquipment.items } };
        }
    }

    if (!taken) return { state };

    const movedItem = { ...taken, ...updates, location: toId === "vault" ? VAULT_LOCATION : CHARACTER_LOCATION };
    if (toId === "vault") {
        profileInventory = putItem(profileInventory, movedItem);
    } else {
        characterInventories = { ...characterInventories, [toId]: { items: putItem(characterInventories[toId]?.items ?? [], movedItem) } };
    }

    return { state: { profileInventory, characterInventories, characterEquipment }, movedItem };
};
