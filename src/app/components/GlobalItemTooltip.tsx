"use client";

import { useEffect, useState, useLayoutEffect } from "react";
import WeaponStat from "./WeaponStat";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import { useDebug } from "@/app/components/debug/DebugProvider";
import DebugInfos from "@/app/components/debug/DebugInfos";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { safeTransferItem, transferItem } from "@/lib/bungie";
import useAuth from "@/lib/hooks/useAuth";
import { useNotifications } from "./NotificationsProvider";

const GlobalItemTooltip = () => {
  const { tooltipState, hideTooltip, keepOpen } = useItemTooltip();
  const {
    item,
    itemInstanceId,
    positions,
    open,
    characterId,
    armor,
    state,
    drawTransfert,
  } = tooltipState;

  // Common weapon stats
  const [impact, setImpact] = useState<any>();
  const [range, setRange] = useState<any>();
  const [stability, setStability] = useState<any>();
  const [handling, setHandling] = useState<any>();
  const [reloadSpeed, setReloadSpeed] = useState<any>();
  // Additional weapon stats
  const [aimAssistance, setAimAssistance] = useState<any>();
  const [zoom, setZoom] = useState<any>();
  const [recoilDirection, setRecoilDirection] = useState<any>();
  const [rpm, setRpm] = useState<any>();
  const [magazine, setMagazine] = useState<any>();
  const [blastRadius, setBlastRadius] = useState<any>();
  const [velocity, setVelocity] = useState<any>();
  const [chargeTime, setChargeTime] = useState<any>();
  const [drawTime, setDrawTime] = useState<any>();
  const [inventorySize, setInventorySize] = useState<any>();
  const [airborneEffectiveness, setAirborneEffectiveness] = useState<any>();

  //Armor stats
  const [mobility, setMobility] = useState<any>();
  const [resilience, setResilience] = useState<any>();
  const [recovery, setRecovery] = useState<any>();
  const [discipline, setDiscipline] = useState<any>();
  const [intellect, setIntellect] = useState<any>();
  const [strength, setStrength] = useState<any>();

  // UI state
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const [tooltipWidth, setTooltipWidth] = useState(275); // Default width

  const [damageIcon, setDamageIcon] = useState("./kinetic.svg");
  const [color, setColor] = useState("#ffffff");

  const { debugMode } = useDebug();
  const {
    statsDefinitions,
    perksDefinitions,
    classDefinitions,
    itemConstantsDefinitions,
  } = useDefinitions();
  const { itemComponents, characters } = useProfile();
  const { addNotification } = useNotifications();
  const { token } = useAuth();
  const { user, refresh } = useProfile();
  // Check if an item is a material
  const isMaterial = (item: any) => {
    // Materials typically don't have equippingBlock
    // or they might have specific itemCategoryHashes
    return (
      item &&
      (!item.equippingBlock ||
        (item.inventory && item.inventory.stackUniqueLabel))
    );
  };

  // Adjust tooltip position to stay within viewport bounds
  useLayoutEffect(() => {
    if (!open || !item) return;

    // Set initial position
    let newX = positions.x;
    let newY = positions.y;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Reference to tooltip element for measuring
    const tooltipElement = document.querySelector(
      ".item-tooltip"
    ) as HTMLElement;
    if (tooltipElement) {
      // Get tooltip dimensions
      const tooltipRect = tooltipElement.getBoundingClientRect();
      setTooltipHeight(tooltipRect.height);
      setTooltipWidth(tooltipRect.width);

      // Adjust X position if needed
      if (newX + tooltipRect.width > viewportWidth) {
        newX = viewportWidth - tooltipRect.width - 10; // 10px margin
      }
      if (newX < 0) {
        newX = 10;
      }

      // Adjust Y position if needed
      if (newY + tooltipRect.height > viewportHeight) {
        // Position above the cursor if it would overflow at the bottom
        newY = viewportHeight - tooltipRect.height - 250; // 10px margin
      }
      if (newY < 0) {
        newY = 20;
      }

      setAdjustedPosition({ x: newX, y: newY });
    } else {
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [open, item, positions, tooltipHeight]);

  const renderAmmoType = () => {
    if (!item) return null;
    const ammoType = item.equippingBlock.ammoType;
    let icon = "./primary.svg";
    let name = "Primary";
    switch (ammoType) {
      case 1:
        icon = "./primary.svg";
        name = "Primary";
        break;
      case 2:
        icon = "./special.svg";
        name = "Special";
        break;
      case 3:
        icon = "./heavy.svg";
        name = "Heavy";
        break;
    }
    return (
      <div className="flex flex-row items-center gap-2">
        <img src={icon} height={48} width={48} alt="Ammo type" />
        <div className="text-md font-bold">{name.toLocaleUpperCase()}</div>
      </div>
    );
  };
  useEffect(() => {
    if (!itemInstanceId) return;
    if (!armor) {
      // Common weapon stats
      if (!itemComponents.stats[itemInstanceId]) return;
      setImpact(() => itemComponents.stats[itemInstanceId].stats[4043523819]);
      setRange(() => itemComponents.stats[itemInstanceId].stats[1240592695]);
      setStability(() => itemComponents.stats[itemInstanceId].stats[155624089]);
      setHandling(() => itemComponents.stats[itemInstanceId].stats[943549884]);
      setReloadSpeed(
        () => itemComponents.stats[itemInstanceId].stats[4188031367]
      );

      // Additional weapon stats - using known Destiny 2 stat hash IDs
      setAimAssistance(
        () => itemComponents.stats[itemInstanceId].stats[1345609583]
      );
      setZoom(() => itemComponents.stats[itemInstanceId].stats[3555269338]);
      setRecoilDirection(
        () => itemComponents.stats[itemInstanceId].stats[2715839340]
      );
      setRpm(() => itemComponents.stats[itemInstanceId].stats[4284893193]);
      setMagazine(() => itemComponents.stats[itemInstanceId].stats[3871231066]);
      setBlastRadius(
        () => itemComponents.stats[itemInstanceId].stats[3614673599]
      );
      setVelocity(() => itemComponents.stats[itemInstanceId].stats[2523465841]);
      setChargeTime(
        () => itemComponents.stats[itemInstanceId].stats[2961396640]
      );
      setDrawTime(() => itemComponents.stats[itemInstanceId].stats[447667954]);
      setInventorySize(
        () => itemComponents.stats[itemInstanceId].stats[1931675084]
      );
      setAirborneEffectiveness(
        () => itemComponents.stats[itemInstanceId].stats[2714457168]
      );
    }
    if (armor) {
      setMobility(() => itemComponents.stats[itemInstanceId].stats[2996146975]);
      setResilience(
        () => itemComponents.stats[itemInstanceId].stats[392767087]
      );
      setRecovery(() => itemComponents.stats[itemInstanceId].stats[1943323491]);
      setDiscipline(
        () => itemComponents.stats[itemInstanceId].stats[1735777505]
      );
      setIntellect(() => itemComponents.stats[itemInstanceId].stats[144602215]);
      setStrength(() => itemComponents.stats[itemInstanceId].stats[4244567218]);
    }
    if (item) {
      switch (item.defaultDamageType) {
        case 7:
          setDamageIcon("./strand.png");
          setColor("#35e366");
          break;
        case 6:
          setDamageIcon("./stasis.svg");
          setColor("#4d88ff");
          break;
        case 4:
          setDamageIcon("./void.svg");
          setColor("#A371C2");
          break;
        case 3:
          setDamageIcon("./solar.svg");
          setColor("#ef641f");
          break;
        case 2:
          setDamageIcon("./arc.svg");
          setColor("#79bbe7");
          break;
        case 1:
          setDamageIcon("./kinetic.svg");
          setColor("#FFFFFF");
          break;
      }
    }
  }, [armor, item]);

  const getBackgroundColor = () => {
    if (!item) return "";
    switch (item.inventory.tierType) {
      case 6:
        return "#ccad30";
      case 5:
        return "#522f65";
      default:
        return "";
    }
  };

  const renderWeaponPerks = () => {
    if (!item) return null;
    if(!itemInstanceId) return;
    const filteredPerks = itemComponents.perks[itemInstanceId].perks.filter(
      (p) => p.isActive && p.visible
    );
    const frame = filteredPerks[0];
    const perks = [filteredPerks[1], filteredPerks[2]].filter(p => p);
    const mod = filteredPerks.length > 4 ? filteredPerks[3] : undefined;
    const originTrait = filteredPerks[filteredPerks.length - 1];
    return (
      <div className="flex flex-col w-full">
        <div
          key={"frame"}
          className="flex flex-row items-center gap-4 bg-gray-500 bg-opacity-25 w-full p-2"
        >
          <img
            src={`https://www.bungie.net${frame.iconPath}`}
            height={32}
            width={32}
          />
          <div className="flex flex-col text-left">
            <div>{perksDefinitions[frame.perkHash].displayProperties.name}</div>
            {item.inventory.tierType === 6 && (<div className="text-sm max-w-[300px]">{perksDefinitions[frame.perkHash].displayProperties.description}</div>)}
          </div>
        </div>
        <div
          key={"perks"}
          className="flex flex-row gap-2 w-full p-2 items-center justify-center"
        >
          {perks.map((p) => (
            <div key={p.perkHash}>
                {p && (
                    <div className="rounded rounded-full bg-sky-500 p-1">
                    <img
                        src={`https://www.bungie.net${perksDefinitions[p.perkHash].displayProperties.icon}`}
                        height={32}
                        width={32}
                    />
                    </div>
                )}
            </div>
          ))}
          {originTrait && (
            <div className="rounded rounded-full bg-sky-500 p-1">
            <img
              src={`https://www.bungie.net${originTrait.iconPath}`}
              height={32}
              width={32}
            />
          </div>
          )}
          {mod && (
            <img
              src={`https://www.bungie.net${mod.iconPath}`}
              height={32}
              width={40}
            />
          )}
        </div>
      </div>
    );
  };

  if (!open || !item) {
    return null;
  }

  const materialItem = isMaterial(item);

  return (
    <div
      className={`flex flex-col fixed items-start bg-black bg-opacity-90 z-[2000] pointer-events-auto item-tooltip max-h-[90vh] overflow-y-auto overflow-x-hidden`}
      style={{
        top: adjustedPosition.y,
        left: adjustedPosition.x,
        minWidth: "350px",
        maxWidth: "calc(100vh - 20px)"
      }}
      onMouseLeave={() => {
        if (!keepOpen) {
          hideTooltip();
        }
      }}
    >
      {state & 4 ? <div className="masterwork-shine-bar"></div> : null}
      <div
        className="p-2"
        style={{
          background:
            state & 4 && item.inventory.tierType !== 6
              ? `linear-gradient(to bottom,rgb(145, 110, 17) 0%, transparent 30%), ${getBackgroundColor()}`
              : getBackgroundColor(),
          width: "100%",
          textAlign: "left",
          height: "75px",
        }}
      >
        <div className="flex justify-between items-center w-full">
          <div className="text-lg font-bold">
            {item.displayProperties.name.toUpperCase()}
            <div className="text-gray-300 text-md !font-normal">
              {item.itemTypeDisplayName}
            </div>
          </div>
          {item.isFeaturedItem ? (
            <img
              src={`https://bungie.net${item.iconWatermarkShelved}`}
              className="absolute top-[-2] right-[-70px]"
            />
          ) : (
            <img
              src={`https://bungie.net${item.iconWatermark}`}
              className="absolute top-[-2] right-[-70px]"
            />
          )}
          {itemInstanceId && itemComponents.instances[itemInstanceId] && itemComponents.instances[itemInstanceId!].gearTier > 0 ? (
            <img
              src={`https://bungie.net${
                itemConstantsDefinitions["1"].gearTierOverlayImagePaths[
                  Math.max(
                    0,
                    itemComponents.instances[itemInstanceId!].gearTier - 1
                  )
                ]
              }`}
              height={64}
              width={64}
              className="absolute right-[-43px] top-[10px]"
            />
          ) : (
            ""
          )}
        </div>
      </div>
      <div className="flex flex-col" style={{ width: "100%" }}>
        {materialItem ? (
          <div className="p-4 text-gray-200">
            {item.displayProperties.description}
          </div>
        ) : (
          <>
            <div className="flex flex-row items-center justify-between gap-2 p-4">
              <div className="flex flex-row items-center gap-2">
                {!armor && (
                  <img
                    src={damageIcon}
                    height={48}
                    width={48}
                    alt="Damage type"
                  />
                )}
                <div
                  className="text-5xl font-bold"
                  style={{
                    color:
                      itemComponents.instances[itemInstanceId!].primaryStat
                        .value > 200
                        ? "aqua"
                        : "white",
                  }}
                >
                  {itemInstanceId &&
                    itemComponents.instances[itemInstanceId].primaryStat.value +
                      (itemComponents.instances[itemInstanceId].primaryStat
                        .value > 200
                        ? "+"
                        : "")}
                </div>
                {!armor && (
                  <>
                    <div className="border-solid border-l border-l-gray-500 h-8 mx-2" />
                    {renderAmmoType()}
                  </>
                )}
              </div>
            </div>
            {!armor && (
              <div>
                {/* Primary weapon stats section */}
                <div className="flex flex-col items-center w-full border-t border-gray-500">
                  <div className="py-2">
                    {impact && (
                      <WeaponStat
                        name={
                          statsDefinitions[impact.statHash].displayProperties
                            .name
                        }
                        value={impact.value}
                        bar={true}
                      />
                    )}
                    {range && (
                      <WeaponStat
                        name={
                          statsDefinitions[range.statHash].displayProperties
                            .name
                        }
                        value={range.value}
                        bar={true}
                      />
                    )}
                    {stability && (
                      <WeaponStat
                        name={
                          statsDefinitions[stability.statHash].displayProperties
                            .name
                        }
                        value={stability.value}
                        bar={true}
                      />
                    )}
                    {handling && (
                      <WeaponStat
                        name={
                          statsDefinitions[handling.statHash].displayProperties
                            .name
                        }
                        value={handling.value}
                        bar={true}
                      />
                    )}
                    {reloadSpeed && (
                      <WeaponStat
                        name={
                          statsDefinitions[reloadSpeed.statHash]
                            .displayProperties.name
                        }
                        value={reloadSpeed.value}
                        bar={true}
                      />
                    )}
                    {(chargeTime || drawTime) && (
                      <div className="mb-1">
                        {chargeTime && (
                          <WeaponStat
                            name={
                              statsDefinitions[chargeTime.statHash]
                                .displayProperties.name
                            }
                            value={chargeTime.value}
                            bar={true}
                          />
                        )}
                        {drawTime && (
                          <WeaponStat
                            name={
                              statsDefinitions[drawTime.statHash]
                                .displayProperties.name
                            }
                            value={drawTime.value}
                            bar={true}
                          />
                        )}
                      </div>
                    )}

                    {/* Projectile-based stats */}
                    {blastRadius && (
                      <WeaponStat
                        name={
                          statsDefinitions[blastRadius.statHash]
                            .displayProperties.name
                        }
                        value={blastRadius.value}
                        bar={true}
                      />
                    )}
                    {velocity && (
                      <WeaponStat
                        name={
                          statsDefinitions[velocity.statHash].displayProperties
                            .name
                        }
                        value={velocity.value}
                        bar={true}
                      />
                    )}
                    {rpm && (
                      <WeaponStat name={"RPM"} value={rpm.value} bar={false} />
                    )}
                    {magazine && (
                      <WeaponStat
                        name={
                          statsDefinitions[magazine.statHash].displayProperties
                            .name
                        }
                        value={magazine.value}
                        bar={false}
                      />
                    )}
                  </div>
                </div>
                {/* Weapon Perks section */}
                {itemComponents.perks[itemInstanceId!] && (
                  <div className="border-t border-gray-500">
                    {itemComponents.perks[itemInstanceId!].perks &&
                      renderWeaponPerks()}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {armor && (
          <div className="flex flex-col justify-center items-center p-2 w-full border-t border-gray-500">
            {mobility && (
              <WeaponStat
                name={
                  statsDefinitions[mobility.statHash]?.displayProperties
                    ?.name || "Mobility"
                }
                value={mobility.value}
                bar={true}
                max={40}
              />
            )}
            {resilience && (
              <WeaponStat
                name={
                  statsDefinitions[resilience.statHash]?.displayProperties
                    ?.name || "Resilience"
                }
                value={resilience.value}
                bar={true}
                max={40}
              />
            )}
            {recovery && (
              <WeaponStat
                name={
                  statsDefinitions[recovery.statHash]?.displayProperties
                    ?.name || "Recovery"
                }
                value={recovery.value}
                bar={true}
                max={40}
              />
            )}
            {discipline && (
              <WeaponStat
                name={
                  statsDefinitions[discipline.statHash]?.displayProperties
                    ?.name || "Discipline"
                }
                value={discipline.value}
                bar={true}
                max={40}
              />
            )}
            {intellect && (
              <WeaponStat
                name={
                  statsDefinitions[intellect.statHash]?.displayProperties
                    ?.name || "Intellect"
                }
                value={intellect.value}
                bar={true}
                max={40}
              />
            )}
            {strength && (
              <WeaponStat
                name={
                  statsDefinitions[strength.statHash]?.displayProperties
                    ?.name || "Strength"
                }
                value={strength.value}
                bar={true}
                max={40}
              />
            )}
          </div>
      )}
      {armor && (
        <div className="w-full border-t border-gray-500">
          <div className="flex flex-col p-2">
          {itemInstanceId &&
            itemComponents.perks[itemInstanceId] &&
            itemComponents.perks[itemInstanceId].perks
              .filter((p) => p.isActive && p.visible && (p.iconPath as string).length > 0)
              .map((p, idx: number) => {
                const perkDef = perksDefinitions[p.perkHash];
                return (
                  <div
                    key={idx}
                    className="flex flex-row items-center gap-2 mb-2"
                  >
                    <img
                      src={`https://www.bungie.net${p.iconPath}`}
                      height={32}
                      width={32}
                      alt={perkDef.displayProperties.name ?? "Perk"}
                    />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold text-gray-200">
                        {perkDef.displayProperties.name || "Perk"}
                      </span>
                      <span className="text-xs text-gray-400 max-w-[350px]">
                        {perkDef.displayProperties.description ?? ""}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      <div
        className="border-t w-full border-gray-500 py-2 max-w-[400px]"
      >
        {item.flavorText}
      </div>
      {drawTransfert && (
        <div
          className="flex flex-row p-2 items-center justify-between border-t border-gray-500"
          style={{ width: "100%" }}
        >
          <div className="flex flex-row gap-2">
            {Object.values(characters)
              .filter((c) => c.characterId !== characterId)
              .map((c) => (
                <button
                  key={c.characterId}
                  className="hover:opacity-80 transition-opacity"
                  onClick={async () => {
                    if(itemComponents.instances[itemInstanceId!].isEquipped){
                      await safeTransferItem(
                        token as string,
                        user.membershipType,
                        item.hash,
                        itemInstanceId!,
                        characterId,
                        c.characterId,
                        user.membershipId
                      );
                    } else {
                      await transferItem(token as string, user.membershipType, item.hash, itemInstanceId!, characterId, true)
                      await transferItem(token as string, user.membershipType, item.hash, itemInstanceId!, c.characterId, false)
                    }
                    
                    addNotification(
                      "Item transfered to your " +
                        classDefinitions[c.classHash].displayProperties.name,
                      item.displayProperties.name,
                      "success",
                      "https://www.bungie.net" + item.displayProperties.icon,
                      5000
                    );
                    refresh();
                  }}
                >
                  <img
                    src={
                      classDefinitions[
                        c.classHash
                      ].displayProperties.name.toLowerCase() + ".svg"
                    }
                    height={32}
                    width={32}
                    alt={classDefinitions[c.classHash].displayProperties.name}
                  />
                </button>
              ))}
          </div>
          <div className="flex flex-row gap-2">
            <button
              className="hover:opacity-80 transition-opacity"
              onClick={async () => {
                await safeTransferItem(
                  token as string,
                  user.membershipType,
                  item.hash,
                  itemInstanceId!,
                  characterId,
                  "vault",
                  user.membershipId
                );
                addNotification(
                  "Item transfered to your vault",
                  item.displayProperties.name,
                  "success",
                  "https://www.bungie.net" + item.displayProperties.icon,
                  5000
                );
                refresh();
              }}
            >
              <img src="vault2.svg" height={32} width={32} alt="Vault" />
            </button>
            {!armor && (
              <button
                className="hover:opacity-80 transition-opacity"
                onClick={() =>
                  item && window.open(`https://d2foundry.gg/w/${item.hash}`)
                }
              >
                <img
                  src="https://d2foundry.gg/_next/image?url=%2Fassets%2Ffoundry_logo_pride.png&w=32&q=75"
                  className="rounded-lg"
                  height={32}
                  width={32}
                  alt="Light.gg"
                />
              </button>
            )}
          </div>
        </div>
      )}
      {debugMode && (
        <DebugInfos
          data={{
            itemInstance: itemComponents.instances[itemInstanceId!],
            ...itemComponents.perks[itemInstanceId!],
            ...itemComponents.stats[itemInstanceId!] ?? {},
            item,
            perksDefinitions: [
              itemComponents.perks[itemInstanceId!].perks?.map(
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
