import Image from "next/image";
import TooltipStatRow from "./TooltipStatRow";
import { getDamageTypeIcon } from "@/lib/helpers/damage-type";
import { StatRow } from "@/lib/helpers/item-stats";
import { AMMO_TYPES } from "@/lib/constants";
import { ItemDefinition, ItemInstance, StatsDefinitions } from "@/lib/types";

interface TooltipStatsProps {
    item: ItemDefinition;
    instance?: ItemInstance;
    armor: boolean;
    rows: StatRow[];
    statsDefinitions: StatsDefinitions;
    /** Whether the rows carry a comparison with another item */
    comparing: boolean;
}

const AMMO: Record<number, { icon: string, name: string }> = {
    [AMMO_TYPES.PRIMARY]: { icon: "./primary.svg", name: "Primary" },
    [AMMO_TYPES.SPECIAL]: { icon: "./special.svg", name: "Special" },
    [AMMO_TYPES.HEAVY]: { icon: "./heavy.svg", name: "Heavy" },
};

const TooltipStats = ({ item, instance, armor, rows, statsDefinitions, comparing }: TooltipStatsProps) => {
    const ammo = AMMO[item.equippingBlock?.ammoType ?? 0];
    // The instance knows the weapon's current element, which can differ from its default one
    const damageType = instance?.damageType || item.defaultDamageType;
    const total = armor ? rows.reduce((sum, row) => sum + row.value, 0) : 0;
    const name = (row: StatRow) => statsDefinitions[row.statHash]?.displayProperties?.name || "Stat";

    return (
        <div className="flex w-full flex-col">
            <div className="flex flex-row items-center gap-2 px-4 py-2">
                {!armor && damageType > 0 && (
                    <Image src={getDamageTypeIcon(damageType)} height={40} width={40} alt="Damage type" />
                )}
                <div className="text-4xl font-semibold tracking-tight text-white">{instance?.primaryStat?.value}</div>
                {!armor && ammo && (
                    <>
                        <div className="mx-2 h-8 border-l border-white/15" />
                        <div className="flex flex-row items-center gap-2">
                            <Image src={ammo.icon} height={40} width={40} alt="" />
                            <div className="text-sm font-bold uppercase tracking-widest text-gray-200">{ammo.name}</div>
                        </div>
                    </>
                )}
                {armor && rows.length > 0 && (
                    <div className="ml-auto flex flex-col items-end leading-tight">
                        <span className="text-xs uppercase tracking-wide text-gray-400">Total</span>
                        <span className="text-2xl font-bold tabular-nums">{total}</span>
                    </div>
                )}
            </div>
            {rows.length > 0 && (
                <div className="flex w-full flex-col border-t border-white/10 bg-white/[0.02] px-4 py-1.5">
                    {rows.map((row) => (
                        <TooltipStatRow key={row.statHash} name={name(row)} row={row} comparing={comparing} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TooltipStats;
