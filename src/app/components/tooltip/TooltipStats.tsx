import { useEffect, useState } from "react";
import WeaponStat from "../WeaponStat";
import { ItemDefinition } from "@/lib/hooks/useDefinitions";
import { getDamageTypeIcon } from "@/lib/helpers/damage-type";
import Image from "next/image";

interface TooltipStatsProps {
    item: ItemDefinition;
    itemInstanceId?: string;
    itemComponents: any;
    statsDefinitions: any;
    armor: boolean;
}

const TooltipStats = ({
    item,
    itemInstanceId,
    itemComponents,
    statsDefinitions,
    armor,
}: TooltipStatsProps) => {
    // Common weapon stats
    const [impact, setImpact] = useState<any>();
    const [range, setRange] = useState<any>();
    const [stability, setStability] = useState<any>();
    const [handling, setHandling] = useState<any>();
    const [reloadSpeed, setReloadSpeed] = useState<any>();
    // Additional weapon stats
    // eslint-disable-next-line
    const [aimAssistance, setAimAssistance] = useState<any>();
    // eslint-disable-next-line
    const [zoom, setZoom] = useState<any>();
    // eslint-disable-next-line
    const [recoilDirection, setRecoilDirection] = useState<any>();
    const [rpm, setRpm] = useState<any>();
    const [magazine, setMagazine] = useState<any>();
    const [blastRadius, setBlastRadius] = useState<any>();
    const [velocity, setVelocity] = useState<any>();
    const [chargeTime, setChargeTime] = useState<any>();
    const [drawTime, setDrawTime] = useState<any>();
    // eslint-disable-next-line
    const [inventorySize, setInventorySize] = useState<any>();
    // eslint-disable-next-line
    const [airborneEffectiveness, setAirborneEffectiveness] = useState<any>();

    //Armor stats
    const [mobility, setMobility] = useState<any>();
    const [resilience, setResilience] = useState<any>();
    const [recovery, setRecovery] = useState<any>();
    const [discipline, setDiscipline] = useState<any>();
    const [intellect, setIntellect] = useState<any>();
    const [strength, setStrength] = useState<any>();

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
    }, [armor, item, itemInstanceId, itemComponents]);

    const statName = (stat: any, fallback: string) => {
        return statsDefinitions[stat?.statHash]?.displayProperties?.name ?? fallback;
    }

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
