"use client"

import { useEffect, useState, useLayoutEffect } from "react"
import WeaponStat from "./WeaponStat"
import { useItemTooltip } from "@/lib/hooks/useItemTooltip"
import { useDebug } from "./DebugProvider"
import DebugInfos from "./DebugInfos"

const GlobalItemTooltip = () => {
    const { tooltipState } = useItemTooltip();
    const { 
        item, 
        itemInstance, 
        itemInstances, 
        itemPerks, 
        itemStats, 
        positions, 
        statsDefinition, 
        perksDefinition, 
        classDefinition, 
        open, 
        characterId, 
        characters, 
        armor 
    } = tooltipState;

    // Common weapon stats
    const [impact, setImpact] = useState<any>()
    const [range, setRange] = useState<any>()
    const [stability, setStability] = useState<any>()
    const [handling, setHandling] = useState<any>()
    const [reloadSpeed, setReloadSpeed] = useState<any>()
    // Additional weapon stats
    const [aimAssistance, setAimAssistance] = useState<any>()
    const [zoom, setZoom] = useState<any>()
    const [recoilDirection, setRecoilDirection] = useState<any>()
    const [rpm, setRpm] = useState<any>()
    const [magazine, setMagazine] = useState<any>()
    const [blastRadius, setBlastRadius] = useState<any>()
    const [velocity, setVelocity] = useState<any>()
    const [chargeTime, setChargeTime] = useState<any>()
    const [drawTime, setDrawTime] = useState<any>()
    const [inventorySize, setInventorySize] = useState<any>()
    const [airborneEffectiveness, setAirborneEffectiveness] = useState<any>()

    // UI state
    const [showAdvancedStats, setShowAdvancedStats] = useState(false);
    const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
    const [tooltipHeight, setTooltipHeight] = useState(0);
    const [tooltipWidth, setTooltipWidth] = useState(275); // Default width

    const [damageIcon, setDamageIcon] = useState("./kinetic.svg")
    const [color, setColor] = useState("#ffffff")

    const {debugMode} = useDebug()

    // Check if an item is a material
    const isMaterial = (item: any) => {
        // Materials typically don't have equippingBlock 
        // or they might have specific itemCategoryHashes
        return item && (
            !item.equippingBlock || 
            (item.inventory && item.inventory.stackUniqueLabel)
        );
    }

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
        const tooltipElement = document.querySelector('.item-tooltip') as HTMLElement;
        if (tooltipElement) {
            // Get tooltip dimensions
            const tooltipRect = tooltipElement.getBoundingClientRect();
            setTooltipHeight(tooltipRect.height);
            setTooltipWidth(tooltipRect.width);

            // Adjust X position if needed
            if (newX + tooltipRect.width > viewportWidth) {
                newX = viewportWidth - tooltipRect.width - 10; // 10px margin
            }
            
            // Adjust Y position if needed
            if (newY + tooltipRect.height > viewportHeight) {
                // Position above the cursor if it would overflow at the bottom
                newY = viewportHeight - tooltipRect.height - 10; // 10px margin
                
                // If tooltip is too tall, position at top with small margin
                if (newY < 0) {
                    newY = 10;
                }
            }

            // Ensure tooltip doesn't go beyond the top of the screen
            if (newY < 0) {
                newY = 10;
            }

            setAdjustedPosition({ x: newX, y: newY });
        } else {
            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [open, item, positions, tooltipHeight]);

    useEffect(() => {
        if(!armor && itemStats && itemStats.stats) {
            // Common weapon stats
            setImpact(() => itemStats.stats[4043523819])
            setRange(() => itemStats.stats[1240592695])
            setStability(() => itemStats.stats[155624089])
            setHandling(() => itemStats.stats[943549884])
            setReloadSpeed(() => itemStats.stats[4188031367])
            
            // Additional weapon stats - using known Destiny 2 stat hash IDs
            setAimAssistance(() => itemStats.stats[1345609583])
            setZoom(() => itemStats.stats[3555269338])
            setRecoilDirection(() => itemStats.stats[2715839340])
            setRpm(() => itemStats.stats[4284893193])
            setMagazine(() => itemStats.stats[3871231066])
            setBlastRadius(() => itemStats.stats[3614673599])
            setVelocity(() => itemStats.stats[2523465841])
            setChargeTime(() => itemStats.stats[2961396640])
            setDrawTime(() => itemStats.stats[447667954])
            setInventorySize(() => itemStats.stats[1931675084])
            setAirborneEffectiveness(() => itemStats.stats[2714457168])
        }
        if (item) {
            switch(item.defaultDamageType){
                case 7: setDamageIcon("./strand.png"); setColor("#35e366"); break;
                case 6: setDamageIcon("./stasis.svg"); setColor("#4d88ff"); break;
                case 4: setDamageIcon("./void.svg"); setColor("#A371C2"); break;
                case 3: setDamageIcon("./solar.svg"); setColor("#ef641f"); break;
                case 2: setDamageIcon("./arc.svg"); setColor("#79bbe7"); break;
                case 1: setDamageIcon("./kinetic.svg"); setColor("#FFFFFF"); break;
            }
        }
    }, [itemInstance, armor, itemStats, item])

    const getBackgroundColor = () => {
        if (!item) return "";
        switch(item.inventory.tierType){
            case 6: return "#ccad30"
            case 5: return "#522f65"
            default: return ""
        }
    }

    if(!open || !item){
        return null;
    }

    const materialItem = isMaterial(item);

    return (
        <div 
            className={`flex flex-col fixed items-start bg-black bg-opacity-75 w-[275px] gap-2 z-[1000] pointer-events-auto item-tooltip max-h-[90vh] overflow-y-auto`} 
            style={{
                top: adjustedPosition.y,
                left: adjustedPosition.x,
                maxWidth: "calc(100vw - 20px)" // Ensure it doesn't overflow horizontally
            }}
        >
            <div className="p-1" style={{backgroundColor: getBackgroundColor(), width: "100%", textAlign: "left"}}>
                <div className="flex justify-between items-center">
                    <div className="text-lg font-bold">{item.displayProperties.name.toUpperCase()}</div>
                    {itemInstance && itemInstance.quantity && itemInstance.quantity > 1 && (
                        <div className="bg-black bg-opacity-50 text-white text-sm px-2 py-0.5 rounded">
                            {itemInstance.quantity}
                        </div>
                    )}
                </div>
                <div className="text-gray-300">{item.itemTypeDisplayName}</div>
            </div>
            <div className="flex flex-col" style={{width: "100%"}}>
                {materialItem ? (
                    <div className="p-4 text-gray-200">
                        {item.displayProperties.description}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-row items-center gap-2 p-2">
                            {!armor && <img src={damageIcon} height={48} width={48} alt="Damage type" />}
                            <div className="text-4xl" style={{color: color}}>
                                {((itemInstance && itemInstance.itemInstanceId && itemInstances[itemInstance.itemInstanceId]?.primaryStat?.value) ?? "Unknown")}
                            </div>
                        </div>
                        {!armor && (
                            <div className="p-2 border-t border-gray-700">
                                {/* Primary weapon stats section */}
                                <div className="mb-3">
                                    <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Primary Stats</div>
                                    {impact && statsDefinition && <WeaponStat name={statsDefinition[impact.statHash].displayProperties.name} value={impact.value} bar={true}/>}
                                    {range && statsDefinition && <WeaponStat name={statsDefinition[range.statHash].displayProperties.name} value={range.value} bar={true}/>}
                                    {stability && statsDefinition && <WeaponStat name={statsDefinition[stability.statHash].displayProperties.name} value={stability.value} bar={true}/>}
                                    {handling && statsDefinition && <WeaponStat name={statsDefinition[handling.statHash].displayProperties.name} value={handling.value} bar={true}/>}
                                    {reloadSpeed && statsDefinition && <WeaponStat name={statsDefinition[reloadSpeed.statHash].displayProperties.name} value={reloadSpeed.value} bar={true}/>}
                                </div>
                                
                                {/* Performance stats section */}
                                <div className="mb-3">
                                    <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Performance</div>
                                    {rpm && statsDefinition && <WeaponStat name={"RPM"} value={rpm.value} bar={false}/>}
                                    {magazine && statsDefinition && <WeaponStat name={statsDefinition[magazine.statHash].displayProperties.name} value={magazine.value} bar={false}/>}
                                </div>
                                
                                {/* Weapon-specific stats section - Only show if at least one is available */}
                                {(blastRadius || velocity || chargeTime || drawTime) && (
                                    <div className="mb-3">
                                        <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Weapon Specifics</div>
                                        
                                        {/* Group time-based stats together */}
                                        {(chargeTime || drawTime) && (
                                            <div className="mb-1">
                                                {chargeTime && statsDefinition && (
                                                    <WeaponStat 
                                                        name={statsDefinition[chargeTime.statHash].displayProperties.name} 
                                                        value={chargeTime.value} 
                                                        bar={true}
                                                    />
                                                )}
                                                {drawTime && statsDefinition && (
                                                    <WeaponStat 
                                                        name={statsDefinition[drawTime.statHash].displayProperties.name} 
                                                        value={drawTime.value} 
                                                        bar={true}
                                                    />
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Projectile-based stats */}
                                        {blastRadius && statsDefinition && <WeaponStat name={statsDefinition[blastRadius.statHash].displayProperties.name} value={blastRadius.value} bar={true}/>}
                                        {velocity && statsDefinition && <WeaponStat name={statsDefinition[velocity.statHash].displayProperties.name} value={velocity.value} bar={true}/>}
                                    </div>
                                )}
                                
                                {/* Hidden stats section - Toggle this with a button */}
                                {(aimAssistance || recoilDirection || zoom || inventorySize || airborneEffectiveness) && (
                                    <div>
                                        <button 
                                            className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1 flex items-center justify-between w-full"
                                            onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                                        >
                                            <span>Advanced Stats</span>
                                            <span className="transform transition-transform duration-300" style={{ transform: showAdvancedStats ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
                                        </button>
                                        {showAdvancedStats && (
                                            <div className="pt-1 animate-fadeIn">
                                                {aimAssistance && statsDefinition && <WeaponStat name={statsDefinition[aimAssistance.statHash].displayProperties.name} value={aimAssistance.value} bar={true}/>}
                                                {recoilDirection && statsDefinition && <WeaponStat name={statsDefinition[recoilDirection.statHash].displayProperties.name} value={recoilDirection.value} bar={true}/>}
                                                {zoom && statsDefinition && <WeaponStat name={statsDefinition[zoom.statHash].displayProperties.name} value={zoom.value} bar={false}/>}
                                                {inventorySize && statsDefinition && <WeaponStat name={statsDefinition[inventorySize.statHash].displayProperties.name} value={inventorySize.value} bar={true}/>}
                                                {airborneEffectiveness && statsDefinition && <WeaponStat name={statsDefinition[airborneEffectiveness.statHash].displayProperties.name} value={airborneEffectiveness.value} bar={true}/>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        
                    </>
                )}
            </div>
            {armor && (
                    <div className="flex flex-row gap-2 ml-4 border-t border-gray-700">
                        {itemPerks.perks
                            .filter((p: any) => p.isActive && p.visible && (p.iconPath as string).length > 0)
                            .slice(0, 4)
                            .map((p: any) => (
                                    <>
                                        <img src={`https://www.bungie.net${p.iconPath}`} height={"48"} width={"48"} key={p.iconPath}/>
                                    </>
                            ))}
                        </div>
                    )
            }
            <div className="flex flex-col justify-between gap-2 perks border-t border-gray-700" style={{width: "100%"}}>
                {!materialItem && !armor && itemPerks && itemPerks.perks && perksDefinition && itemPerks.perks.filter((p :any) => p.visible && p.isActive).map((perk :any, index :number) => (
                    <div key={index} className="flex flex-row items-center gap-4 p-1">
                        <img src={"https://www.bungie.net" + perk.iconPath} height={32} width={32} alt={perksDefinition[perk.perkHash]?.displayProperties?.name || "Perk"} />
                        <div>{perksDefinition[perk.perkHash].displayProperties.name}</div>
                    </div>
                ))}
            </div>
            <div className="flex flex-row p-2 items-center justify-between border-t border-gray-700" style={{width: "100%"}}>
                <div className="flex flex-row gap-2">
                    {characters && Object.values(characters).filter((c :any) => c.characterId !== characterId).map((c :any) => (
                        <button key={c.characterId} className="hover:opacity-80 transition-opacity">
                            <img src={classDefinition[c.classHash].displayProperties.name.toLowerCase() + ".svg"} height={32} width={32} alt={classDefinition[c.classHash].displayProperties.name} />
                        </button>
                    ))}
                </div>
                <div className="flex flex-row gap-2">
                    <button
                        className="hover:opacity-80 transition-opacity"
                        onClick={() => {}}
                    >
                        <img src="vault2.svg" height={32} width={32} alt="Vault" />
                    </button>
                    <button
                        className="hover:opacity-80 transition-opacity"
                        onClick={() => item && window.open("https://www.light.gg/db/items/" + item.hash)}
                    >
                        <img src="./lightgg.png" height={32} width={32} alt="Light.gg" />
                    </button>
                </div>
            </div>
            {debugMode && <DebugInfos data={{itemInstance, itemPerks, itemStats, item}}/>}
            
        </div>
    )
} 

export default GlobalItemTooltip; 