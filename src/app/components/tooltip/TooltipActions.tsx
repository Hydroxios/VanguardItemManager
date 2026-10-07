import { ItemDefinition } from "@/lib/hooks/useDefinitions";
import useTransferItem from "@/lib/hooks/useTransferItem";
import Image from "next/image";

interface TooltipActionsProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    characterId: string;
    characters: any;
    classDefinitions: any;
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
                    .filter((c: any) => c.characterId !== location)
                    .map((c: any) => (
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
