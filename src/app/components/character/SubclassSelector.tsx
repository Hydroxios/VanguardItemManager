"use client";

import React, { useEffect, useRef, useState } from "react";
import Item from "./Item";
import { equipItem } from "@/lib/bungie";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import { DamageType } from "@/lib/helpers/damage-type";
import { EquipmentItem } from "@/lib/types";

interface SubclassSelectorProps {
  characterId: string;
  equipped: EquipmentItem;
  /** The character's other subclasses */
  others: EquipmentItem[];
  onEdit: (subclass: EquipmentItem) => void;
}

// Sizes in px: the equipped subclass and the ones around it
const EQUIPPED_SIZE = 96;
const SMALL_SIZE = 56;
// The prismatic button, lines included, and the star button that leaves prismatic
const PRISMATIC_BUTTON_SIZE = 56;
const ELEMENTS_BUTTON_SIZE = 32;
// Center of the switch button, from the top left of the equipped subclass, clear of the diamond's frame and of the
// formation: on the upper left of the diamond, or left of prismatic, outside its lines
const SWITCH_CENTER = { diamond: { x: 5, y: 3 }, round: { x: -29, y: EQUIPPED_SIZE / 2 } };
// The lines around the equipped prismatic subclass, drawn at the same scale as on the button
const PRISMATIC_AURA_SIZE = 150;
// Distance between two neighbouring diamonds of the formation, along each axis
const STEP = SMALL_SIZE / 2 + 2;
// Room between the formation and the equipped diamond
const FORMATION_GAP = 14;
// The slot takes the width of an item tile in the column, the larger diamond overflowing evenly on both sides
const TILE_SIZE = 64;

// Like in game, the other elements form a diamond on the left: the first one sits next to the equipped subclass
const ELEMENT_ORDER = [DamageType.Arc, DamageType.Solar, DamageType.Void, DamageType.Stasis, DamageType.Strand];
// In STEP units, from the center of the formation
const POSITIONS = [
  { x: 1, y: 0 }, // right
  { x: 0, y: -1 }, // top
  { x: 0, y: 1 }, // bottom
  { x: -1, y: 0 }, // left
  { x: -2, y: -1 }, // only needed when prismatic is equipped
];

// The last elemental subclass each character had equipped, for the prismatic "switch back" button
const lastElementalKey = (characterId: string) => `lastElementalSubclass:${characterId}`;
const readLastElemental = (characterId: string) => {
  try {
    return localStorage.getItem(lastElementalKey(characterId)) ?? undefined;
  } catch {
    return undefined;
  }
};
const saveLastElemental = (characterId: string, itemInstanceId: string) => {
  try {
    localStorage.setItem(lastElementalKey(characterId), itemInstanceId);
  } catch {
    // Storage unavailable (private mode...): the button falls back to the first element
  }
};

/** The element of a subclass, or undefined for prismatic (which reports kinetic). */
const elementOf = (subclass: EquipmentItem) => {
  const element = subclass.item?.talentGrid?.hudDamageType ?? subclass.item?.defaultDamageType;
  return element !== undefined && ELEMENT_ORDER.includes(element) ? element : undefined;
};

/** A diamond outline of the given bounding size, centered on its parent. */
const DiamondFrame = ({ size, className }: { size: number; className: string }) => (
  <span
    aria-hidden
    className={`pointer-events-none absolute left-1/2 top-1/2 rotate-45 border ${className}`}
    style={{ width: size / Math.SQRT2, height: size / Math.SQRT2, marginLeft: -size / Math.SQRT2 / 2, marginTop: -size / Math.SQRT2 / 2 }}
  />
);

/**
 * The prismatic lines, in a 100 x 100 view box: squares that turn slowly and go from squares to circles and back.
 * The game draws them around the prismatic button, and around the prismatic subclass once equipped.
 */
const PrismaticLines = () => (
  <g fill="none" stroke="#f3c6e2" strokeOpacity={0.45} strokeWidth={0.8}>
    <g className="prismatic-lines">
      {[0, 15, 30, 45, 60, 75].map((angle) => (
        <rect key={angle} x={22} y={22} width={56} height={56} transform={`rotate(${angle} 50 50)`}>
          <animate attributeName="rx" values="0;28;0" dur="8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
        </rect>
      ))}
    </g>
  </g>
);

/** The button that switches to prismatic: the character's class icon on a magenta disc, inside the prismatic lines. */
const PrismaticButton = ({ size, classHash }: { size: number; classHash?: number }) => {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
      <defs>
        <radialGradient id="prismatic-disc" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#a8407f" />
          <stop offset="100%" stopColor="#5c1f45" />
        </radialGradient>
      </defs>
      <PrismaticLines />
      <circle cx={50} cy={50} r={29} fill="url(#prismatic-disc)" stroke="#f3c6e2" strokeOpacity={0.5} strokeWidth={1} />
      {classHash !== undefined && <image href={`/${classHash}.svg`} x={32} y={32} width={36} height={36} />}
    </svg>
  );
};

/** With prismatic equipped, the button that switches back to the last elemental subclass: a framed diamond holding a star. */
const ElementsDiamond = ({ size }: { size: number }) => (
  <span aria-hidden className="relative block" style={{ width: size, height: size }}>
    <DiamondFrame size={size} className="border-white/60 bg-white/10" />
    <svg className="absolute inset-0 m-auto" width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24">
      <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill="white" fillOpacity={0.85} />
    </svg>
  </span>
);

/**
 * The subclass slot, laid out as in game: the equipped subclass as a large diamond, the other elements in a
 * diamond formation on its left (empty slots for the ones not unlocked) and a button on its upper left that switches to prismatic.
 * With prismatic equipped, it becomes a framed orb with no formation, and the button on its left switches back to
 * the last elemental subclass.
 * A click edits a subclass, a double click equips it.
 */
const SubclassSelector = ({ characterId, equipped, others, onEdit }: SubclassSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { user, characters, equipItemLocally } = useProfile();
  const { addNotification } = useNotifications();
  const { hideTooltip } = useItemTooltipActions();

  const equippedElement = elementOf(equipped);
  const prismaticEquipped = equippedElement === undefined;

  useEffect(() => {
    if (!prismaticEquipped) saveLastElemental(characterId, equipped.itemInstanceId);
  }, [characterId, equipped.itemInstanceId, prismaticEquipped]);

  // A double click starts with a click: wait to know which one it is
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(clickTimer.current), []);

  const equip = async (subclass: EquipmentItem) => {
    clearTimeout(clickTimer.current);
    hideTooltip();
    setOpen(false);
    const icon = `https://www.bungie.net${subclass.item.displayProperties.icon}`;
    try {
      await equipItem(user.membershipType, characterId, subclass.itemInstanceId);
      equipItemLocally(characterId, subclass.itemInstanceId);
      // No refresh: Bungie serves a cached profile for a while after a change, which would undo the local update
      addNotification(`Successfully Equipped ${subclass.item.displayProperties.name} !`, "", "success", icon, 5000);
    } catch (err) {
      addNotification(`Error while equipping ${subclass.item.displayProperties.name} !`, err instanceof Error ? err.message : "", "error", icon, 5000);
    }
  };

  const edit = (subclass: EquipmentItem, delayed: boolean) => {
    clearTimeout(clickTimer.current);
    const openEditor = () => {
      setOpen(false);
      onEdit(subclass);
    };
    if (delayed) clickTimer.current = setTimeout(openEditor, 250);
    else openEditor();
  };

  const renderSubclass = (subclass: EquipmentItem, size: number, isEquipped = false) => (
    <div
      onClick={() => edit(subclass, !isEquipped)}
      title={isEquipped ? "Click to edit" : "Click to edit, double click to equip"}
    >
      <Item
        itemHash={subclass.hash}
        itemInstanceId={subclass.itemInstanceId}
        state={subclass.state}
        characterId={characterId}
        size={size}
        onDoubleClick={isEquipped ? undefined : () => equip(subclass)}
      />
    </div>
  );

  const prismatic = others.find((subclass) => elementOf(subclass) === undefined);
  const slots = ELEMENT_ORDER
    .filter((element) => element !== equippedElement)
    .map((element) => ({ element, subclass: others.find((other) => elementOf(other) === element) }));

  // What the prismatic button equips: the last elemental subclass, else the first one in the game's order
  const elementals = others.filter((subclass) => elementOf(subclass) !== undefined);
  const lastElemental = prismaticEquipped
    ? elementals.find((subclass) => subclass.itemInstanceId === readLastElemental(characterId))
      ?? slots.map((slot) => slot.subclass).find((subclass) => !!subclass)
    : undefined;

  // Center of the formation, from the left edge of the equipped diamond
  const originX = -(FORMATION_GAP + SMALL_SIZE / 2 + STEP);
  const formationLeft = originX - 2 * STEP - SMALL_SIZE / 2;

  return (
    <div
      className="relative"
      style={{ width: EQUIPPED_SIZE, height: EQUIPPED_SIZE, marginInline: (TILE_SIZE - EQUIPPED_SIZE) / 2 }}
      // With prismatic equipped there is no formation, like in game
      onMouseEnter={() => !prismaticEquipped && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {open ? (
        // Covers the whole formation up to the equipped diamond, so moving between them keeps it open
        <div
          className="absolute"
          style={{ left: formationLeft, top: EQUIPPED_SIZE / 2 - STEP - SMALL_SIZE / 2, width: -formationLeft, height: 2 * STEP + SMALL_SIZE }}
        >
          {slots.map(({ element, subclass }, index) => {
            const { x, y } = POSITIONS[index];
            return (
              <div
                key={element}
                className="absolute"
                style={{
                  left: originX - formationLeft + x * STEP - SMALL_SIZE / 2,
                  top: STEP + y * STEP,
                  width: SMALL_SIZE,
                  height: SMALL_SIZE,
                }}
              >
                <DiamondFrame size={SMALL_SIZE + 6} className={subclass ? "border-white/30" : "border-white/20"} />
                {subclass && renderSubclass(subclass, SMALL_SIZE)}
              </div>
            );
          })}
        </div>
      ) : (
        !prismaticEquipped && slots.some((slot) => slot.subclass) && (
          // Tells there are other subclasses to pick, like the small diamond in game
          <span
            aria-hidden
            className="absolute rotate-45 bg-white/25"
            style={{ width: 12, height: 12, left: -FORMATION_GAP - 12, top: EQUIPPED_SIZE / 2 - 6 }}
          />
        )
      )}

      {prismaticEquipped ? (
        <>
          <svg
            aria-hidden
            className="pointer-events-none absolute overflow-visible"
            width={PRISMATIC_AURA_SIZE}
            height={PRISMATIC_AURA_SIZE}
            viewBox="0 0 100 100"
            style={{ left: (EQUIPPED_SIZE - PRISMATIC_AURA_SIZE) / 2, top: (EQUIPPED_SIZE - PRISMATIC_AURA_SIZE) / 2 }}
          >
            <PrismaticLines />
          </svg>
          <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-full border border-white/60" />
        </>
      ) : (
        <DiamondFrame size={EQUIPPED_SIZE + 8} className="border-white/60" />
      )}
      {renderSubclass(equipped, EQUIPPED_SIZE, true)}

      {/* The button that switches to prismatic (upper left), or back to the last element when prismatic is equipped (left) */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2"
        style={{
          left: SWITCH_CENTER[prismaticEquipped ? "round" : "diamond"].x,
          top: SWITCH_CENTER[prismaticEquipped ? "round" : "diamond"].y,
        }}
      >
        {prismaticEquipped ? (
          lastElemental && (
            <button
              onClick={() => equip(lastElemental)}
              title={`Switch back to ${lastElemental.item.displayProperties.name}`}
              className="flex opacity-70 transition-opacity hover:opacity-100"
            >
              <ElementsDiamond size={ELEMENTS_BUTTON_SIZE} />
            </button>
          )
        ) : (
          prismatic && (
            <button
              onClick={() => equip(prismatic)}
              title={`Switch to ${prismatic.item.displayProperties.name}`}
              className="flex transition-[filter] hover:brightness-125"
            >
              <PrismaticButton size={PRISMATIC_BUTTON_SIZE} classHash={characters[characterId]?.classHash} />
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default SubclassSelector;
