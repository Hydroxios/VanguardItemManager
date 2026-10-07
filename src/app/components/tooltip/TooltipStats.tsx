import WeaponStat from "../WeaponStat";
import { getDamageTypeIcon } from "@/lib/helpers/damage-type";
import Image from "next/image";
import { ItemComponents, ItemDefinition, StatsDefinitions } from "@/lib/types";
import { ARMOR_STATS } from "@/lib/constants";

interface TooltipStatsProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: ItemComponents;
    statsDefinitions: StatsDefinitions;
    armor: boolean;
}

const TooltipStats = ({
    item,
    itemInstanceId,
    itemComponents,
    statsDefinitions,
    armor,
}: TooltipStatsProps) => {
    // Read stats straight from the profile so switching items never shows the previous item's values
    const stats = itemInstanceId ? itemComponents.stats[itemInstanceId]?.stats : undefined;
    const impact = stats?.[4043523819];
    const range = stats?.[1240592695];
    const stability = stats?.[155624089];
    const handling = stats?.[943549884];
    const reloadSpeed = stats?.[4188031367];
    const rpm = stats?.[4284893193];
    const magazine = stats?.[3871231066];
    const blastRadius = stats?.[3614673599];
    const velocity = stats?.[2523465841];
    const chargeTime = stats?.[2961396640];
    const drawTime = stats?.[447667954];
    const mobility = stats?.[ARMOR_STATS.MOBILITY];
    const resilience = stats?.[ARMOR_STATS.RESILIENCE];
    const recovery = stats?.[ARMOR_STATS.RECOVERY];
    const discipline = stats?.[ARMOR_STATS.DISCIPLINE];
    const intellect = stats?.[ARMOR_STATS.INTELLECT];
    const strength = stats?.[ARMOR_STATS.STRENGTH];

    const statName = (stat: { statHash: number } | undefined, fallback: string) => {
        return (stat && statsDefinitions[stat.statHash]?.displayProperties?.name) ?? fallback;
    }

    const renderAmmoType = () => {
        if (!item?.equippingBlock) return null;
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
                <Image src={icon} height={48} width={48} alt="Ammo type" />
                <div className="text-md font-bold">{name.toLocaleUpperCase()}</div>
            </div>
        );
    };

    return (
        <>
            <div className="flex flex-col" style={{ width: "100%" }}>
                <div className="flex flex-row items-center justify-between gap-2 p-4">
                    <div className="flex flex-row items-center gap-2">
                        {!armor && (
                            <Image
                                src={getDamageTypeIcon(item.defaultDamageType)}
                                height={48}
                                width={48}
                                alt="Damage type"
                            />
                        )}
                        <div
                            className="text-5xl font-bold"
                            style={{
                                color: "white",
                            }}
                        >
                            {itemInstanceId && itemComponents.instances[itemInstanceId]?.primaryStat?.value}
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
                                        name={statName(impact, "Impact")}
                                        value={impact.value}
                                        bar={true}
                                    />
                                )}
                                {range && (
                                    <WeaponStat
                                        name={statName(range, "Range")}
                                        value={range.value}
                                        bar={true}
                                    />
                                )}
                                {stability && (
                                    <WeaponStat
                                        name={statName(stability, "Stability")}
                                        value={stability.value}
                                        bar={true}
                                    />
                                )}
                                {handling && (
                                    <WeaponStat
                                        name={statName(handling, "Handling")}
                                        value={handling.value}
                                        bar={true}
                                    />
                                )}
                                {reloadSpeed && (
                                    <WeaponStat
                                        name={statName(reloadSpeed, "Reload Speed")}
                                        value={reloadSpeed.value}
                                        bar={true}
                                    />
                                )}
                                {(chargeTime || drawTime) && (
                                    <div className="mb-1">
                                        {chargeTime && (
                                            <WeaponStat
                                                name={statName(chargeTime, "Charge Time")}
                                                value={chargeTime.value}
                                                bar={true}
                                            />
                                        )}
                                        {drawTime && (
                                            <WeaponStat
                                                name={statName(drawTime, "Draw Time")}
                                                value={drawTime.value}
                                                bar={true}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Projectile-based stats */}
                                {blastRadius && (
                                    <WeaponStat
                                        name={statName(blastRadius, "Blast Radius")}
                                        value={blastRadius.value}
                                        bar={true}
                                    />
                                )}
                                {velocity && (
                                    <WeaponStat
                                        name={statName(velocity, "Velocity")}
                                        value={velocity.value}
                                        bar={true}
                                    />
                                )}
                                {rpm && <WeaponStat name={"RPM"} value={rpm.value} bar={false} />}
                                {magazine && (
                                    <WeaponStat
                                        name={statName(magazine, "Magazine")}
                                        value={magazine.value}
                                        bar={false}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {armor && (
                <div className="flex flex-col justify-center items-center p-2 w-full border-t border-gray-500">
                    {mobility && (
                        <WeaponStat
                            name={
                                statsDefinitions[mobility.statHash]?.displayProperties?.name ||
                                "Mobility"
                            }
                            value={mobility.value}
                            bar={true}
                            max={40}
                        />
                    )}
                    {resilience && (
                        <WeaponStat
                            name={
                                statsDefinitions[resilience.statHash]?.displayProperties?.name ||
                                "Resilience"
                            }
                            value={resilience.value}
                            bar={true}
                            max={40}
                        />
                    )}
                    {recovery && (
                        <WeaponStat
                            name={
                                statsDefinitions[recovery.statHash]?.displayProperties?.name ||
                                "Recovery"
                            }
                            value={recovery.value}
                            bar={true}
                            max={40}
                        />
                    )}
                    {discipline && (
                        <WeaponStat
                            name={
                                statsDefinitions[discipline.statHash]?.displayProperties?.name ||
                                "Discipline"
                            }
                            value={discipline.value}
                            bar={true}
                            max={40}
                        />
                    )}
                    {intellect && (
                        <WeaponStat
                            name={
                                statsDefinitions[intellect.statHash]?.displayProperties?.name ||
                                "Intellect"
                            }
                            value={intellect.value}
                            bar={true}
                            max={40}
                        />
                    )}
                    {strength && (
                        <WeaponStat
                            name={
                                statsDefinitions[strength.statHash]?.displayProperties?.name ||
                                "Strength"
                            }
                            value={strength.value}
                            bar={true}
                            max={40}
                        />
                    )}
                </div>
            )}
        </>
    );
};

export default TooltipStats;
