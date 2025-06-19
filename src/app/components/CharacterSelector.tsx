"use client";

import { Character } from "@/lib/bungie";
import React, { useCallback, useState } from "react";
import { useNotifications } from "./NotificationsProvider";

import { safeTransferItem, transferItem } from "@/lib/bungie";

interface CharacterSelectorProps {
  token :string;
  membershipType :number;
  membershipId :string;
  itemDefinitions: any;
  characters: any[];
  classDefinition :any
  raceDefinition :any
  onSelectCharacter: (characterId: string) => void;
  refresh: () => Promise<void>;
}

const CharacterSelector = ({
  token,
  membershipType,
  membershipId,
  itemDefinitions,
  characters,
  classDefinition,
  raceDefinition,
  onSelectCharacter,
  refresh
}: CharacterSelectorProps) => {

  const { addNotification } = useNotifications()

  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

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
            token, 
            membershipType, 
            args[0], 
            args[1], 
            args[2], 
            characterId, 
            membershipId
          );
        } else {
          // Item is being transferred from vault to character
          await transferItem(token, membershipType, args[0], args[1], characterId, false);
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
      {characters.map((character: Character) => (
        <div
          key={character.characterId}
          className="flex flex-row items-center w-[350px] h-[60px] bg-gray-800 border border-gray-600 rounded-lg cursor-pointer relative box-breathing"
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
          <div className="text-left p-1" style={{ marginLeft: '60px' }}>
            <p>{classDefinition[character.classHash].displayProperties.name}</p>
            <p>{raceDefinition[character.raceHash].displayProperties.name}</p>
          </div>
          <p className="text-yellow-400 absolute top-0 right-0 m-2">✧ {character.light}</p>
        </div>
      ))}
    </div>
  );
};

export default CharacterSelector;
