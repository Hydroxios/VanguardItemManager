"use client";

import { safeTransferItem, transferItem } from "@/lib/bungie";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { useDefinitions } from "./useDefinitions";
import { useProfile } from "./useProfile";
import useAuth from "./useAuth";

export interface TransferRequest {
    itemHash: number
    itemInstanceId?: string
    /** Destination: a character id or "vault" */
    toId: string
    /** Where the item is, used for stacks that can't be located by instance id */
    fromId?: string
    quantity?: number
}

/**
 * Single entry point for moving an item between characters and the vault.
 * Finds where the item really is, unequips it when needed, updates the local
 * state and reports progress and errors through notifications.
 */
const useTransferItem = () => {
    const { token } = useAuth();
    const { itemDefinitions } = useDefinitions();
    const { addNotification, updateNotification } = useNotifications();
    const { user, profileInventory, characterInventories, characterEquipment, moveItem, transferEquippedItem } = useProfile();

    /** Returns "vault", a character id, or undefined when the instance isn't found. */
    const locateItem = (itemInstanceId?: string): { location?: string, equipped: boolean } => {
        if (!itemInstanceId || itemInstanceId === "0") return { equipped: false };
        if (profileInventory.some(i => i.itemInstanceId === itemInstanceId)) return { location: "vault", equipped: false };
        for (const [charId, eq] of Object.entries(characterEquipment)) {
            if (eq.items.some(i => i.itemInstanceId === itemInstanceId)) return { location: charId, equipped: true };
        }
        for (const [charId, inv] of Object.entries(characterInventories)) {
            if (inv.items.some(i => i.itemInstanceId === itemInstanceId)) return { location: charId, equipped: false };
        }
        return { equipped: false };
    };

    const transfer = async ({ itemHash, itemInstanceId, toId, fromId, quantity = 1 }: TransferRequest): Promise<boolean> => {
        const located = locateItem(itemInstanceId);
        const sourceId = located.location ?? fromId;
        if (!sourceId || sourceId === toId) return false;

        const definition = itemDefinitions[itemHash];
        const name = definition?.displayProperties?.name ?? "item";
        const icon = definition?.displayProperties?.icon ? `https://www.bungie.net${definition.displayProperties.icon}` : "";
        const instanceId = itemInstanceId || "0";

        const notificationId = addNotification("Transferring item...", name, "info", icon, 5000, true);

        try {
            if (sourceId === "vault") {
                await transferItem(token as string, user.membershipType, itemHash, instanceId, toId, false, quantity);
                moveItem(itemHash, itemInstanceId, "vault", toId, quantity);
            } else if (located.equipped) {
                const replacementItem = await safeTransferItem(token as string, user.membershipType, itemHash, instanceId, sourceId, toId, user.membershipId, itemDefinitions);
                if (replacementItem) {
                    transferEquippedItem(itemHash, instanceId, sourceId, toId, replacementItem.itemInstanceId);
                } else {
                    moveItem(itemHash, itemInstanceId, sourceId, toId, quantity);
                }
            } else {
                await transferItem(token as string, user.membershipType, itemHash, instanceId, sourceId, true, quantity);
                if (toId !== "vault") {
                    try {
                        await transferItem(token as string, user.membershipType, itemHash, instanceId, toId, false, quantity);
                    } catch (error) {
                        // The first hop succeeded, so the item now sits in the vault
                        moveItem(itemHash, itemInstanceId, sourceId, "vault", quantity);
                        throw error;
                    }
                }
                moveItem(itemHash, itemInstanceId, sourceId, toId, quantity);
            }

            updateNotification(notificationId, toId === "vault" ? "Item transferred to vault" : "Item transferred", name, "success", icon, 5000, false);
            return true;
        } catch (error) {
            updateNotification(
                notificationId,
                `Error while transferring ${name}!`,
                error instanceof Error ? error.message : undefined,
                "error",
                icon,
                5000,
                false
            );
            return false;
        }
    };

    return { transfer, locateItem };
};

export default useTransferItem;
