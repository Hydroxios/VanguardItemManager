"use client";

import { useState } from "react";
import { insertSocketPlugFree } from "@/lib/bungie";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { ItemDefinition } from "@/lib/types";
import { useProfile } from "./useProfile";
import useTransferItem from "./useTransferItem";

/**
 * Inserts plugs (perks...) in an item's sockets. Bungie only does it for free plugs, on items a character holds:
 * `canChange` is false in the vault.
 */
const useSocketPlug = (itemInstanceId?: string) => {
    const { user, itemComponents, setItemComponentsLocally } = useProfile();
    const { addNotification } = useNotifications();
    const { locateItem } = useTransferItem();
    const [pendingSocket, setPendingSocket] = useState<number>();

    const location = locateItem(itemInstanceId).location;
    const characterId = location && location !== "vault" ? location : undefined;

    const insertPlug = async (socketIndex: number, plug: ItemDefinition) => {
        if (!itemInstanceId || !characterId || pendingSocket !== undefined) return;
        setPendingSocket(socketIndex);
        try {
            const changed = await insertSocketPlugFree(user.membershipType, characterId, itemInstanceId, socketIndex, plug.hash);
            // Bungie sends the item back with its new sockets and stats; when it doesn't, at least show the new perk
            const current = itemComponents.sockets[itemInstanceId];
            const sockets = changed.sockets ?? (current && {
                ...current,
                sockets: current.sockets.map((socket, index) => index === socketIndex ? { ...socket, plugHash: plug.hash } : socket),
            });
            setItemComponentsLocally(itemInstanceId, { ...changed, sockets });
        } catch (error) {
            const icon = plug.displayProperties.icon ? `https://www.bungie.net${plug.displayProperties.icon}` : "";
            addNotification(`Could not select ${plug.displayProperties.name}`, error instanceof Error ? error.message : "", "error", icon, 5000, false);
        } finally {
            setPendingSocket(undefined);
        }
    };

    return { canChange: !!characterId, pendingSocket, insertPlug };
};

export default useSocketPlug;
