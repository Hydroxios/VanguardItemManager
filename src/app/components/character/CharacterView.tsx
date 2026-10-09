"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Item from "./Item";
import Currencies from "./Currencies";
import Loadouts from "./Loadouts";
import CharacterStats from "./CharacterStats";
import InventoryItems from "./InventoryItems";
import useTransferItem from "@/lib/hooks/useTransferItem";
import Vault from "./Vault";
import Engrams from "./Engrams";
import Postmaster from "./Postmaster";
import SubclassEditorModal from "./SubclassEditorModal";
import SubclassSelector from "./SubclassSelector";
import InventoryCleanerModal from "./InventoryCleanerModal";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import DestinyIcon from "../destiny-ui/DestinyIcon";
import SearchBar from "../inputs/SearchBar";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import CharacterHeader from "./header/CharacterHeader";
import { EquipmentItem, EquipmentSection, Item as ProfileItem } from "@/lib/types";
import { CURRENCIES, EQUIPMENT_SLOTS } from "@/lib/constants";

// The flyout section of each equipment slot type
const SECTION_BY_SLOT: Record<number, string> = {
  [EQUIPMENT_SLOTS.SUBCLASS]: "subclass",
  [EQUIPMENT_SLOTS.PRIMARY]: "primary",
  [EQUIPMENT_SLOTS.ENERGETIC]: "energetic",
  [EQUIPMENT_SLOTS.HEAVY]: "heavy",
  [EQUIPMENT_SLOTS.HELMET]: "helmet",
  [EQUIPMENT_SLOTS.ARMS]: "arms",
  [EQUIPMENT_SLOTS.CHEST]: "chest",
  [EQUIPMENT_SLOTS.LEGS]: "legs",
  [EQUIPMENT_SLOTS.CLASS_ITEM]: "classItem",
};

interface CharacterViewProps {
  characterId: string;
  changeCharacter: (characterId: string | undefined) => void;
  onOpenSettings: () => void;
}

const CharacterView: React.FC<CharacterViewProps> = ({
  characterId,
  changeCharacter,
  onOpenSettings,
}) => {
  // Slots whose inventory flyout is open, while hovered
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false)
  const [cleanerOpen, setCleanerOpen] = useState(false)
  // The subclass being edited, equipped or not
  const [editedSubclass, setEditedSubclass] = useState<EquipmentItem>()
  const { transfer } = useTransferItem();

  const {
    definitionsLoaded,
    itemDefinitions,
    recordsDefinitions,
  } = useDefinitions();

  const {
    characters,
    characterEquipment,
    characterInventories,
    itemComponents,
    profileCurrencies,
  } = useProfile();

  const { hideTooltip } = useItemTooltipActions();

  // Toggle equipment section open/closed
  const toggleEquipmentSection = useCallback(
    (section: string, isOpen: boolean) => {
      setOpenSections((prev) => ({ ...prev, [section]: isOpen }));
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

  // Glimmer and bright dust
  const currencies = useMemo(() => [CURRENCIES.GLIMMER, CURRENCIES.BRIGHT_DUST]
    .map((hash) => profileCurrencies.find((currency) => currency.itemHash === hash))
    .filter((currency) => currency !== undefined)
    .map((currency) => ({
      item: itemDefinitions[currency.itemHash],
      quantity: currency.quantity,
    })),
    [profileCurrencies, itemDefinitions]);

  // Each slot's equipped item, and the character's other items for that slot
  const equipment = useMemo(() => {
    const sections: Record<string, EquipmentSection> = Object.fromEntries(
      Object.values(SECTION_BY_SLOT).map((section) => [section, { current: undefined, inventory: [] }])
    );
    const sectionOf = (item: ProfileItem) =>
      SECTION_BY_SLOT[itemDefinitions[item.itemHash]?.equippingBlock?.equipmentSlotTypeHash ?? 0];
    const toEquipmentItem = (item: ProfileItem): EquipmentItem => ({
      item: itemDefinitions[item.itemHash],
      itemInstanceId: item.itemInstanceId,
      ornamentItem: itemDefinitions[item.overrideStyleItemHash],
      perks: itemComponents.perks[item.itemInstanceId],
      stats: itemComponents.stats[item.itemInstanceId],
      state: item.state,
      hash: item.itemHash,
    });

    characterEquipment[characterId].items.forEach((item) => {
      const section = sectionOf(item);
      if (section) sections[section].current = toEquipmentItem(item);
    });
    characterInventories[characterId].items.forEach((item) => {
      const section = sectionOf(item);
      // Location 1 is the inventory itself, as opposed to the postmaster
      if (section && item.itemInstanceId && item.location === 1) sections[section].inventory.push(toEquipmentItem(item));
    });
    return sections;
  }, [characterEquipment, characterInventories, characterId, itemComponents, itemDefinitions]);

  const statistics = characters[characterId]?.stats;

  // The character's title, in the form matching its gender
  const characterTitle = useMemo(() => {
    const character = characters[characterId];
    const record = character?.titleRecordHash ? recordsDefinitions[character.titleRecordHash] : undefined;
    if (!record) return "";
    const titles = record.titleInfo.titlesByGenderHash;
    return titles[character.genderHash || 0] || titles[Object.keys(titles)[0]] || "";
  }, [characters, characterId, recordsDefinitions]);

  // Keyboard shortcuts
  useEffect(() => {
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
      if (e.key === "c" && !searchOpen && !isVaultOpen) {
        setCleanerOpen(true)
        hideTooltip();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isVaultOpen, searchOpen, hideTooltip, changeCharacter]);

  const closeCleaner = useCallback(() => setCleanerOpen(false), []);

  const editSubclass = useCallback((subclass: EquipmentItem) => {
    hideTooltip();
    setEditedSubclass(subclass);
  }, [hideTooltip]);

  // Render equipment section
  const renderEquipmentSection = useCallback(
    (section: string, isRightSide: boolean) => {
      const { current, inventory } = equipment[section];
      const isOpen = !!openSections[section];

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
            characterId={characterId}
          />
          <Item
            itemHash={item.hash}
            itemInstanceId={itemInstanceId}
            ornamentItem={ornamentItem}
            state={state}
            perks={perks}
            stats={stats}
            characterId={characterId}
          />
        </div>
      );
    },
    [equipment, openSections, toggleEquipmentSection, characterId]
  );

  return (
    <div className="mx-auto" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="flex flex-row gap-2 items-center fixed right-[15px] top-[80px] z-[50] hover:shadow-lg">
        {currencies.length > 0 && <Currencies currencies={currencies} />}
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
          {/* Weapons Column, under the subclass like in game */}
          <div className="flex flex-col items-center gap-5">
            {equipment.subclass.current && (
              <SubclassSelector
                characterId={characterId}
                equipped={equipment.subclass.current}
                others={equipment.subclass.inventory}
                onEdit={editSubclass}
              />
            )}
            {renderEquipmentSection("primary", false)}
            {renderEquipmentSection("energetic", false)}
            {renderEquipmentSection("heavy", false)}
          </div>

          {/* Armor Column */}
          <div className="flex flex-col gap-5">
            {renderEquipmentSection("helmet", true)}
            {renderEquipmentSection("arms", true)}
            {renderEquipmentSection("chest", true)}
            {renderEquipmentSection("legs", true)}
            {renderEquipmentSection("classItem", true)}
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

      {editedSubclass && (
        <SubclassEditorModal
          key={editedSubclass.itemInstanceId}
          itemHash={editedSubclass.hash}
          itemInstanceId={editedSubclass.itemInstanceId}
          characterId={characterId}
          onClose={() => setEditedSubclass(undefined)}
        />
      )}

      {cleanerOpen && (
        <InventoryCleanerModal characterId={characterId} onClose={closeCleaner} />
      )}

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
            onClick={() => {
              hideTooltip();
              setCleanerOpen(true);
            }}
          >
            <DestinyIcon icon="" />
            Clean
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
