"use client"

import { useEffect, useState } from "react"
import WeaponStat from "./WeaponStat"

interface ItemTooltipProps {
    item :any
    itemInstance :any
    itemInstances :any
    positions :{x :number, y :number}
    itemPerks :any
    itemStats :any
    statsDefinition :any
    perksDefinition :any
    open :boolean
    characters :any
    characterId :any
    classDefinition :any
    armor :boolean
}

const ItemTooltip = ({item, itemInstance, itemInstances, itemPerks, itemStats, positions, statsDefinition, perksDefinition, classDefinition, open, characterId, characters, armor}:ItemTooltipProps) => {
    const [impact, setImpact] = useState<any>()
    const [range, setRange] = useState<any>()
    const [stability, setStability] = useState<any>()
    const [handling, setHandling] = useState<any>()
    const [reloadSpeed, setReloadSpeed] = useState<any>()

    const [damageIcon, setDamageIcon] = useState("./kinetic.svg")
    const [color, setColor] = useState("#ffffff")

    useEffect(() => {
        if(!armor && itemStats) {
            setImpact(() => itemStats.stats[4043523819])
            setRange(() => itemStats.stats[1240592695])
            setStability(() => itemStats.stats[155624089])
            setHandling(() => itemStats.stats[943549884])
            setReloadSpeed(() => itemStats.stats[4188031367])
        }
        switch(item.defaultDamageType){
            case 7: setDamageIcon("./strand.png"); setColor("#35e366"); break;
            case 6: setDamageIcon("./stasis.svg"); setColor("#4d88ff"); break;
            case 4: setDamageIcon("./void.svg"); setColor("#A371C2"); break;
            case 3: setDamageIcon("./solar.svg"); setColor("#ef641f"); break;
            case 2: setDamageIcon("./arc.svg"); setColor("#79bbe7"); break;
            case 1: setDamageIcon("./kinetic.svg"); setColor("#FFFFFF"); break;
        }
    }, [itemInstance])

    const getBackgroundColor = () => {
        switch(item.inventory.tierType){
            case 6: return "#ccad30"
            case 5: return "#522f65"
        }
    }

    if(!open){
        return (<></>)
    }

    return (
        <div className={`flex flex-col fixed items-start bg-black bg-opacity-75 w-[275px] gap-2 z-[1000]`} style={{top: positions.y, left: positions.x}}>
            <div className="p-1" style={{backgroundColor: getBackgroundColor(), width: "100%", textAlign: "left"}}>
                <div className="text-lg font-bold">{item.displayProperties.name.toUpperCase()}</div>
                <div className="text-gray-300">{item.itemTypeDisplayName}</div>
            </div>
            <div className="flex flex-col" style={{width: "100%"}}>
                <div className="flex flex-row items-center gap-2 p-2">
                    {!armor && <img src={damageIcon} height={48} width={48}/>}
                    <div className="text-4xl" style={{color: color}}>{itemInstances[itemInstance.itemInstanceId].primaryStat.value ?? "Unknown"}</div>
                </div>
                {!armor && (
                    <div className="p-2">
                        {impact && <WeaponStat name={statsDefinition[impact.statHash].displayProperties.name} value={impact.value} bar={true}/>}
                        {range && <WeaponStat name={statsDefinition[range.statHash].displayProperties.name} value={range.value} bar={true}/>}
                        {stability && <WeaponStat name={statsDefinition[stability.statHash].displayProperties.name} value={stability.value} bar={true}/>}
                        {handling && <WeaponStat name={statsDefinition[handling.statHash].displayProperties.name} value={handling.value} bar={true}/>}
                        {reloadSpeed && <WeaponStat name={statsDefinition[reloadSpeed.statHash].displayProperties.name} value={reloadSpeed.value} bar={true}/>}
                    </div>
                )}
            </div>
            <div className="flex flex-col justify-between pl-2 pr-2 gap-2" style={{width: "100%"}}>
                {!armor && itemPerks && itemPerks.perks && itemPerks.perks.filter((p :any) => p.visible && p.isActive).map((perk :any, index :number) => (
                    <div key={index} className="flex flex-row items-center gap-4">
                        <img src={"https://www.bungie.net" + perk.iconPath} height={32} width={32}/>
                        <div>{perksDefinition[perk.perkHash].displayProperties.name}</div>
                    </div>
                ))}
            </div>
            <div className="flex flex-row p-2 items-center justify-between border-t border-gray-500" style={{width: "100%"}}>
                <div className="flex flex-row gap-2">
                    {Object.values(characters).filter((c :any) => c.characterId !== characterId).map((c :any) => (
                        <button key={c.characterId}>
                            <img src={classDefinition[c.classHash].displayProperties.name.toLowerCase() + ".svg"} height={32} width={32}/>
                        </button>
                    ))}
                </div>
                <div className="flex flex-row gap-2">
                    <button
                        onClick={() => {}}
                    >
                        <img src="vault2.svg" height={32} width={32}/>
                    </button>
                    <button
                        onClick={() => window.open("https://www.light.gg/db/items/" + item.hash)}
                    >
                        <img src="./lightgg.png" height={32} width={32}/>
                    </button>
                </div>
            </div>
        </div>
    )
} 

export default ItemTooltip;