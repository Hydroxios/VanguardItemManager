import { safeTransferItem, transferItem } from "@/lib/bungie";
import { ItemDefinition, useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import Image from "next/image";
import { useNotifications } from "../NotificationsProvider";

interface TooltipActionsProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: any;
    characterId: string;
    characters: any;
    token: string | null;
    user: any;
    classDefinitions: any;
    drawTransfert: boolean;
    armor: boolean;
    moveItem: (itemHash: number, itemInstanceId: string, fromId: string, toId: string, quantity: number) => void;
}

const TooltipActions = ({
    item,
    itemInstanceId,
    itemComponents,
    characterId,
    characters,
    token,
    user,
    classDefinitions,
    drawTransfert,
    armor,
    moveItem,
}: TooltipActionsProps) => {
    const { itemDefinitions } = useDefinitions();
    const { transferEquippedItem } = useProfile();

    const { addNotification, updateNotification } = useNotifications()

    if (!drawTransfert) return null;

    return (
        <div
            className="flex flex-row p-2 items-center justify-between border-t border-gray-500"
            style={{ width: "100%" }}
        >
            <div className="flex flex-row gap-2">
                {Object.values(characters)
                    .filter((c: any) => c.characterId !== characterId)
                    .map((c: any) => (
                        <button
                            key={c.characterId}
                            className="hover:opacity-80 transition-opacity"
                            onClick={async () => {
                                const notificationId = addNotification(
                                    "Transferring item...",
                                    item.displayProperties.name,
                                    "info",
                                    "",
                                    5000,
                                    true
                                );
                                if (itemComponents.instances[itemInstanceId!]?.isEquipped) {
                                    const replacementItem = await safeTransferItem(
                                        token as string,
                                        user.membershipType,
                                        item.hash,
                                        itemInstanceId!,
                                        characterId,
                                        c.characterId,
                                        user.membershipId,
                                        itemDefinitions
                                    );
                                    if (replacementItem) {
                                        transferEquippedItem(item.hash, itemInstanceId!, characterId, c.characterId, replacementItem.itemInstanceId);
                                    } else {
                                        moveItem(item.hash, itemInstanceId!, characterId, c.characterId, 1);
                                    }
                                } else {
                                    await transferItem(
                                        token as string,
                                        user.membershipType,
                                        item.hash,
                                        itemInstanceId!,
                                        characterId,
                                        true
                                    );
                                    await transferItem(
                                        token as string,
                                        user.membershipType,
                                        item.hash,
                                        itemInstanceId!,
                                        c.characterId,
                                        false
                                    );
                                    moveItem(item.hash, itemInstanceId!, characterId, c.characterId, 1);
                                }

                                updateNotification(
                                    notificationId,
                                    "Item transfered to your " +
                                    classDefinitions[c.classHash].displayProperties.name,
                                    item.displayProperties.name,
                                    "success",
                                    "https://www.bungie.net" + item.displayProperties.icon,
                                    5000
                                );
                                // refresh();
                                // moveItem(item.hash, itemInstanceId!, characterId, c.characterId, 1);
                            }}
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
                <button
                    className="hover:opacity-80 transition-opacity"
                    onClick={async () => {
                        const notificationId = addNotification(
                            "Transferring item...",
                            item.displayProperties.name,
                            "info",
                            "",
                            5000,
                            true
                        );
                        const replacementItem = await safeTransferItem(
                            token as string,
                            user.membershipType,
                            item.hash,
                            itemInstanceId!,
                            characterId,
                            "vault",
                            user.membershipId,
                            itemDefinitions
                        );
                        if (replacementItem) {
                            transferEquippedItem(item.hash, itemInstanceId!, characterId, "vault", replacementItem.itemInstanceId);
                        } else {
                            moveItem(item.hash, itemInstanceId!, characterId, "vault", 1);
                        }
                        updateNotification(
                            notificationId,
                            "Item transfered to your vault",
                            item.displayProperties.name,
                            "success",
                            "https://www.bungie.net" + item.displayProperties.icon,
                            5000
                        );
                        // refresh();
                        // moveItem(item.hash, itemInstanceId!, characterId, "vault", 1);
                    }}
                >
                    <Image src="vault2.svg" height={32} width={32} alt="Vault" />
                </button>
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
