"use client";

import { pullFromPostmaster } from "@/lib/bungie";
import { BUCKETS } from "@/lib/constants";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { Item } from "@/lib/types";
import { useDefinitions } from "./useDefinitions";
import { useProfile } from "./useProfile";

/** Pulls an item from a character's postmaster into their inventory, reporting progress through notifications. */
const usePullFromPostmaster = () => {
    const { itemDefinitions } = useDefinitions();
    const { addNotification, updateNotification } = useNotifications();
    const { user, moveItem } = useProfile();

    return async (item: Item, characterId: string): Promise<boolean> => {
        const definition = itemDefinitions[item.itemHash];
        const name = definition?.displayProperties?.name || "Item";
        const icon = `https://www.bungie.net${definition?.displayProperties?.icon || ""}`;
        const quantity = item.quantity ?? 1;

        const notificationId = addNotification(`Collecting ${name}...`, "Pulling item from Postmaster", "info", icon, 3000, true);
        try {
            await pullFromPostmaster(user.membershipType, characterId, item.itemHash, item.itemInstanceId, quantity);
            if (definition) {
                moveItem(
                    item.itemHash,
                    item.itemInstanceId,
                    characterId,
                    characterId,
                    quantity,
                    { bucketHash: definition.inventory?.bucketTypeHash || BUCKETS.GENERAL },
                    BUCKETS.POSTMASTER // Take the stack from the postmaster, not a matching stack already in the inventory
                );
            }
            updateNotification(notificationId, `Collected ${name}`, "", "success", icon, 5000, false);
            return true;
        } catch (error) {
            updateNotification(notificationId, `Error collecting ${name}`, error instanceof Error ? error.message : "", "error", icon, 5000, false);
            return false;
        }
    };
};

export default usePullFromPostmaster;
