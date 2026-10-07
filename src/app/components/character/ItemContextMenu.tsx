"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import useTransferItem from "@/lib/hooks/useTransferItem";
import Image from "next/image";

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
    const { characters } = useProfile();
    const { classDefinitions } = useDefinitions();
    const { transfer, locateItem } = useTransferItem();

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

    // Vault items are shown with the current character id, so resolve where the item really is
    const location = locateItem(itemInstanceId).location ?? characterId;

    const handleTransfer = (targetCharacterId: string) => {
        onClose();
        transfer({ itemHash, itemInstanceId, toId: targetCharacterId, fromId: location });
    };

    // Only opened by a right click, so it never renders on the server and `document` is there
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
                    .filter((c) => c.characterId !== location)
                    .map((c) => (
                        <button
                            key={c.characterId}
                            className="flex items-center w-full text-left px-3 py-2 text-sm text-white hover:bg-[#3a3a50] transition-colors"
                            onClick={() => handleTransfer(c.characterId)}
                        >
                            <Image
                                src={`/${c.classHash}.svg`} // Use class icon
                                height={20}
                                width={20}
                                className="h-5 w-5 mr-2"
                                alt={classDefinitions[c.classHash].displayProperties.name}
                            />
                            {classDefinitions[c.classHash].displayProperties.name}
                        </button>
                    ))}

                {location !== "vault" && (
                    <>
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm text-white hover:bg-[#3a3a50] transition-colors"
                            onClick={() => handleTransfer("vault")}
                        >
                            <Image
                                src="/vault2.svg"
                                height={20}
                                width={20}
                                className="h-5 w-5 mr-2"
                                alt="Vault"
                            />
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
