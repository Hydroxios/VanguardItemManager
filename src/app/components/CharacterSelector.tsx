"use client";
import React, { useCallback, useState } from "react";
import useTransferItem from "@/lib/hooks/useTransferItem";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";

interface CharacterSelectorProps {
  onSelectCharacter: (characterId: string) => void;
}

const CharacterSelector = ({
  onSelectCharacter,
}: CharacterSelectorProps) => {

  // eslint-disable-next-line
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

  const { itemDefinitions, classDefinitions, raceDefinitions } = useDefinitions()

  const { characters } = useProfile()
  const { transfer } = useTransferItem()

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId);
    onSelectCharacter(characterId);
  };

  // Vault items are dragged as "st:hash:instanceId"
  const handleDrop = (event: React.DragEvent, characterId: string) => {
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    if (!data.startsWith("st:")) return;
    const [itemHash, itemInstanceId] = data.replace("st:", "").split(":");
    const hash = Number.parseInt(itemHash);
    if (Number.isNaN(hash)) return;
    transfer({ itemHash: hash, itemInstanceId: itemInstanceId !== "0" ? itemInstanceId : undefined, toId: characterId, fromId: "vault" });
  };

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {Object.values(characters).map((character) => (
        <div
          key={character.characterId}
          className="flex flex-row items-center w-[350px] h-[60px] bg-gray-800 cursor-pointer relative hover:backdrop-blur-lg transition-all duration-300 rounded-lg hover:transform hover:scale-105"
          onClick={() => handleCharacterSelect(character.characterId)}
          style={{
            backgroundImage: `url(https://www.bungie.net${itemDefinitions[character.emblemHash].secondaryIcon})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} // Set emblem as background
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, character.characterId)}
        >
          {/* Remove the Image tag as the emblem is now a background */}
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
