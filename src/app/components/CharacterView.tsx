"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Item from "./Item";
import Currencies from "./Currencies";
import LoadingItem from "./LoadingItem";
import Loadouts from "./Loadouts";
import CharacterStats from "./CharacterStats";
import InventoryItems from "./InventoryItems";
import { transferItem, safeTransferItem } from "@/lib/bungie";
import { useNotifications } from "./NotificationsProvider";
import Vault from "@/app/components/Vault";
import Engrams from "./Engrams";
import Postmaster from "./Postmaster";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import useAuth from "@/lib/hooks/useAuth";

interface CharacterViewProps {
  characterId: string;
  changeCharacter: () => void;
}

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

interface EquipmentItem {
  item: any;
  itemInstanceId: string
  ornamentItem: any;
  perks?: any;
  stats?: any;
  state: any;
  hash: number
}

interface EquipmentSection {
  current: EquipmentItem | undefined;
  inventory: EquipmentItem[];
  isOpen: boolean;
}

const CharacterView: React.FC<CharacterViewProps> = ({
  characterId,
  changeCharacter,
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
  const [vaultExotic, setVaultExotic] = useState(false);
  const [characterTitle, setCharacterTitle] = useState<string>("");
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const { addNotification } = useNotifications();
  const [isVimMenuOpen, setIsVimMenuOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<string>("en");
  const vimMenuRef = useRef<HTMLDivElement>(null);

  const {
    itemDefinitions,
    recordsDefinitions,
  } = useDefinitions();

  const { token } = useAuth();

  const {
    user,
    characters,
    characterEquipment,
    characterInventories,
    itemComponents,
    profileCurrencies,
    refresh,
  } = useProfile();

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

  // Handle equipping an item
  const handleEquip = useCallback(
    async (
      section: string,
      item: any,
      itemInstanceId: string,
      state: any,
      ornamentItem: any,
      hash: number
    ) => {
      setEquipment((prev) => {
        const currentEquipment = prev[section].current;
        const newInventory = prev[section].inventory.filter(
          (p) => p.itemInstanceId !== itemInstanceId
        );

        if (currentEquipment) {
          newInventory.push(currentEquipment);
        }

        return {
          ...prev,
          [section]: {
            ...prev[section],
            current: {
              item,
              itemInstanceId: itemInstanceId,
              ornamentItem,
              perks: itemComponents.perks[itemInstanceId],
              stats: itemComponents.stats[itemInstanceId],
              state,
              hash
            },
            inventory: newInventory,
          },
        };
      });

      // Return a resolved promise to match the expected type
      return Promise.resolve();
    },
    []
  );

  // Handle drag and drop for item transfer
  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
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
              token as string,
              user.membershipType,
              args[0],
              args[1],
              args[2],
              characterId,
              user.membershipId
            );
          } else {
            // Item is being transferred from vault to character
            await transferItem(
              token as string,
              user.membershipType,
              args[0],
              args[1],
              characterId,
              false
            );
          }
          await refresh();
        } catch (err: any) {
          addNotification(
            `Error while transferring ${
              itemDefinitions[args[0]].displayProperties?.name || "item"
            }!`,
            err.message,
            "error",
            `https://www.bungie.net${
              itemDefinitions[args[0]]?.displayProperties?.icon || ""
            }`,
            5000
          );
        }
      }
    },
    [characterId, addNotification, refresh]
  );

  // Handle vault drop
  const handleVaultDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const infos = event.dataTransfer.getData("text/plain").split(":");
      const hash = infos[0];
      const itemInstanceId = infos[1];

      try {
        // Transfer to vault
        await safeTransferItem(
          token as string,
          user.membershipType,
          hash,
          itemInstanceId,
          characterId,
          "vault",
          user.membershipId
        );
        await refresh();
      } catch (err: any) {
        addNotification(
          `Error while transferring to vault!`,
          err.message,
          "error",
          `https://www.bungie.net${
            itemDefinitions[hash]?.displayProperties?.icon || ""
          }`,
          5000
        );
      }
    },
    [characterId, addNotification, refresh]
  );

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Initialize equipment and currencies
  const initializeData = useCallback(() => {
    // Process currencies
    if (profileCurrencies.length >= 3) {
      const c: any[] = [];
      const glimmers = profileCurrencies[0];
      const brightDusts = profileCurrencies[2];
      c.push({
        item: itemDefinitions[glimmers.itemHash],
        quantity: glimmers.quantity,
      });
      c.push({
        item: itemDefinitions[brightDusts.itemHash],
        quantity: brightDusts.quantity,
      });
      setCurrenciesData(c);
    }

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
          const inventoryItem = {
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

    // Random chance for exotic vault display (Easter egg)
    setVaultExotic(Math.random() < 0.01);
  }, []);

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
    }

    const intervalId = setInterval(() => {
      refresh();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Load current locale from localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale) {
      setCurrentLocale(savedLocale);
    }
  }, []);

  // Handle language change
  const handleLanguageChange = (locale: string) => {
    localStorage.setItem("locale", locale);
    setCurrentLocale(locale);
    setIsVimMenuOpen(false);
    window.location.reload();
  };

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Render equipment section
  const renderEquipmentSection = useCallback(
    (section: string, isWeapon: boolean, isRightSide: boolean) => {
      const { current, inventory, isOpen } = equipment[section];

      if (!current) return <LoadingItem />;

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
            onEquip={
              isWeapon
                ? async (item, itemInstanceId, state, hash, ornamentItem) =>
                    await handleEquip(
                      section,
                      item,
                      itemInstanceId,
                      state,
                      hash,
                      ornamentItem
                    )
                : undefined
            }
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
    [equipment, toggleEquipmentSection, handleEquip]
  );

  return (
    <div className="mx-auto" onDrop={handleDrop} onDragOver={handleDragOver}>
      {currenciesData?.length > 0 && <Currencies currencies={currenciesData} />}

      {/* Display Engrams at the top center fixed position */}
      <div className="fixed top-0 left-0 right-0 flex justify-center pt-3 z-50">
        <div className="px-6 py-3 shadow-lg">
          <Engrams items={characterInventories[characterId]} />
        </div>
      </div>

      {/* Add padding to account for fixed Engrams component */}
      <div className="pt-24"></div>

      <Loadouts
        characterId={characterId}
        refreshChar={refresh}
      />

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
        <div className="text-center mt-6 mb-4 relative max-w-[350px] mx-auto">
          <div
            className="py-1 px-10 relative"
            style={{
              background:
                "linear-gradient(to right, rgba(71, 39, 112, 0), rgba(104, 53, 155, 0.95), rgba(71, 39, 112, 0))",
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
      <div className="fixed right-0 bottom-14 pr-4 z-40">
        <Postmaster
          characterId={characterId}
          refresh={refresh}
        />
      </div>

      {/* Vault Component */}
      <Vault
        isOpen={isVaultOpen}
        setIsOpen={setIsVaultOpen}
        characterId={characterId}
        refresh={refresh}
      />

      {/* Add bottom margin to prevent footer overlap */}
      <div className="pb-16"></div>

      <footer
        className="fixed bottom-0 right-0 w-full flex flex-row items-center justify-between gap-2 bg-black bg-opacity-90"
        style={{
          height: "35px",
          borderTop: "2px solid #1a1a1a",
          boxShadow: "0 -4px 8px rgba(0, 0, 0, 0.3)",
          zIndex: 40,
        }}
      >
        <div className="relative" ref={vimMenuRef}>
          <button
            className="flex flex-row items-center gap-2 ml-5"
            onClick={() => setIsVimMenuOpen(!isVimMenuOpen)}
          >
            <img
              src={"intellect.svg"}
              height={24}
              width={24}
              alt="Intellect icon"
            />
            <p className="text-gray-500">VIM v1.0</p>
          </button>

          {isVimMenuOpen && (
            <div
              className="absolute bottom-9 left-0 w-56 z-50"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(15, 15, 25, 0.98), rgba(25, 25, 35, 0.98))",
                borderTop: "1px solid #7e57c2",
                borderLeft: "1px solid #7e57c2",
                borderRight: "1px solid #7e57c2",
                boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div className="flex justify-between items-center border-b border-gray-700 bg-[rgba(30,30,40,0.5)] py-1">
                <div className="flex items-center gap-1 ml-3">
                  <img
                    src={"intellect.svg"}
                    height={16}
                    width={16}
                    alt="Intellect icon"
                  />
                  <h2 className="text-base font-medium text-white">
                    Language Settings
                  </h2>
                </div>
                <button
                  className="text-gray-400 hover:text-white transition-colors mr-2"
                  onClick={() => setIsVimMenuOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-2 bg-[rgba(20,20,30,0.8)]">
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${
                    currentLocale === "en"
                      ? "bg-[rgba(126,87,194,0.5)] text-white"
                      : "text-gray-200"
                  }`}
                  onClick={() => handleLanguageChange("en")}
                >
                  <span className="mr-2">🇺🇸</span> English
                </div>
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${
                    currentLocale === "fr"
                      ? "bg-[rgba(126,87,194,0.5)] text-white"
                      : "text-gray-200"
                  }`}
                  onClick={() => handleLanguageChange("fr")}
                >
                  <span className="mr-2">🇫🇷</span> Français
                </div>
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${
                    currentLocale === "es"
                      ? "bg-[rgba(126,87,194,0.5)] text-white"
                      : "text-gray-200"
                  }`}
                  onClick={() => handleLanguageChange("es")}
                >
                  <span className="mr-2">🇪🇸</span> Español
                </div>
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${
                    currentLocale === "de"
                      ? "bg-[rgba(126,87,194,0.5)] text-white"
                      : "text-gray-200"
                  }`}
                  onClick={() => handleLanguageChange("de")}
                >
                  <span className="mr-2">🇩🇪</span> Deutsch
                </div>
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${
                    currentLocale === "it"
                      ? "bg-[rgba(126,87,194,0.5)] text-white"
                      : "text-gray-200"
                  }`}
                  onClick={() => handleLanguageChange("it")}
                >
                  <span className="mr-2">🇮🇹</span> Italiano
                </div>
                <div
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded ${
                    currentLocale === "ja"
                      ? "bg-[rgba(126,87,194,0.5)] text-white"
                      : "text-gray-200"
                  }`}
                  onClick={() => handleLanguageChange("ja")}
                >
                  <span className="mr-2">🇯🇵</span> 日本語
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          className="flex flex-row items-center gap-2"
          onDrop={handleVaultDrop}
          onDragOver={handleDragOver}
          onClick={() => setIsVaultOpen(!isVaultOpen)}
        >
          <img
            src={vaultExotic ? "./vault_exotic.svg" : "./vault.svg"}
            height={16}
            width={16}
            alt="Vault icon"
          />
          {isVaultOpen ? "Close Vault" : "Open Vault"}
        </button>
        <button
          className="flex flex-row items-center gap-2 mr-5"
          onClick={changeCharacter}
        >
          <img src={"./ghost.svg"} height={16} width={16} alt="Ghost icon" />
          Change Character
        </button>
      </footer>
    </div>
  );
};

export default CharacterView;
