"use client";

import { useState } from "react";
import { setItemLockState } from "@/lib/bungie";
import { ITEM_STATE } from "@/lib/constants";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { useDefinitions } from "./useDefinitions";
import { useProfile } from "./useProfile";

/** Reads and toggles the lock of an instanced item, reporting errors through notifications. */
const useItemLock = (itemInstanceId?: string) => {
    const { itemDefinitions } = useDefinitions();
    const { addNotification } = useNotifications();
    const { user, characters, profileInventory, characterInventories, characterEquipment, setItemLockedLocally } = useProfile();
    const [pending, setPending] = useState(false);

    // Where the item is: its current state, and the character Bungie needs for the call (any of them for the vault)
    const located = (() => {
        if (!itemInstanceId) return undefined;
        const fromVault = profileInventory.find((i) => i.itemInstanceId === itemInstanceId);
        if (fromVault) return { item: fromVault, characterId: Object.keys(characters)[0] };
        for (const lists of [characterInventories, characterEquipment]) {
            for (const [characterId, { items }] of Object.entries(lists)) {
                const item = items.find((i) => i.itemInstanceId === itemInstanceId);
                if (item) return { item, characterId };
            }
        }
        return undefined;
    })();

    const locked = located ? (located.item.state & ITEM_STATE.LOCKED) !== 0 : false;

    const toggleLock = async () => {
        if (!located?.characterId || !itemInstanceId || pending) return;
        const definition = itemDefinitions[located.item.itemHash];
        const name = definition?.displayProperties?.name ?? "item";
        const icon = definition?.displayProperties?.icon ? `https://www.bungie.net${definition.displayProperties.icon}` : "";

        setPending(true);
        try {
            await setItemLockState(user.membershipType, located.characterId, itemInstanceId, !locked);
            setItemLockedLocally(itemInstanceId, !locked);
        } catch (error) {
            addNotification(`Error while ${locked ? "unlocking" : "locking"} ${name}!`, error instanceof Error ? error.message : "", "error", icon, 5000, false);
        } finally {
            setPending(false);
        }
    };

    return { canLock: !!located?.characterId, locked, pending, toggleLock };
};

export default useItemLock;
