"use client"

import Item from "../character/Item";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { useMemo, useState } from "react";
import useTransferItem from "@/lib/hooks/useTransferItem";
import { getDamageTypeIcon } from "@/lib/helpers/damage-type";
import Image from "next/image";
import { Item as ProfileItem, ItemDefinition, ItemPerks, ItemStats } from "@/lib/types";
import { findDupes, isEmptySearch, matchesSearch, parseSearch, SearchableItem } from "@/lib/search";

interface SearchResult {
  item: ItemDefinition;
  location: string;
  itemInstanceId: string;
  characterId: string;
  state: number;
  overrideStyleItemHash?: number;
  perks?: ItemPerks;
  stats?: ItemStats;
}

const typeBlacklist = [14, 24, 26, 17, 0, 16, 19, 25, 28, 29, 22, 21, 8, 12]

const SearchBar = ({ currentCharacterId, open, onClose }: { currentCharacterId?: string, open: boolean, onClose: () => void }) => {
  const [search, setSearch] = useState(""); // State for the search input value
  const [isFocused, setIsFocused] = useState(false); // State to track if the search bar is focused

  const { itemDefinitions, classDefinitions, perksDefinitions } = useDefinitions();
  const { // Destructure profile data
    characters,
    characterEquipment,
    characterInventories,
    itemComponents,
    profileInventory,
  } = useProfile();

  const { transfer } = useTransferItem();

  // Recomputed as you type and whenever items move, only while the search is shown
  const results = useMemo<SearchResult[]>(() => {
    if (!open || search.length === 0) return [];

    const parsed = parseSearch(search);
    if (isEmptySearch(parsed)) return [];

    const allItems: (SearchableItem & { location: string, characterId: string })[] = [];
    const add = (items: ProfileItem[], location: string, characterId: string) => items.forEach((item) => {
      const definition = itemDefinitions[item.itemHash];
      if (item.itemInstanceId && definition?.displayProperties?.name && !typeBlacklist.includes(definition.itemType)) {
        allItems.push({ item, definition, location, characterId });
      }
    });
    Object.keys(characterEquipment).forEach((char) => {
      add(characterEquipment[char].items, classDefinitions[characters[char].classHash].displayProperties.name, char);
    });
    Object.keys(characterInventories).forEach((char) => {
      add(characterInventories[char].items, classDefinitions[characters[char].classHash].displayProperties.name, char);
    });
    add(profileInventory, "Vault", "");

    const context = { itemComponents, perksDefinitions, dupes: findDupes(allItems) };
    return allItems.filter((searchable) => matchesSearch(parsed, searchable, context)).map(({ item, definition, location, characterId }) => ({
      item: definition,
      location: location,
      itemInstanceId: item.itemInstanceId,
      characterId: characterId,
      state: item.state,
      overrideStyleItemHash: item.overrideStyleItemHash,
      perks: itemComponents.perks[item.itemInstanceId],
      stats: itemComponents.stats[item.itemInstanceId],
    }));
  }, [open, search, characters, characterEquipment, characterInventories, profileInventory, itemComponents, itemDefinitions, classDefinitions, perksDefinitions]);

  // Clear search input and results
  const handleClearSearch = () => {
    setSearch("");
  };

  // Handle double click to transfer item to the current character
  const handleDoubleClick = (result: SearchResult) => {
    if (!currentCharacterId) return;
    transfer({
      itemHash: result.item.hash,
      itemInstanceId: result.itemInstanceId,
      toId: currentCharacterId,
      fromId: result.characterId || "vault",
    });
  };

  // If search bar is not open, don't render it
  if (!open) return null;

  return (
    <div className={`fixed inset-0 flex items-start pt-[15vh] justify-center z-[1000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
      <div
        className={`relative flex flex-col items-center w-[50vw] max-h-[70vh] rounded-2xl shadow-2xl shadow-purple-900/20 border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md transition-all duration-300 ease-out
          ${open ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Area */}
        <div className="flex items-center w-full p-4 border-b border-white/5">
          <div className="p-2 text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search for items, perks, tiers..."
            className="flex-grow p-2 bg-transparent text-white text-xl placeholder-gray-500 focus:outline-none font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus
          />
          {search.length > 0 && (
            <button
              onClick={handleClearSearch}
              className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 mr-1"
              title="Clear search"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          <div className="relative group">
            <button className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-sm text-gray-300 text-left">
              <h4 className="text-white font-semibold mb-2">Search Filters</h4>
              <ul className="space-y-2">
                <li>
                  <code className="text-purple-400 bg-purple-400/10 px-1 rounded">perk:name</code>
                  <span className="block text-xs mt-0.5">Filter by perk name</span>
                </li>
                <li>
                  <code className="text-blue-400 bg-blue-400/10 px-1 rounded">tier:number</code>
                  <span className="block text-xs mt-0.5">Filter by gear tier</span>
                </li>
                <li>
                  <code className="text-orange-400 bg-orange-400/10 px-1 rounded">&gt;=number</code>
                  <span className="block text-xs mt-0.5">Filter by power level</span>
                </li>
                <li>
                  <code className="text-green-400 bg-green-400/10 px-1 rounded">is:type</code>
                  <span className="block text-xs mt-0.5">weapon, armor, exotic, locked, dupe, crafted...</span>
                </li>
                <li>
                  <code className="text-pink-400 bg-pink-400/10 px-1 rounded">slot:name</code>
                  <span className="block text-xs mt-0.5">kinetic, energy, power, helmet, arms...</span>
                </li>
                <li>
                  <code className="text-yellow-400 bg-yellow-400/10 px-1 rounded">element:name</code>
                  <span className="block text-xs mt-0.5">solar, arc, void, stasis, strand, kinetic</span>
                </li>
                <li>
                  <code className="text-cyan-400 bg-cyan-400/10 px-1 rounded">stat:name&gt;=number</code>
                  <span className="block text-xs mt-0.5">Armor stat, or total</span>
                </li>
              </ul>
              <a
                href="/docs/search"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block border-t border-white/10 pt-3 text-right text-xs font-semibold text-purple-300 transition-colors hover:text-white"
              >
                View more
              </a>
            </div>
          </div>
        </div>


        {/* Results Area */}
        <div className="w-full overflow-hidden flex flex-col">
          {(isFocused || search.length > 0) && results.length > 0 && (
            <div className="flex items-center justify-between px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-black/20">
              <span>Results</span>
              <span>{results.length} items found</span>
            </div>
          )}

          {(isFocused || search.length > 0) && results.length > 0 ? (
            <div className="flex flex-col w-full overflow-y-auto custom-scrollbar max-h-[60vh] p-2 gap-1">
              {results
                .filter((i) => i.item.displayProperties.icon)
                .map((result, index) => (
                  <div
                    key={index}
                    className="group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 border border-transparent hover:border-white/5"
                    onDoubleClick={() => handleDoubleClick(result)}
                  >
                    <div className="relative flex-shrink-0">
                      <Item
                        itemHash={result.item.hash}
                        itemInstanceId={result.itemInstanceId}
                        ornamentItem={result.overrideStyleItemHash ? itemDefinitions[result.overrideStyleItemHash] : undefined}
                        state={result.state}
                        perks={result.perks}
                        stats={result.stats}
                        characterId={result.characterId}
                        quantity={1}
                        size={52}
                      />
                    </div>

                    <div className="ml-4 flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.item.defaultDamageType ? (
                            <Image
                              src={getDamageTypeIcon(result.item.defaultDamageType)}
                              alt="Damage type"
                              className="w-6 h-6"
                              height={24}
                              width={24}
                            />
                          ) : null}
                          <h3 className="text-white font-semibold text-lg truncate group-hover:text-purple-300 transition-colors">
                            {result.item.displayProperties.name}
                          </h3>
                        </div>
                        <span className="text-xs text-gray-500 bg-black/40 px-2 py-1 rounded-full border border-white/5">
                          {result.location ?? "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 truncate">
                          {result.item.itemTypeDisplayName}
                        </span>
                        {result.item.inventory?.tierType === 6 && (
                          <span className="text-[10px] text-yellow-500 border border-yellow-500/30 px-1.5 rounded bg-yellow-500/10">Exotic</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            (isFocused || search.length > 0) && search.length > 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p>No items found matching &quot;{search}&quot;</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
