"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { safeTransferItem, transferItem } from "@/lib/bungie";
import { useNotifications } from "@/app/components/NotificationsProvider";
import useAuth from "@/lib/hooks/useAuth";

interface ItemContextMenuProps {
    itemHash: number;
    itemInstanceId: string;
    characterId: string;
    onClose: () => void;
    position: { x: number; y: number };
}

const ItemContextMenu = ({
    itemHash,
    itemInstanceId,
    characterId,
    onClose,
    position,
}: ItemContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { characters, user, moveItem, transferEquippedItem, itemComponents } = useProfile();
    const { token } = useAuth();
    const { classDefinitions, itemDefinitions } = useDefinitions();
    const { addNotification, updateNotification } = useNotifications();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    const handleTransfer = async (targetCharacterId: string) => {
        onClose();
        const notificationId = addNotification(
            "Transferring item...",
            itemDefinitions[itemHash].displayProperties.name,
            "info",
            "",
            3000,
            true
        );

        try {
            const isEquipped = itemComponents.instances[itemInstanceId]?.isEquipped;

            if (isEquipped) {
                const replacementItem = await safeTransferItem(
                    token as string,
                    user.membershipType,
                    itemHash,
                    itemInstanceId,
                    characterId,
                    targetCharacterId,
                    user.membershipId,
                    itemDefinitions
                );

                if (replacementItem) {
                    transferEquippedItem(
                        itemHash,
                        itemInstanceId,
                        characterId,
                        targetCharacterId,
                        replacementItem.itemInstanceId
                    );
                } else {
                    moveItem(itemHash, itemInstanceId, characterId, targetCharacterId, 1);
                }
            } else {
                // Not equipped, direct transfer
                if (targetCharacterId === "vault") {
                    await transferItem(token as string, user.membershipType, itemHash, itemInstanceId, characterId, true);
                    moveItem(itemHash, itemInstanceId, characterId, "vault", 1);
                } else {
                    // To another character
                    await transferItem(token as string, user.membershipType, itemHash, itemInstanceId, characterId, true);
                    await transferItem(token as string, user.membershipType, itemHash, itemInstanceId, targetCharacterId, false);
                    moveItem(itemHash, itemInstanceId, characterId, targetCharacterId, 1);
                }
            }

            updateNotification(
                notificationId,
                "Item transferred",
                itemDefinitions[itemHash].displayProperties.name,
                "success",
                "https://www.bungie.net" + itemDefinitions[itemHash].displayProperties.icon,
                5000,
                false
            );
        } catch (error: any) {
            updateNotification(
                notificationId,
                "Transfer failed",
                error.message,
                "error",
                "",
                5000,
                false
            );
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[1010] bg-[#1a1a2e] border border-[#7e57c2] rounded-md shadow-lg overflow-hidden min-w-40 animate-fade-in"
            style={{
                top: position.y,
                left: position.x,
            }}
        >
            <div className="bg-[#2a2a40] py-2 px-3 border-b border-[#7e57c2] font-medium text-sm text-white">
                Fast Transfer
            </div>
            <div className="py-1">
                {Object.values(characters)
                    .filter((c: any) => c.characterId !== characterId)
                    .map((c: any) => (
                        <button
                            key={c.characterId}
                            className="flex items-center w-full text-left px-3 py-2 text-sm text-white hover:bg-[#3a3a50] transition-colors"
                            onClick={() => handleTransfer(c.characterId)}
                        >
                            <img
                                src={`/${c.classHash}.svg`} // Use class icon
                                className="h-5 w-5 mr-2"
                                alt={classDefinitions[c.classHash].displayProperties.name}
                            />
                            {classDefinitions[c.classHash].displayProperties.name}
                        </button>
                    ))}

                {characterId !== "vault" && (
                    <>
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm text-white hover:bg-[#3a3a50] transition-colors"
                            onClick={() => handleTransfer("vault")}
                        >
                            <img src="/vault2.svg" className="h-5 w-5 mr-2" alt="Vault" />
                            Vault
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ItemContextMenu;
