// Common types used across the application

import { ItemDefinition } from "../hooks/useDefinitions";
import { ItemPerks, ItemStats } from "../hooks/useProfile";

export interface EquipmentItem {
  item: ItemDefinition;
  itemInstanceId: string;
  ornamentItem: ItemDefinition;
  perks: ItemPerks;
  stats: ItemStats;
  state: number;
  hash: number;
  quantity?: number
}

export interface EquipmentSection {
  current: EquipmentItem | undefined;
  inventory: EquipmentItem[];
  isOpen: boolean;
}

export interface CharacterEquipment {
  equipment: any[];
  loadouts: any[];
  stats: Record<string, number>;
  inventory: any[];
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