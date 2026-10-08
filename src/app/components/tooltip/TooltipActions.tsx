"use client";

import { useState } from "react";
import Image from "next/image";
import useTransferItem from "@/lib/hooks/useTransferItem";
import useItemLock from "@/lib/hooks/useItemLock";
import usePullFromPostmaster from "@/lib/hooks/usePullFromPostmaster";
import { useProfile } from "@/lib/hooks/useProfile";
import { ItemKind } from "@/lib/helpers/item-sockets";
import { BUCKETS } from "@/lib/constants";
import { Character, ClassDefinitions, ItemDefinition } from "@/lib/types";

interface TooltipActionsProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    kind: ItemKind;
    characterId: string;
    characters: Record<string, Character>;
    classDefinitions: ClassDefinitions;
}

const ANY_CLASS = 3;

const CharacterButton = ({ character, label, disabled, onClick }: { character: Character, label: string, disabled: boolean, onClick: () => void }) => (
    <button
        className="transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-40"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
    >
        <Image src={`${character.classHash}.svg`} height={32} width={32} alt="" />
    </button>
);

const ActionLabel = ({ children }: { children: string }) => (
    <span className="w-16 shrink-0 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">{children}</span>
);

const TooltipActions = ({ item, itemInstanceId, kind, characterId, characters, classDefinitions }: TooltipActionsProps) => {
    const { transfer, equip, locateItem } = useTransferItem();
    const { canLock, locked, pending: lockPending, toggleLock } = useItemLock(itemInstanceId);
    const pull = usePullFromPostmaster();
    const { characterInventories } = useProfile();
    const [busy, setBusy] = useState(false);

    const gear = kind === "weapon" || kind === "armor";
    const located = locateItem(itemInstanceId);
    // Vault items are shown with the current character id, so resolve where the item really is
    const location = located.location ?? characterId;

    const postmasterItem = location !== "vault"
        ? characterInventories[location]?.items.find((i) => i.bucketHash === BUCKETS.POSTMASTER
            && (itemInstanceId ? i.itemInstanceId === itemInstanceId : i.itemHash === item.hash))
        : undefined;

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await action();
        } finally {
            setBusy(false);
        }
    };

    const className = (character: Character) => classDefinitions[character.classHash]?.displayProperties?.name ?? "character";
    const classAllowed = (character: Character) => item.classType === undefined || item.classType === ANY_CLASS || item.classType === character.classType;
    const allCharacters = Object.values(characters);
    const equipTargets = gear && itemInstanceId
        ? allCharacters.filter((c) => classAllowed(c) && !(located.equipped && located.location === c.characterId))
        : [];
    const transferTargets = allCharacters.filter((c) => c.characterId !== location);

    const links = [
        { label: "light.gg", href: `https://www.light.gg/db/items/${item.hash}` },
        ...(kind === "weapon" ? [
            { label: "Foundry", href: `https://d2foundry.gg/w/${item.hash}` },
            { label: "Gunsmith", href: `https://d2gunsmith.com/w/${item.hash}` },
        ] : []),
    ];

    return (
        <div className="flex w-full flex-col gap-2 border-t border-gray-500 p-2">
            {postmasterItem ? (
                <div className="flex flex-row items-center gap-2">
                    <ActionLabel>Postmaster</ActionLabel>
                    <button
                        className="rounded border border-white/30 px-3 py-1 text-sm transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-40"
                        disabled={busy}
                        onClick={() => run(() => pull(postmasterItem, location))}
                    >
                        Pull to {characters[location] ? className(characters[location]) : "inventory"}
                    </button>
                </div>
            ) : (
                <>
                    {equipTargets.length > 0 && (
                        <div className="flex flex-row items-center gap-2">
                            <ActionLabel>Equip</ActionLabel>
                            {equipTargets.map((c) => (
                                <CharacterButton
                                    key={c.characterId}
                                    character={c}
                                    label={`Equip on ${className(c)}`}
                                    disabled={busy}
                                    onClick={() => run(() => equip({ itemHash: item.hash, itemInstanceId: itemInstanceId!, characterId: c.characterId }))}
                                />
                            ))}
                        </div>
                    )}
                    <div className="flex flex-row items-center gap-2">
                        <ActionLabel>Transfer</ActionLabel>
                        {transferTargets.map((c) => (
                            <CharacterButton
                                key={c.characterId}
                                character={c}
                                label={`Transfer to ${className(c)}`}
                                disabled={busy}
                                onClick={() => run(() => transfer({ itemHash: item.hash, itemInstanceId, toId: c.characterId, fromId: location }))}
                            />
                        ))}
                        {location !== "vault" && (
                            <button
                                className="transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-40"
                                disabled={busy}
                                onClick={() => run(() => transfer({ itemHash: item.hash, itemInstanceId, toId: "vault", fromId: location }))}
                                title="Transfer to the vault"
                                aria-label="Transfer to the vault"
                            >
                                <Image src="vault2.svg" height={32} width={32} alt="" />
                            </button>
                        )}
                        {gear && canLock && (
                            <button
                                className={`ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50 ${locked ? "text-white" : "text-gray-400"}`}
                                onClick={toggleLock}
                                disabled={lockPending}
                                title={locked ? "Unlock" : "Lock"}
                                aria-label={locked ? "Unlock" : "Lock"}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <rect x="4" y="11" width="16" height="10" rx="2" fill={locked ? "currentColor" : "none"} />
                                    <path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.75-1.4"} />
                                </svg>
                            </button>
                        )}
                    </div>
                </>
            )}
            {gear && (
                <div className="flex flex-row flex-wrap items-center gap-1.5">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-sm bg-white/10 px-2 py-0.5 text-xs text-gray-300 transition-colors hover:bg-white/20 hover:text-white"
                        >
                            {link.label} ↗
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TooltipActions;
