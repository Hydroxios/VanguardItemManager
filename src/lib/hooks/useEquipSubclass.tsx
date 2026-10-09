"use client";

import { useCallback } from "react";
import { equipItem } from "@/lib/bungie";
import { ITEM_TYPES } from "@/lib/constants";
import { statsWithSubclassChange } from "@/lib/helpers/stats";
import { useDefinitions } from "./useDefinitions";
import { useProfile } from "./useProfile";

/**
 * Equips a subclass on a character, then updates the equipment and the character's stats locally: the fragments of
 * the new subclass replace those of the old one. No refresh, as Bungie serves a cached profile for a while after a
 * change, which would undo the local update. Throws when Bungie refuses.
 */
const useEquipSubclass = (characterId: string) => {
    const { user, characters, characterEquipment, itemComponents, equipItemLocally, setCharacterStatsLocally } = useProfile();
    const { itemDefinitions } = useDefinitions();

    /** `plugHashes`: the new subclass's plugs, when they changed since the profile was read (applied just before). */
    return useCallback(async (itemInstanceId: string, plugHashes?: (number | undefined)[]) => {
        await equipItem(user.membershipType, characterId, itemInstanceId);

        const plugsOf = (instanceId: string) => (itemComponents.sockets[instanceId]?.sockets ?? []).map((socket) => socket.plugHash);
        const previous = characterEquipment[characterId]?.items
            .find((item) => itemDefinitions[item.itemHash]?.itemType === ITEM_TYPES.SUBCLASS);
        equipItemLocally(characterId, itemInstanceId);

        const character = characters[characterId];
        if (character && previous) {
            setCharacterStatsLocally(characterId, statsWithSubclassChange(
                character.stats, plugsOf(previous.itemInstanceId), plugHashes ?? plugsOf(itemInstanceId), itemDefinitions, character.classType
            ));
        }
    }, [user, characterId, characters, characterEquipment, itemComponents, itemDefinitions, equipItemLocally, setCharacterStatsLocally]);
};

export default useEquipSubclass;
