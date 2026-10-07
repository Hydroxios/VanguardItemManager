"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Item from "./Item";
import Currencies from "./Currencies";
import Loadouts from "./Loadouts";
import CharacterStats from "./CharacterStats";
import InventoryItems from "./InventoryItems";
import useTransferItem from "@/lib/hooks/useTransferItem";
import Vault from "./Vault";
import Engrams from "./Engrams";
import Postmaster from "./Postmaster";
import { ItemDefinition, useDefinitions } from "@/lib/hooks/useDefinitions";
import { ItemPerks, ItemStats, useProfile } from "@/lib/hooks/useProfile";
import useAuth from "@/lib/hooks/useAuth";
import { EquipmentItem } from "@/lib/types/destinyTypes";
import DestinyIcon from "../destiny-ui/DestinyIcon";
import SearchBar from "../inputs/SearchBar";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import CharacterHeader from "./header/CharacterHeader";

interface CharacterViewProps {
  characterId: string;
  changeCharacter: (characterId: string | undefined) => void;
  onOpenSettings: () => void;
}

const GLIMMER_HASH = 3159615086;
const BRIGHT_DUST_HASH = 2817410917;

// Equipment slot type hash constants
const EQUIPMENT_SLOTS = {
  PRIMARY: 1498876634,
  ENERGETIC: 2465295065,
  HEAVY: 953998645,
  HELMET: 3448274439,
  ARMS: 3551918588,
  CHEST: 14239492,
  LEGS: 20886954,
  CLASS_ITEM: 1585787867,
};

interface InventoryItem {
  item: ItemDefinition;
  itemInstanceId: string;
  ornamentItem: ItemDefinition;
  perks: ItemPerks;
  stats: ItemStats;
  state: number;
  hash: number;
}

interface EquipmentSection {
  current: EquipmentItem | undefined;
  inventory: EquipmentItem[];
  isOpen: boolean;
}

const CharacterView: React.FC<CharacterViewProps> = ({
  characterId,
  changeCharacter,
  onOpenSettings,
}) => {
  const [equipment, setEquipment] = useState<Record<string, EquipmentSection>>({
    primary: { current: undefined, inventory: [], isOpen: false },
    energetic: { current: undefined, inventory: [], isOpen: false },
    heavy: { current: undefined, inventory: [], isOpen: false },
    helmet: { current: undefined, inventory: [], isOpen: false },
    arms: { current: undefined, inventory: [], isOpen: false },
    chest: { current: undefined, inventory: [], isOpen: false },
    legs: { current: undefined, inventory: [], isOpen: false },
    classItem: { current: undefined, inventory: [], isOpen: false },
  });

  const [currenciesData, setCurrenciesData] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>();
  const [characterTitle, setCharacterTitle] = useState<string>("");
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false)
  const { transfer } = useTransferItem();
  // eslint-disable-next-line
  const [isVimMenuOpen, setIsVimMenuOpen] = useState(false);
  // eslint-disable-next-line
  const [currentLocale, setCurrentLocale] = useState<string>("en");
  const vimMenuRef = useRef<HTMLDivElement>(null);

  const {
    definitionsLoaded,
    itemDefinitions,
    recordsDefinitions,
  } = useDefinitions();

  const { lastUpdate, refreshUserToken } = useAuth();

  const {
    characters,
    characterEquipment,
    characterInventories,
    itemComponents,
    profileCurrencies,
    refresh,
  } = useProfile();

  const { hideTooltip } = useItemTooltip();

  // Toggle equipment section open/closed
  const toggleEquipmentSection = useCallback(
    (section: string, isOpen: boolean) => {
      setEquipment((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          isOpen,
        },
      }));
    },
    []
  );

  // Parses drag data: "st:hash:instanceId" (vault items) or "hash:instanceId:slot" (character items)
  const parseDragData = (event: React.DragEvent) => {
    const [itemHash, itemInstanceId] = event.dataTransfer.getData("text/plain").replace(/^st:/, "").split(":");
    const hash = Number.parseInt(itemHash);
    if (Number.isNaN(hash)) return undefined;
    return { itemHash: hash, itemInstanceId: itemInstanceId && itemInstanceId !== "undefined" ? itemInstanceId : undefined };
  };

  // Handle drag and drop for item transfer to this character
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const data = parseDragData(event);
    if (!data) return;
    transfer({ ...data, toId: characterId, fromId: "vault" });
  };

  // Handle drop on the vault button
  const handleVaultDrop = (event: React.DragEvent) => {
    event.preventDefault();
    // Don't let the drop bubble to the page-level handler, which would move the item to the character
    event.stopPropagation();
    const data = parseDragData(event);
    if (!data) return;
    transfer({ ...data, toId: "vault", fromId: characterId });
  };

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Initialize equipment and currencies
  const initializeData = useCallback(() => {
    // Process currencies
    const c = [GLIMMER_HASH, BRIGHT_DUST_HASH]
      .map((hash) => profileCurrencies.find((currency) => currency.itemHash === hash))
      .filter((currency) => currency !== undefined)
      .map((currency) => ({
        item: itemDefinitions[currency.itemHash],
        quantity: currency.quantity,
      }));
    setCurrenciesData(c);

    // Initialize equipment map
    const equipmentMap: Record<string, EquipmentItem> = {};
    const inventoryMap: Record<string, EquipmentItem[]> = {
      primary: [],
      energetic: [],
      heavy: [],
      helmet: [],
      arms: [],
      chest: [],
      legs: [],
      classItem: [],
    };

    // Process equipped items
    characterEquipment[characterId].items.forEach((e) => {
      const i = itemDefinitions[e.itemHash];
      const ornamentItem = itemDefinitions[e.overrideStyleItemHash];

      if (i.equippingBlock) {
        const slotHash = i.equippingBlock.equipmentSlotTypeHash;
        const equippedItem = {
          item: i,
          itemInstanceId: e.itemInstanceId,
          ornamentItem,
          perks: itemComponents.perks[e.itemInstanceId],
          stats: itemComponents.stats[e.itemInstanceId],
          state: e.state,
          hash: e.itemHash
        };

        switch (slotHash) {
          case EQUIPMENT_SLOTS.PRIMARY:
            equipmentMap.primary = equippedItem;
            break;
          case EQUIPMENT_SLOTS.ENERGETIC:
            equipmentMap.energetic = equippedItem;
            break;
          case EQUIPMENT_SLOTS.HEAVY:
            equipmentMap.heavy = equippedItem;
            break;
          case EQUIPMENT_SLOTS.HELMET:
            equipmentMap.helmet = equippedItem;
            break;
          case EQUIPMENT_SLOTS.ARMS:
            equipmentMap.arms = equippedItem;
            break;
          case EQUIPMENT_SLOTS.CHEST:
            equipmentMap.chest = equippedItem;
            break;
          case EQUIPMENT_SLOTS.LEGS:
            equipmentMap.legs = equippedItem;
            break;
          case EQUIPMENT_SLOTS.CLASS_ITEM:
            equipmentMap.classItem = equippedItem;
            break;
        }
      }
    });


    // Process inventory items
    characterInventories[characterId].items.forEach((item) => {
      if (item.itemInstanceId && item.location === 1) {
        const i = itemDefinitions[item.itemHash];
        const ornamentItem = itemDefinitions[item.overrideStyleItemHash];

        if (i.equippingBlock) {
          const slotHash = i.equippingBlock.equipmentSlotTypeHash;
          const inventoryItem: InventoryItem = {
            item: i,
            itemInstanceId: item.itemInstanceId,
            ornamentItem,
            perks: itemComponents.perks[item.itemInstanceId],
            stats: itemComponents.stats[item.itemInstanceId],
            state: item.state,
            hash: item.itemHash
          };

          switch (slotHash) {
            case EQUIPMENT_SLOTS.PRIMARY:
              inventoryMap.primary.push(inventoryItem);
              break;
            case EQUIPMENT_SLOTS.ENERGETIC:
              inventoryMap.energetic.push(inventoryItem);
              break;
            case EQUIPMENT_SLOTS.HEAVY:
              inventoryMap.heavy.push(inventoryItem);
              break;
            case EQUIPMENT_SLOTS.HELMET:
              inventoryMap.helmet.push(inventoryItem);
              break;
            case EQUIPMENT_SLOTS.ARMS:
              inventoryMap.arms.push(inventoryItem);
              break;
            case EQUIPMENT_SLOTS.CHEST:
              inventoryMap.chest.push(inventoryItem);
              break;
            case EQUIPMENT_SLOTS.LEGS:
              inventoryMap.legs.push(inventoryItem);
              break;
            case EQUIPMENT_SLOTS.CLASS_ITEM:
              inventoryMap.classItem.push(inventoryItem);
              break;
          }
        }
      }
    });

    // Update equipment state
    setEquipment({
      primary: {
        current: equipmentMap.primary,
        inventory: inventoryMap.primary,
        isOpen: false,
      },
      energetic: {
        current: equipmentMap.energetic,
        inventory: inventoryMap.energetic,
        isOpen: false,
      },
      heavy: {
        current: equipmentMap.heavy,
        inventory: inventoryMap.heavy,
        isOpen: false,
      },
      helmet: {
        current: equipmentMap.helmet,
        inventory: inventoryMap.helmet,
        isOpen: false,
      },
      arms: {
        current: equipmentMap.arms,
        inventory: inventoryMap.arms,
        isOpen: false,
      },
      chest: {
        current: equipmentMap.chest,
        inventory: inventoryMap.chest,
        isOpen: false,
      },
      legs: {
        current: equipmentMap.legs,
        inventory: inventoryMap.legs,
        isOpen: false,
      },
      classItem: {
        current: equipmentMap.classItem,
        inventory: inventoryMap.classItem,
        isOpen: false,
      },
    });

    // Set character stats
    setStatistics(characters[characterId].stats);

  }, [
    profileCurrencies,
    itemDefinitions,
    characterEquipment,
    characterInventories,
    itemComponents,
    characters,
    characterId,
    recordsDefinitions,
  ]);

  // Setup initial data and refresh interval
  useEffect(() => {
    initializeData();
    const currentCharacter = characters[characterId];
    if (currentCharacter.titleRecordHash) {
      const record = recordsDefinitions[currentCharacter.titleRecordHash];
      if (record) {
        // Get the title text based on character gender
        const genderHash = currentCharacter.genderHash || 0;
        const titleText =
          record.titleInfo.titlesByGenderHash[genderHash] ||
          record.titleInfo.titlesByGenderHash[
          Object.keys(record.titleInfo.titlesByGenderHash)[0]
          ];

        setCharacterTitle(titleText || "");
      }
    } else {
      setCharacterTitle("");
    }

  }, [initializeData, characters, characterId, recordsDefinitions, lastUpdate, refreshUserToken, refresh]);

  // Load current locale from localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale) {
      setCurrentLocale(savedLocale);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        vimMenuRef.current &&
        !vimMenuRef.current.contains(event.target as Node)
      ) {
        setIsVimMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isVaultOpen) {
          setIsVaultOpen(false)
        } else if (searchOpen) {
          setSearchOpen(false)
        } else {
          hideTooltip();
          changeCharacter(undefined)
        }
      }
      if (e.key === "z" && !isVaultOpen && !searchOpen) {
        setIsVaultOpen(true)
        hideTooltip();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "s" && !searchOpen && !isVaultOpen) {
        setSearchOpen(true)
        hideTooltip();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isVaultOpen, searchOpen]);

  // Render equipment section
  const renderEquipmentSection = useCallback(
    (section: string, isWeapon: boolean, isRightSide: boolean) => {
      const { current, inventory, isOpen } = equipment[section];

      if (!current) return null;

      const { item, itemInstanceId, ornamentItem, perks, stats, state } = current;

      return (
        <div
          className="flex flex-row gap-1"
          onMouseEnter={() => toggleEquipmentSection(section, true)}
          onMouseLeave={() => toggleEquipmentSection(section, false)}
        >
          <InventoryItems
            items={inventory}
            open={isOpen}
            right={isRightSide}
            armors={!isWeapon}
            characterId={characterId}
          />
          <Item
            itemHash={item.hash}
            itemInstanceId={itemInstanceId}
            ornamentItem={ornamentItem}
            state={state}
            perks={perks}
            stats={stats}
            armor={!isWeapon}
            characterId={characterId}
          />
        </div>
      );
    },
    [equipment, toggleEquipmentSection, characterId]
  );

  return (
    <div className="mx-auto" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="flex flex-row gap-2 items-center fixed right-[15px] top-[80px] z-[50] hover:shadow-lg">
        {currenciesData?.length > 0 && <Currencies currencies={currenciesData} />}
      </div>

      <CharacterHeader
        characterId={characterId}
        changeCharacter={changeCharacter}
        toggleSearch={() => setSearchOpen(!searchOpen)}
        onOpenSettings={onOpenSettings}
      />

      {/* Display Engrams at the top center fixed position */}
      <div className="fixed bottom-[10%] right-1/2 translate-x-1/2 flex justify-center z-50">
        <div className="px-6 py-3">
          <Engrams characterId={characterId} />
        </div>
      </div>

      {/* Add padding to account for fixed Engrams component */}
      <div className="pt-20"></div>

      {definitionsLoaded.DestinyLoadoutColorDefinition && definitionsLoaded.DestinyLoadoutIconDefinition && (
        <Loadouts
          characterId={characterId}
        />
      )}

      <div className="flex justify-center items-center mt-4">
        <div className="flex flex-row gap-10 items-center">
          {/* Weapons Column */}
          <div className="flex flex-col gap-5">
            {renderEquipmentSection("primary", true, false)}
            {renderEquipmentSection("energetic", true, false)}
            {renderEquipmentSection("heavy", true, false)}
          </div>

          {/* Armor Column */}
          <div className="flex flex-col gap-5">
            {renderEquipmentSection("helmet", false, true)}
            {renderEquipmentSection("arms", false, true)}
            {renderEquipmentSection("chest", false, true)}
            {renderEquipmentSection("legs", false, true)}
            {renderEquipmentSection("classItem", false, true)}
          </div>
        </div>
      </div>

      {characterTitle && (
        <div className="absolute bottom-[-2%] right-1/2 translate-x-1/2 text-center mt-6 mb-4 max-w-[350px] mx-auto">
          <div
            className="py-1 px-10"
            style={{
              background:
                "linear-gradient(to right, rgba(104, 53, 155, 0.05), rgba(104, 53, 155, 0.65), rgba(104, 53, 155, 0.05))",
            }}
          >
            <div className="absolute left-0 right-0 top-0 border-t border-gray-300 opacity-30"></div>
            <div className="absolute left-0 right-0 bottom-0 border-t border-gray-300 opacity-30"></div>
            <h2 className="text-white font-medium text-sm tracking-widest uppercase">
              {characterTitle}
            </h2>
          </div>
        </div>
      )}

      {statistics && <CharacterStats stats={statistics} />}

      {/* Add Postmaster widget here, before the Vault component */}
      <div className="fixed right-0 top-[150px] pr-4 z-40">
        <Postmaster
          characterId={characterId}
        />
      </div>

      {/* Vault Component */}
      <Vault
        isOpen={isVaultOpen}
        setIsOpen={setIsVaultOpen}
        characterId={characterId}
      />

      <SearchBar open={searchOpen} currentCharacterId={characterId} onClose={() => setSearchOpen(false)} />

      {/* Add bottom margin to prevent footer overlap */}
      <div className="pb-16"></div>

      <footer
        className="fixed bottom-0 right-0 w-full flex flex-row items-center justify-end"
        style={{
          height: "35px",
          zIndex: 40,
        }}
      >
        <div className="flex flex-row gap-2 mr-2 mb-2">
          <button
            className="flex flex-row items-center gap-2 p-2 hover:shadow-lg hover:bg-gray-300/10 transition-all duration-300"
            onDrop={handleVaultDrop}
            onDragOver={handleDragOver}
            onClick={() => setIsVaultOpen(!isVaultOpen)}
          >
            <DestinyIcon icon="" />
            Vault
          </button>
          <button
            className="flex flex-row items-center gap-2 p-2 hover:shadow-lg hover:bg-gray-300/10 transition-all duration-300"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <DestinyIcon icon="" />
            Search
          </button>
          <button
            className="flex flex-row items-center gap-2 p-2 hover:shadow-lg hover:bg-gray-300/10 transition-all duration-300"
            onClick={() => changeCharacter(undefined)}
          >
            <DestinyIcon icon="" />
            Back
          </button>
        </div>
      </footer>
    </div>
  );
};

export default CharacterView;
