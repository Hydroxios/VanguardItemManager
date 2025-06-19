"use client";

import { useCallback } from 'react';
import EquipmentSection from './EquipmentSection';
import { EquipmentSection as EquipmentSectionType } from '@/lib/types/destinyTypes';

interface EquipmentProps {
  equipment: Record<string, EquipmentSectionType>;
  toggleEquipmentSection: (section: string, isOpen: boolean) => void;
  handleEquip: (section: string, item: any, itemInstanceId: string, state: any, ornamentItem: any) => Promise<void>;
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

const Equipment: React.FC<EquipmentProps> = ({
  equipment,
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
  const commonSectionProps = {
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
  };

  // Handle equipment section for weapons with the special equip handler
  const handleWeaponEquip = useCallback(
    (section: string) => {
      return async (item: any, itemInstanceId: string, state: any, ornamentItem: any) => {
        return handleEquip(section, item, itemInstanceId, state, ornamentItem);
      };
    },
    [handleEquip]
  );

  return (
    <div className="flex justify-center items-center mt-4">
      <div className="flex flex-row gap-10 items-center">
        {/* Weapons Column */}
        <div className="flex flex-col gap-5">
          <EquipmentSection
            section="primary"
            isWeapon={true}
            isRightSide={false}
            current={equipment.primary.current}
            inventory={equipment.primary.inventory}
            isOpen={equipment.primary.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            handleEquip={handleWeaponEquip('primary')}
            {...commonSectionProps}
          />
          <EquipmentSection
            section="energetic"
            isWeapon={true}
            isRightSide={false}
            current={equipment.energetic.current}
            inventory={equipment.energetic.inventory}
            isOpen={equipment.energetic.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            handleEquip={handleWeaponEquip('energetic')}
            {...commonSectionProps}
          />
          <EquipmentSection
            section="heavy"
            isWeapon={true}
            isRightSide={false}
            current={equipment.heavy.current}
            inventory={equipment.heavy.inventory}
            isOpen={equipment.heavy.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            handleEquip={handleWeaponEquip('heavy')}
            {...commonSectionProps}
          />
        </div>
        
        {/* Armor Column */}
        <div className="flex flex-col gap-5">
          <EquipmentSection
            section="helmet"
            isWeapon={false}
            isRightSide={true}
            current={equipment.helmet.current}
            inventory={equipment.helmet.inventory}
            isOpen={equipment.helmet.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            {...commonSectionProps}
          />
          <EquipmentSection
            section="arms"
            isWeapon={false}
            isRightSide={true}
            current={equipment.arms.current}
            inventory={equipment.arms.inventory}
            isOpen={equipment.arms.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            {...commonSectionProps}
          />
          <EquipmentSection
            section="chest"
            isWeapon={false}
            isRightSide={true}
            current={equipment.chest.current}
            inventory={equipment.chest.inventory}
            isOpen={equipment.chest.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            {...commonSectionProps}
          />
          <EquipmentSection
            section="legs"
            isWeapon={false}
            isRightSide={true}
            current={equipment.legs.current}
            inventory={equipment.legs.inventory}
            isOpen={equipment.legs.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            {...commonSectionProps}
          />
          <EquipmentSection
            section="classItem"
            isWeapon={false}
            isRightSide={true}
            current={equipment.classItem.current}
            inventory={equipment.classItem.inventory}
            isOpen={equipment.classItem.isOpen}
            toggleEquipmentSection={toggleEquipmentSection}
            {...commonSectionProps}
          />
        </div>
      </div>
    </div>
  );
};

export default Equipment; 