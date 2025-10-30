"use client"

import { safeTransferItem, transferItem } from "@/lib/bungie";
import Item from "../character/Item";
import {
  ItemDefinition,
  ItemDefinitions,
  useDefinitions,
} from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import { ItemPerks, ItemStats } from "@/lib/hooks/useProfile";
import { Perk } from "@/lib/hooks/useProfile";
import { useNotifications } from "../NotificationsProvider";

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
  const [results, setResults] = useState<SearchResult[]>([]); // State to store search results
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

  useEffect(() => handleSearch(search), [characters]);
  const { token } = useAuth();
  const { user } = useProfile();

  // Notifications hook
  const { addNotification } = useNotifications();

  const handleSearch = (search: string) => {
    setSearch(search);
    const res: SearchResult[] = [];
	if (search.length === 0) {
		setResults([]);
		return;
	}

	const query = search.toLowerCase().trim();
	const searchTerms = query.split(' ').filter(term => term.length > 0);

	const filters = {
		perk: searchTerms.find(term => term.startsWith('perk:'))?.substring(5),
		tier: searchTerms.find(term => term.startsWith('tier:'))?.substring(5),
		is: searchTerms.find(term => term.startsWith('is:'))?.substring(3),
		name: searchTerms.filter(term => !term.includes(':')).join(' ')
	};

	const allItems: { item: any, location: string, characterId: string }[] = [];

	// Add equipped items
	Object.keys(characterEquipment).forEach((char: string) => {
		characterEquipment[char].items.forEach((item) => {
			if (item.itemInstanceId) {
				const i = itemDefinitions[item.itemHash];
				allItems.push({
					item: { ...item, itemDef: i }, // Attach item definition for easier access
					location: classDefinitions[characters[char].classHash].displayProperties.name,
					characterId: char,
				});
			}
		});
	});

	// Add inventory items
	Object.keys(characterInventories).forEach((char) => {
		characterInventories[char].items.forEach((item) => {
			if (item.itemInstanceId) {
				const i = itemDefinitions[item.itemHash];
				allItems.push({
					item: { ...item, itemDef: i },
					location: classDefinitions[characters[char].classHash].displayProperties.name,
					characterId: char,
				});
			}
		});
	});

	// Add vault items
	profileInventory.forEach((item) => {
		if (item.itemInstanceId) {
			const i = itemDefinitions[item.itemHash];
			allItems.push({
				item: { ...item, itemDef: i },
				location: "Vault",
				characterId: "",
			});
		}
	});

	const filteredResults = allItems.filter(({ item, location, characterId }) => {
		const i: ItemDefinition = item.itemDef;
		if (!i || !i.displayProperties || !i.displayProperties.name) return false;
    if(typeBlacklist.includes(i.itemType)) return false;

		// Name filter
		if (filters.name && !i.displayProperties.name.toLowerCase().includes(filters.name)) {
			return false;
		}

		// Perk filter
		if (filters.perk) {
			const perkQuery = filters.perk;
			const itemPerkData = item.itemInstanceId ? itemComponents.perks[item.itemInstanceId] : null;
			
			const hasMatchingPerk = itemPerkData?.perks.some((perk: Perk) => 
				perk.visible && 
				perk.isActive && 
				perksDefinitions[perk.perkHash]?.displayProperties?.name?.toLowerCase().includes(perkQuery)
			);

			if (!hasMatchingPerk) {
				// Fallback to checking item name for perk as a convenience
				if (!i.displayProperties.name.toLowerCase().includes(perkQuery)) {
					return false;
				}
			}
		}

		// Tier filter
		if (filters.tier) {
			const tierQuery = parseInt(filters.tier, 10);
			if (isNaN(tierQuery) || itemComponents.instances[item.itemInstanceId]?.gearTier !== tierQuery) {
				return false;
			}
		}

		// 'is:' filter
		if (filters.is) {
			const q = filters.is;
			if (q === "featured" && !i.isFeaturedItem) return false;
			if (q === "unfeatured" && i.isFeaturedItem) return false;
			if (q === "exotic" && i.inventory?.tierType !== 6) return false;
		}

		return true;
	}).map(({ item, location, characterId }) => ({
		item: item.itemDef,
		location: location,
		itemInstanceId: item.itemInstanceId,
		characterId: characterId,
		state: item.state,
		overrideStyleItemHash: item.overrideStyleItemHash,
		perks: itemComponents.perks[item.itemInstanceId],
		stats: itemComponents.stats[item.itemInstanceId],
	}));

	setResults(filteredResults);
  };


  // Clear search input and results
  const handleClearSearch = () => {
    setSearch("");
    setResults([]);
  };

  // Handle double click to transfer item
  const handleDoubleClick = async (result: SearchResult) => {
    if (!currentCharacterId) return;
    const icon = result.overrideStyleItemHash
      ? itemDefinitions[result.overrideStyleItemHash].displayProperties.icon
      : result.item.displayProperties.icon;
    if (result.characterId) {
      if(itemComponents.instances[result.itemInstanceId].isEquipped){
        await safeTransferItem(
          token as string,
          user.membershipType,
          result.item.hash,
          result.itemInstanceId,
          result.characterId,
          currentCharacterId,
          user.membershipId
        );
      } else {
        await transferItem(token as string, user.membershipType, result.item.hash, result.itemInstanceId, result.characterId, true)
        await transferItem(token as string, user.membershipType, result.item.hash, result.itemInstanceId, currentCharacterId, false)
      }
      addNotification(
        "Item transfered to your character",
        result.item.displayProperties.name,
        "success",
        "https://www.bungie.net" + icon,
        5000
      );
    } else {
      await transferItem(
        token as string,
        user.membershipType,
        result.item.hash,
        result.itemInstanceId,
        currentCharacterId,
        false
      );
      addNotification(
        "Item transfered from your vault",
        result.item.displayProperties.name,
        "success",
        "https://www.bungie.net" + icon,
        5000
      );
    }
  };

  // If search bar is not open, don't render it
  if (!open) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[1000] bg-black bg-opacity-50`}>
      <div
        className={`relative flex flex-col items-center p-2 rounded-lg shadow-xl transition-all duration-300 ease-in-out
          ${isFocused || search.length > 0 ? 'w-[50vw] h-[55vh] bg-black bg-opacity-80 border border-purple-700' : 'w-[50vw] h-[60px] bg-black bg-opacity-80 border border-gray-700'}
          ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
        `}
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <div className="flex items-center w-full">
          <img src={"./loupe.svg"} height={24} width={24} className="ml-2" />
          <input
            type="text"
            placeholder="Search items..."
            className="flex-grow p-2 bg-transparent text-white text-lg placeholder-gray-400 focus:outline-none"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus
          />
          {search.length > 0 && (
            <button
              onClick={handleClearSearch}
              className="p-1 text-gray-400 hover:text-white transition-colors mr-2"
              title="Clear search"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>


        {(isFocused || search.length > 0) && results.length > 0 && (
          <div className="w-full text-right text-gray-400 text-sm pr-2">{results.length} results</div>
        )}
        {(isFocused || search.length > 0) && results.length > 0 && (
          <div className="flex flex-col gap-1 w-full mt-2 overflow-y-auto">
            {results
              .filter((i) => i.item.displayProperties.icon) // Only show items with icons
              .map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-200
                    ${index % 2 === 0 ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-700 bg-opacity-50'}
                    hover:bg-purple-800 hover:bg-opacity-70
                  `}
                  onDoubleClick={() => handleDoubleClick(result)}
                >
                  <Item
                    itemHash={result.item.hash}
                    itemInstanceId={result.itemInstanceId}
                    ornamentItem={result.overrideStyleItemHash ? itemDefinitions[result.overrideStyleItemHash] : undefined}
                    state={result.state}
                    perks={result.perks || {}}
                    stats={result.stats || {}}
                    characterId={result.characterId}
                    armor={false} // Assuming search results are primarily weapons for perk display
                    quantity={1}
                    size={48}
                  />
                  <div className="ml-3 text-left">
                    <div className="text-white font-semibold">{result.item.displayProperties.name}</div>
                    <div className="text-sm text-gray-300">{result.location ?? "Unknown"}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
        {(isFocused || search.length > 0) && results.length === 0 && search.length > 0 && (
          <div className="text-gray-400 mt-4">No items found.</div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;