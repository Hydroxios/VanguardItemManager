// Item view models used by the character screen

import { ItemDefinition } from "./definitions";
import { ItemPerks, ItemStats } from "./profile";

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
