
import useTransferItem from "@/lib/hooks/useTransferItem";
import useItemLock from "@/lib/hooks/useItemLock";
import { ARMOR_SLOTS, WEAPON_SLOTS } from "@/lib/constants";
import Image from "next/image";
import { Character, ClassDefinitions, ItemDefinition } from "@/lib/types";

interface TooltipActionsProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    characterId: string;
    characters: Record<string, Character>;
    classDefinitions: ClassDefinitions;
    drawTransfert: boolean;
    armor: boolean;
}

const TooltipActions = ({
    item,
    itemInstanceId,
    characterId,
    characters,
    classDefinitions,
    drawTransfert,
    armor,
}: TooltipActionsProps) => {
    const { transfer, locateItem } = useTransferItem();
    const { canLock, locked, pending, toggleLock } = useItemLock(itemInstanceId);
    const slot = item.equippingBlock?.equipmentSlotTypeHash ?? 0;
    const lockable = canLock && (WEAPON_SLOTS.includes(slot) || ARMOR_SLOTS.includes(slot));

    if (!drawTransfert) return null;

    // Vault items are shown with the current character id, so resolve where the item really is
    const location = locateItem(itemInstanceId).location ?? characterId;

    return (
        <div
            className="flex flex-row p-2 items-center justify-between border-t border-gray-500"
            style={{ width: "100%" }}
        >
            <div className="flex flex-row gap-2">
                {Object.values(characters)
                    .filter((c) => c.characterId !== location)
                    .map((c) => (
                        <button
                            key={c.characterId}
                            className="hover:opacity-80 transition-opacity"
                            onClick={() => transfer({ itemHash: item.hash, itemInstanceId, toId: c.characterId, fromId: location })}
                        >
                            <Image
                                src={`${c.classHash}.svg`}
                                height={32}
                                width={32}
                                alt={classDefinitions[c.classHash].displayProperties.name}
                            />
                        </button>
                    ))}
            </div>
            <div className="flex flex-row gap-2">
                {lockable && (
                    <button
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50 ${locked ? "text-white" : "text-gray-400"}`}
                        onClick={toggleLock}
                        disabled={pending}
                        title={locked ? "Unlock" : "Lock"}
                        aria-label={locked ? "Unlock" : "Lock"}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="4" y="11" width="16" height="10" rx="2" fill={locked ? "currentColor" : "none"} />
                            <path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.75-1.4"} />
                        </svg>
                    </button>
                )}
                {location !== "vault" && (
                    <button
                        className="hover:opacity-80 transition-opacity"
                        onClick={() => transfer({ itemHash: item.hash, itemInstanceId, toId: "vault", fromId: location })}
                    >
                        <Image src="vault2.svg" height={32} width={32} alt="Vault" />
                    </button>
                )}
                {!armor && (
                    <button
                        className="hover:opacity-80 transition-opacity"
                        onClick={() =>
                            item && window.open(`https://d2foundry.gg/w/${item.hash}`)
                        }
                    >
                        <Image
                            src="https://d2foundry.gg/_next/image?url=%2Fassets%2Ffoundry_logo_pride.png&w=32&q=75"
                            className="rounded-lg"
                            height={32}
                            width={32}
                            alt="Light.gg"
                        />
                    </button>
                )}
            </div>
        </div>
    );
};

export default TooltipActions;
