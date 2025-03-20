"use client";

import { Character } from "@/lib/bungie";
import { useState } from "react";

interface CharacterSelectorProps {
  itemDefinitions: any;
  characters: any[];
  classDefinition :any
  raceDefinition :any
  onSelectCharacter: (characterId: string) => void;
}

const CharacterSelector = ({
  itemDefinitions,
  characters,
  classDefinition,
  raceDefinition,
  onSelectCharacter,
}: CharacterSelectorProps) => {

  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId);
    onSelectCharacter(characterId);
  };

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
