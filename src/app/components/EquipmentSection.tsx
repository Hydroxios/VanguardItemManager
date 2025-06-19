"use client";

import { useMemo } from 'react';
import Item from './Item';
import InventoryItems from './InventoryItems';
import LoadingItem from './LoadingItem';

interface EquipmentItem {
  item: any;
  itemInstance: any;
  ornamentItem: any;
  perks?: any;
  stats?: any;
  state: any;
}

interface EquipmentSectionProps {
  section: string;
  isWeapon: boolean;
  isRightSide: boolean;
  current: EquipmentItem | undefined;
  inventory: EquipmentItem[];
  isOpen: boolean;
  toggleEquipmentSection: (section: string, isOpen: boolean) => void;
  handleEquip?: (item: any, itemInstanceId: string, state: any, ornamentItem: any) => Promise<void>;
  token: string;
  membershipType: number;
  characterId: string;
  membershipId: string;
  refresh: () => Promise<void>;
  characters: any;
  classDefinition: any;
  perksDefinition: any;
  statsDefinition: any;
  itemInstances: any;
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({
  section,
  isWeapon,
  isRightSide,
  current,
  inventory,
  isOpen,
  toggleEquipmentSection,
  handleEquip,
  token,
  membershipType,
  characterId,
  membershipId,
  refresh,
  characters,
  classDefinition,
  perksDefinition,
  statsDefinition,
  itemInstances,
}) => {
  // Common props for inventory items
  const commonInventoryProps = useMemo(() => ({
    token,
    membershipType,
    characterId,
    membershipId,
    refresh,
    characters,
    classDefinition,
    perksDefinition,
    statsDefinition,
    itemInstances,
  }), [token, membershipType, characterId, membershipId, refresh, characters, classDefinition, perksDefinition, statsDefinition, itemInstances]);

  // Common props for item component
  const commonItemProps = useMemo(() => ({
    characterId,
    characters, 
    classDefinition,
    perksDefinition,
    statsDefinition,
    itemInstances,
    membershipId,
    membershipType,
    token,
  }), [characterId, characters, classDefinition, perksDefinition, statsDefinition, itemInstances, membershipId, membershipType, token]);

  if (!current) return <LoadingItem />;

  const { item, itemInstance, ornamentItem, perks, stats, state } = current;

  return (
    <div
      className="flex flex-row gap-1"
      onMouseEnter={() => toggleEquipmentSection(section, true)}
      onMouseLeave={() => toggleEquipmentSection(section, false)}
    >
      <InventoryItems
        {...commonInventoryProps}
        items={inventory}
        open={isOpen}
        right={isRightSide}
        armors={!isWeapon}
        onEquip={isWeapon ? 
          async (item, itemInstanceId, state, ornamentItem) => 
            await handleEquip?.(item, itemInstanceId, state, ornamentItem) : 
          undefined}
      />
      <Item
        {...commonItemProps}
        item={item}
        itemInstance={itemInstance}
        ornamentItem={ornamentItem}
        state={state}
        perks={perks}
        stats={stats}
        armor={!isWeapon}
      />
    </div>
  );
};

export default EquipmentSection; 