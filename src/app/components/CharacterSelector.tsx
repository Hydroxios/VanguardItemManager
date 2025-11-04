"use client";

import { Character } from "@/lib/bungie";
import React, { useCallback, useState } from "react";
import { useNotifications } from "./NotificationsProvider";

import { safeTransferItem, transferItem } from "@/lib/bungie";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import useAuth from "@/lib/hooks/useAuth";

interface CharacterSelectorProps {
  onSelectCharacter: (characterId: string) => void;
}

const CharacterSelector = ({
  onSelectCharacter,
}: CharacterSelectorProps) => {

  
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

  const { addNotification } = useNotifications()
  const { itemDefinitions, classDefinitions, raceDefinitions } = useDefinitions()

  const {token} = useAuth()
  const { user, refresh, characters } = useProfile()

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId);
    onSelectCharacter(characterId);
  };

  const handleDrop = useCallback(async (event :React.DragEvent, characterId :string) => {
    event.preventDefault();
    let data = event.dataTransfer.getData("text/plain");
    
    if (data.startsWith("st:")) {
      data = data.replace("st:", "");
      const args = data.split(":");
      
      try {
        if (args.length > 2) {
          // Item is being transferred from another character
          // args[0] = itemHash, args[1] = itemInstanceId, args[2] = sourceCharacterId
          await safeTransferItem(
            token ?? "", 
            user.membershipType, 
            Number.parseInt(args[0]), 
            args[1], 
            args[2], 
            characterId, 
            user.membershipId
          );
        } else {
          // Item is being transferred from vault to character
          await transferItem(token ?? "", user.membershipType, Number.parseInt(args[0]), args[1], characterId, false);
        }
        await refresh();
        addNotification(
          `Transferred ${itemDefinitions[args[0]]?.displayProperties?.name || "item"}`,
          "Item moved to your character",
          "success",
          `https://www.bungie.net${itemDefinitions[args[0]]?.displayProperties?.icon || ""}`,
          3000
        );
      } catch (err: any) {
        addNotification(
          `Error while transferring ${itemDefinitions[args[0]]?.displayProperties?.name || "item"}!`, 
          err.message, 
          "error", 
          `https://www.bungie.net${itemDefinitions[args[0]]?.displayProperties?.icon || ""}`, 
          5000
        );
      }
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {Object.values(characters).map((character) => (
        <div
          key={character.characterId}
          className="flex flex-row items-center w-[350px] h-[60px] bg-gray-800 cursor-pointer relative box-breathing hover:backdrop-blur-lg transition-all duration-300"
          onClick={() => handleCharacterSelect(character.characterId)}
          style={{
            backgroundImage: `url(https://www.bungie.net${itemDefinitions[character.emblemHash].secondaryIcon})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} // Set emblem as background
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, character.characterId)}
        >
          {/* Remove the img tag as the emblem is now a background */}
          <div className="text-left p-1 ml-[60px]">
            <p>{classDefinitions[character.classHash].displayProperties.name}</p>
            <p>{raceDefinitions[character.raceHash].displayProperties.name}</p>
          </div>
          <p className="text-yellow-400 absolute top-0 right-0 m-2">✧ {character.light}</p>
        </div>
      ))}
    </div>
  );
};

export default CharacterSelector;
