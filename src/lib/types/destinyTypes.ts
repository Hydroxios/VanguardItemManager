// Common types used across the application

export interface EquipmentItem {
  item: any;
  itemInstance: any;
  ornamentItem: any;
  perks?: any;
  stats?: any;
  state: any;
}

export interface EquipmentSection {
  current: EquipmentItem | undefined;
  inventory: EquipmentItem[];
  isOpen: boolean;
}

export interface Character {
  characterId: string;
  emblemHash: number;
  emblemPath: string;
  light: number;
  classType: number;
  raceType: number;
  classHash: number;
  raceHash: number;
  genderHash?: number;
  titleRecordHash?: number;
  stats: Record<string, number>;
}

export interface Currency {
  item: any;
  quantity: number;
}

export interface CharacterEquipment {
  equipment: any[];
  loadouts: any[];
  stats: Record<string, number>;
  inventory: any[];
}

export interface CharacterViewProps {
  db: any;
  token: string;
  characterId: string;
  membershipType: number;
  membershipId: string;
  currencies: any;
  loadoutsColorDefinition: any;
  loadoutIconDefinition: any;
  character: CharacterEquipment;
  itemInstances: any;
  itemPerks: any;
  itemStats: any;
  characters: Record<string, Character>;
  charactersInventory: any;
  profileInventory: any[];
  statsDefinition: any;
  perksDefinition: any;
  classDefinition: any;
  recordDefinition?: any;
  changeCharacter: () => void;
  refresh: () => Promise<void>;
}

// Equipment slot type hash constants
export const EQUIPMENT_SLOTS = {
  PRIMARY: 1498876634,
  ENERGETIC: 2465295065,
  HEAVY: 953998645,
  HELMET: 3448274439,
  ARMS: 3551918588,
  CHEST: 14239492,
  LEGS: 20886954,
  CLASS_ITEM: 1585787867,
}; 