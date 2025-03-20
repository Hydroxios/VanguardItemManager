"use client";

import { useEffect, useState } from "react";

interface SearchButtonProps {
  itemDefinition :any;
  classDefinition :any
  itemInstances :any
  characterEquipements :any;
  characterInventories :any;
  profileInventory :any;
  characters :any;
}

const SearchButton = ({
  itemDefinition,
  classDefinition,
  characterEquipements,
  characterInventories,
  profileInventory,
  characters,
}: SearchButtonProps) => {
  const [open, setOpen] = useState(false);

  const [results, setResults] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => handleSearch(search), [characters]);
  const handleSearch = (search: string) => {
    setSearch(search);
    const res: any[] = [];
    if (search.length > 0) {
      Object.keys(characterEquipements).map((char: any) => {
        characterEquipements[char].items.map((item: any) => {
          if (item.itemInstanceId) {
            const i = itemDefinition[item.itemHash];
            if (
              i.displayProperties.name
                .toLowerCase()
                .trim()
                .includes(search.toLowerCase())
            ) {
              res.push({
                item: i,
                location: classDefinition[characters[char].classHash].displayProperties.name,
                itemInstanceId: item.itemInstanceId,
                characterId: char,
                state: item.state
              });
            }
          }
        });
      });
      Object.keys(characterInventories).map((char: any) => {
        characterInventories[char].items.map((item: any) => {
          if (item.itemInstanceId) {
            const i = itemDefinition[item.itemHash];
            if (
              i.displayProperties.name
                .toLowerCase()
                .includes(search.toLowerCase())
            ) {
              res.push({
                item: i,
                location: classDefinition[characters[char].classHash].displayProperties.name,
                itemInstanceId: item.itemInstanceId,
                characterId: char,
                state: item.state
              });
            }
          }
        });
      });
      profileInventory.map((item: any) => {
        if (item.itemInstanceId) {
          const i = itemDefinition[item.itemHash];
          if (
            i.displayProperties.name
              .toLowerCase()
              .includes(search.toLowerCase())
          ) {
            res.push({
              item: i,
              location: "Vault",
              itemInstanceId: item.itemInstanceId,
              state: item.state
            });
          }
        }
      });
    }
    setResults(() => res);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    item: any
  ) => {
    event.dataTransfer.setData(
      "text/plain",
      "st:" +
        item.item.hash +
        ":" +
        item.itemInstanceId +
        (item.characterId ? ":" + item.characterId : "")
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="p-2 rounded bg-opacity-80 bg-[rgba(10,10,20,0.8)] border border-[rgb(138,138,138)] shadow-[0_0_10px_rgba(255,106,0,0.3),0_0_20px_rgba(30,144,255,0.2),inset_0_0_8px_rgba(255,255,255,0.15)] backdrop-blur-sm z-50 hover:bg-opacity-90 transition-all flex flex-col gap-4 items-center max-w-[400px] overflow-auto">
      <div className="flex flex-row gap-4">
        <img
          src={"./loupe.svg"}
          height={24}
          width={24}
          onClick={() => {
            setResults(() => []);
            setOpen(!open);
          }}
        />
        <input
          type="text"
          placeholder="Search..."
          className="p-2 rounded bg-transparent h-[24px]"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <div className="flex flex-col gap-2" style={{ width: "100%" }}>
          {results
            .filter((i) => i.item.displayProperties.icon)
            .slice(0, 5)
            .map((result: any, index) => (
              <div
                key={index}
                className="flex flex-row gap-4 items-center border-t border-gray-500 pt-2"
                draggable
                onDragStart={(e) => handleDragStart(e, result)}
              >
                <img
                  src={
                    "https://bungie.net" + result.item.displayProperties.icon
                  }
                  alt=""
                  height={32}
                  width={32}
                  style={{
                    border: "1px solid " + (result.state & 4 ? "#FFBB00" : (result.state & 8 ? "red" : "white"))
                  }}
                />
                <div className="text-left">
                  <div>{result.item.displayProperties.name}</div>
                  <div className="text-sm text-gray-500">
                    {result.location ?? "Unknown"}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default SearchButton;
