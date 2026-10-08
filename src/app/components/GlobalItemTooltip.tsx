"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { ITEM_TILE_ATTRIBUTE, useItemTooltip } from "@/lib/hooks/useItemTooltip";
import { useDebug } from "@/app/components/debug/DebugProvider";
import DebugInfos from "@/app/components/debug/DebugInfos";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import useTransferItem from "@/lib/hooks/useTransferItem";
import TooltipHeader from "./tooltip/TooltipHeader";
import TooltipStats from "./tooltip/TooltipStats";
import { ArmorPerks, WeaponPerks } from "./tooltip/TooltipPerks";
import TooltipActions from "./tooltip/TooltipActions";
import TooltipSubclass from "./tooltip/TooltipSubclass";
import { getArmorSockets, getItemKind, getWeaponSockets, isEnhancedPerk } from "@/lib/helpers/item-sockets";
import { getArmorStatRows, getWeaponStatRows } from "@/lib/helpers/item-stats";
import { placeTooltip } from "@/lib/helpers/tooltip-position";
import { isFreePlug } from "@/lib/helpers/mods";
import useSocketPlug from "@/lib/hooks/useSocketPlug";

const TOOLTIP_WIDTH = "min(400px, calc(100vw - 20px))";

/** Below this width the tooltip is a sheet along the bottom of the screen */
const SHEET_QUERY = "(max-width: 640px)";

const subscribeToMedia = (callback: () => void) => {
  const media = window.matchMedia(SHEET_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const useSheetLayout = () => useSyncExternalStore(subscribeToMedia, () => window.matchMedia(SHEET_QUERY).matches, () => false);

/** Whether Shift is held, to compare the item with the one equipped in its slot */
let shiftHeld = false;
const subscribeToShift = (callback: () => void) => {
  const update = (held: boolean) => () => {
    if (shiftHeld === held) return;
    shiftHeld = held;
    callback();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Shift") update(e.type === "keydown")(); };
  const onBlur = update(false);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", onKey);
    window.removeEventListener("blur", onBlur);
  };
};
const useShiftHeld = () => useSyncExternalStore(subscribeToShift, () => shiftHeld, () => false);

const GlobalItemTooltip = () => {
  const { tooltipState, keepOpen, closeTooltip, scheduleHide, cancelHide, registerTooltipElement } = useItemTooltip();
  const { item, itemInstanceId, anchor, anchorElement, open, pinned, characterId, state, drawTransfert } = tooltipState;

  const tooltipRef = useRef<HTMLDivElement>(null);
  const sheet = useSheetLayout();
  const shift = useShiftHeld();

  const { debugMode } = useDebug();
  const {
    itemDefinitions,
    statsDefinitions,
    perksDefinitions,
    objectiveDefinitions,
    classDefinitions,
    itemConstantsDefinitions,
    statGroupDefinitions,
    equipableItemSetDefinitions,
    materialRequirementDefinitions,
  } = useDefinitions();
  const { itemComponents, characters, characterEquipment } = useProfile();
  const { locateItem } = useTransferItem();
  const { canChange: canChangePerks, pendingSocket, insertPlug } = useSocketPlug(itemInstanceId);

  const kind = item ? getItemKind(item) : "generic";
  const weaponSockets = useMemo(() => item && kind === "weapon" ? getWeaponSockets(item, itemInstanceId, itemComponents, itemDefinitions) : undefined,
    [item, kind, itemInstanceId, itemComponents, itemDefinitions]);
  const armorSockets = useMemo(() => item && kind === "armor" ? getArmorSockets(item, itemInstanceId, itemComponents, itemDefinitions) : undefined,
    [item, kind, itemInstanceId, itemComponents, itemDefinitions]);

  // The character whose gear matters: the one holding the item, else the one it is shown for
  const located = locateItem(itemInstanceId);
  const ornament = located.item?.overrideStyleItemHash ? itemDefinitions[located.item.overrideStyleItemHash] : undefined;
  const ownerId = located.location && located.location !== "vault" ? located.location : (characterId || Object.keys(characters)[0]);
  const slotHash = item?.equippingBlock?.equipmentSlotTypeHash;
  const equippedGear = (characterEquipment[ownerId]?.items ?? []).filter((i) => itemDefinitions[i.itemHash]);
  const compared = shift && (kind === "weapon" || kind === "armor")
    ? equippedGear.find((i) => itemDefinitions[i.itemHash].equippingBlock?.equipmentSlotTypeHash === slotHash && i.itemInstanceId !== itemInstanceId)
    : undefined;
  const compareStats = compared ? itemComponents.stats[compared.itemInstanceId]?.stats : undefined;

  const statContext = item && {
    definition: item,
    itemInstanceId,
    itemComponents,
    itemDefinitions,
    statGroupDefinitions,
    compareStats,
  };
  const statRows = !statContext ? []
    : weaponSockets ? getWeaponStatRows({ ...statContext, masterwork: weaponSockets.masterwork, mods: weaponSockets.mods })
      : armorSockets ? getArmorStatRows({ ...statContext, masterwork: armorSockets.masterwork, mods: armorSockets.mods })
        : [];

  const itemSet = equipableItemSetDefinitions[item?.equippingBlock?.equipableItemSetHash ?? 0];
  const equippedSetCount = itemSet
    ? equippedGear.filter((i) => itemDefinitions[i.itemHash].equippingBlock?.equipableItemSetHash === itemSet.hash).length
    : 0;

  // The provider reads the tooltip's box to tell when the pointer heads for it
  useLayoutEffect(() => {
    registerTooltipElement(open && item ? tooltipRef.current : null);
  }, [open, item, registerTooltipElement]);

  // Next to the item, in the viewport, and kept there as long as it is open: the item can scroll, the window
  // can resize and the tooltip's content can grow (icons loading, Shift comparison, a new perk). Positions are
  // written straight on the element, so following the item doesn't cost a render
  useLayoutEffect(() => {
    const tooltipElement = tooltipRef.current;
    if (!open || !item || !tooltipElement) return;
    if (sheet) {
      // The sheet is placed by its classes; drop any position left from the floating layout
      tooltipElement.style.left = "";
      tooltipElement.style.top = "";
      return;
    }

    // The item's last known box, for when it leaves the page (moved, filtered out)
    let lastAnchor = anchor;
    const place = () => {
      if (anchorElement?.isConnected) {
        const { left, top, right, bottom } = anchorElement.getBoundingClientRect();
        lastAnchor = { left, top, right, bottom };
      }
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      // An unpinned tooltip goes away with its item when the item is scrolled out of sight, unless it is kept open
      if (!pinned && !keepOpen && (lastAnchor.bottom < 0 || lastAnchor.top > viewport.height || lastAnchor.right < 0 || lastAnchor.left > viewport.width)) {
        closeTooltip();
        return;
      }
      const { width, height } = tooltipElement.getBoundingClientRect();
      const { left, top } = placeTooltip(lastAnchor, { width, height }, viewport);
      tooltipElement.style.left = `${left}px`;
      tooltipElement.style.top = `${top}px`;
    };
    place();

    // Several changes in one frame only place it once
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; place(); });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(tooltipElement);
    if (anchorElement) observer.observe(anchorElement);
    window.addEventListener("resize", schedule);
    // Capture: scrolling any container (inventory, vault) can move the item
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
    };
  }, [open, item, anchor, anchorElement, pinned, keepOpen, sheet, closeTooltip]);

  // Escape always closes; a click elsewhere closes a pinned tooltip (a click on another item opens that one instead)
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") closeTooltip(); };
    const onPointerDown = (e: PointerEvent) => {
      if (!pinned && !sheet) return;
      const target = e.target as Element | null;
      if (tooltipRef.current?.contains(target) || target?.closest(`[${ITEM_TILE_ATTRIBUTE}]`)) return;
      closeTooltip();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, pinned, sheet, closeTooltip]);

  if (!open || !item) {
    return null;
  }

  const gear = kind === "weapon" || kind === "armor";
  const enhanced = weaponSockets?.columns.some((column) => isEnhancedPerk(column.current)) ?? false;

  return (
    <div
      ref={tooltipRef}
      role={pinned || sheet ? "dialog" : "tooltip"}
      aria-label={item.displayProperties.name}
      className={`item-tooltip fixed z-[1005] flex flex-col items-start overflow-y-auto overflow-x-hidden bg-[#0c0e13]/95 backdrop-blur-md pointer-events-auto ${sheet ? "inset-x-0 bottom-0 max-h-[80vh] border-t border-white/20 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]" : "max-h-[calc(100vh-20px)] ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.75)]"}`}
      style={sheet ? undefined : {
        // left and top are set by the layout effect above
        // Subclasses size to their content; other items keep a fixed width
        width: kind === "subclass" ? undefined : TOOLTIP_WIDTH,
        maxWidth: "min(720px, calc(100vw - 20px))",
        minWidth: "min(350px, calc(100vw - 20px))",
      }}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") cancelHide(); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") scheduleHide(); }}
    >
      <TooltipHeader
        item={item}
        ornament={ornament}
        itemInstanceId={itemInstanceId}
        itemComponents={itemComponents}
        itemConstantsDefinitions={itemConstantsDefinitions}
        objectiveDefinitions={objectiveDefinitions}
        state={state}
        enhanced={enhanced}
        onClose={pinned || sheet ? closeTooltip : undefined}
      />

      {gear ? (
        <>
          <TooltipStats
            item={item}
            instance={itemInstanceId ? itemComponents.instances[itemInstanceId] : undefined}
            armor={kind === "armor"}
            rows={statRows}
            statsDefinitions={statsDefinitions}
            comparing={!!compareStats}
          />
          {weaponSockets && (
            <WeaponPerks
              sockets={weaponSockets}
              perksDefinitions={perksDefinitions}
              // Perks that cost materials (enhanced, crafted) can only be changed in game
              canSelect={canChangePerks ? (plug) => isFreePlug(plug, materialRequirementDefinitions) : undefined}
              onSelect={insertPlug}
              pendingSocket={pendingSocket}
            />
          )}
          {armorSockets && (
            <ArmorPerks sockets={armorSockets} perksDefinitions={perksDefinitions} itemSet={itemSet} equippedSetCount={equippedSetCount} />
          )}
        </>
      ) : item.displayProperties.description ? (
        <div className={`w-full p-4 text-left text-gray-200 ${kind === "subclass" ? "text-center" : ""}`}>
          {item.displayProperties.description}
        </div>
      ) : null}

      {kind === "subclass" && (
        <TooltipSubclass
          item={item}
          itemInstanceId={itemInstanceId}
        />
      )}

      {item.flavorText && (
        <div className={`w-full border-t border-white/10 px-4 py-2.5 text-[13px] italic leading-snug text-gray-400 ${kind === "subclass" ? "text-center" : "text-left"}`}>
          {item.flavorText}
        </div>
      )}

      {kind !== "subclass" && drawTransfert && (
        <TooltipActions
          item={item}
          itemInstanceId={itemInstanceId}
          kind={kind}
          characterId={characterId}
          characters={characters}
          classDefinitions={classDefinitions}
        />
      )}

      {gear && !sheet && (
        <div className="w-full border-t border-white/10 bg-black/30 px-3 py-1 text-left text-[11px] text-gray-500">
          {compared
            ? `Compared with ${itemDefinitions[compared.itemHash].displayProperties.name}`
            : shift ? "Nothing equipped to compare with" : "Hold Shift to compare with the equipped item"}
        </div>
      )}

      {debugMode && (
        <DebugInfos
          data={{
            itemInstance: itemComponents.instances[itemInstanceId!],
            ...itemComponents.perks[itemInstanceId!],
            ...(itemComponents.stats[itemInstanceId!] ?? {}),
            sockets: itemComponents.sockets[itemInstanceId!],
            item,
            perksDefinitions: [
              itemComponents?.perks?.[itemInstanceId!]?.perks?.map(
                (p) => perksDefinitions[p.perkHash]
              ),
            ],
          }}
        />
      )}
    </div>
  );
};

export default GlobalItemTooltip;
