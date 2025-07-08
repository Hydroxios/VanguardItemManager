"use client"

import { useEffect, useState, useLayoutEffect } from "react"
import WeaponStat from "./WeaponStat"
import { useItemTooltip } from "@/lib/hooks/useItemTooltip"
import { useDebug } from "@/app/components/debug/DebugProvider"
import DebugInfos from "@/app/components/debug/DebugInfos"
import { useDefinitions } from "@/lib/hooks/useDefinitions"
import { useProfile } from "@/lib/hooks/useProfile"

const GlobalItemTooltip = () => {
    const { tooltipState } = useItemTooltip();
    const { 
        item,
        itemInstanceId,
        positions,
        open, 
        characterId,
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

    //Armor stats
    const [mobility, setMobility] = useState<any>()
    const [resilience, setResilience] = useState<any>()
    const [recovery, setRecovery] = useState<any>()
    const [discipline, setDiscipline] = useState<any>()
    const [intellect, setIntellect] = useState<any>()
    const [strength, setStrength] = useState<any>()

    // UI state
    const [showAdvancedStats, setShowAdvancedStats] = useState(false);
    const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
    const [tooltipHeight, setTooltipHeight] = useState(0);
    const [tooltipWidth, setTooltipWidth] = useState(275); // Default width

    const [damageIcon, setDamageIcon] = useState("./kinetic.svg")
    const [color, setColor] = useState("#ffffff")

    const {debugMode} = useDebug()
    const { bucketDefinitions, statsDefinitions, perksDefinitions, classDefinitions } = useDefinitions()
    const { itemComponents, characters } = useProfile()


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
        if(!itemInstanceId) return;
        if(!armor) {
            // Common weapon stats
            setImpact(() => itemComponents.stats[itemInstanceId].stats[4043523819])
            setRange(() => itemComponents.stats[itemInstanceId].stats[1240592695])
            setStability(() => itemComponents.stats[itemInstanceId].stats[155624089])
            setHandling(() => itemComponents.stats[itemInstanceId].stats[943549884])
            setReloadSpeed(() => itemComponents.stats[itemInstanceId].stats[4188031367])
            
            // Additional weapon stats - using known Destiny 2 stat hash IDs
            setAimAssistance(() => itemComponents.stats[itemInstanceId].stats[1345609583])
            setZoom(() => itemComponents.stats[itemInstanceId].stats[3555269338])
            setRecoilDirection(() => itemComponents.stats[itemInstanceId].stats[2715839340])
            setRpm(() => itemComponents.stats[itemInstanceId].stats[4284893193])
            setMagazine(() => itemComponents.stats[itemInstanceId].stats[3871231066])
            setBlastRadius(() => itemComponents.stats[itemInstanceId].stats[3614673599])
            setVelocity(() => itemComponents.stats[itemInstanceId].stats[2523465841])
            setChargeTime(() => itemComponents.stats[itemInstanceId].stats[2961396640])
            setDrawTime(() => itemComponents.stats[itemInstanceId].stats[447667954])
            setInventorySize(() => itemComponents.stats[itemInstanceId].stats[1931675084])
            setAirborneEffectiveness(() => itemComponents.stats[itemInstanceId].stats[2714457168])
        }
        if(armor){
            setMobility(() => itemComponents.stats[itemInstanceId].stats[2996146975])
            setResilience(() => itemComponents.stats[itemInstanceId].stats[392767087])
            setRecovery(() => itemComponents.stats[itemInstanceId].stats[1943323491])
            setDiscipline(() => itemComponents.stats[itemInstanceId].stats[1735777505])
            setIntellect(() => itemComponents.stats[itemInstanceId].stats[144602215])
            setStrength(() => itemComponents.stats[itemInstanceId].stats[4244567218])
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
    }, [armor, item])

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
                            <div className="text-4xl" style={{color:  (!armor ? color : "white")}}>
                                {itemInstanceId && (itemComponents.instances[itemInstanceId].primaryStat.value ?? "Unknown")}
                            </div>
                        </div>
                        {!armor && (
                            <div className="p-2 border-t border-gray-700">
                                {/* Primary weapon stats section */}
                                <div className="mb-3">
                                    <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Primary Stats</div>
                                    {impact && <WeaponStat name={statsDefinitions[impact.statHash].displayProperties.name} value={impact.value} bar={true}/>}
                                    {range  && <WeaponStat name={statsDefinitions[range.statHash].displayProperties.name} value={range.value} bar={true}/>}
                                    {stability && <WeaponStat name={statsDefinitions[stability.statHash].displayProperties.name} value={stability.value} bar={true}/>}
                                    {handling && <WeaponStat name={statsDefinitions[handling.statHash].displayProperties.name} value={handling.value} bar={true}/>}
                                    {reloadSpeed && <WeaponStat name={statsDefinitions[reloadSpeed.statHash].displayProperties.name} value={reloadSpeed.value} bar={true}/>}
                                </div>
                                
                                {/* Performance stats section */}
                                <div className="mb-3">
                                    <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Performance</div>
                                    {rpm && <WeaponStat name={"RPM"} value={rpm.value} bar={false}/>}
                                    {magazine && <WeaponStat name={statsDefinitions[magazine.statHash].displayProperties.name} value={magazine.value} bar={false}/>}
                                </div>
                                
                                {/* Weapon-specific stats section - Only show if at least one is available */}
                                {(blastRadius || velocity || chargeTime || drawTime) && (
                                    <div className="mb-3">
                                        <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Weapon Specifics</div>
                                        
                                        {/* Group time-based stats together */}
                                        {(chargeTime || drawTime) && (
                                            <div className="mb-1">
                                                {chargeTime && (
                                                    <WeaponStat 
                                                        name={statsDefinitions[chargeTime.statHash].displayProperties.name} 
                                                        value={chargeTime.value} 
                                                        bar={true}
                                                    />
                                                )}
                                                {drawTime && (
                                                    <WeaponStat 
                                                        name={statsDefinitions[drawTime.statHash].displayProperties.name} 
                                                        value={drawTime.value} 
                                                        bar={true}
                                                    />
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Projectile-based stats */}
                                        {blastRadius && <WeaponStat name={statsDefinitions[blastRadius.statHash].displayProperties.name} value={blastRadius.value} bar={true}/>}
                                        {velocity&& <WeaponStat name={statsDefinitions[velocity.statHash].displayProperties.name} value={velocity.value} bar={true}/>}
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
                                                {aimAssistance && <WeaponStat name={statsDefinitions[aimAssistance.statHash].displayProperties.name} value={aimAssistance.value} bar={true}/>}
                                                {recoilDirection && <WeaponStat name={statsDefinitions[recoilDirection.statHash].displayProperties.name} value={recoilDirection.value} bar={true}/>}
                                                {zoom && <WeaponStat name={statsDefinitions[zoom.statHash].displayProperties.name} value={zoom.value} bar={false}/>}
                                                {inventorySize && <WeaponStat name={statsDefinitions[inventorySize.statHash].displayProperties.name} value={inventorySize.value} bar={true}/>}
                                                {airborneEffectiveness && <WeaponStat name={statsDefinitions[airborneEffectiveness.statHash].displayProperties.name} value={airborneEffectiveness.value} bar={true}/>}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Weapon Perks section */}
                                {itemComponents.perks[itemInstanceId] && (
                                    <div className="mt-3">
                                        <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Weapon Perks</div>
                                        {itemComponents.perks[itemInstanceId].perks
                                            .filter((p) => p.isActive && p.visible && (p.iconPath as string).length > 0)
                                            .slice(0, 4)
                                            .map((p: any, idx: number) => {
                                                const perkDef = perksDefinitions[p.perkHash];
                                                return (
                                                    <div key={idx} className="flex flex-row items-center gap-2 mb-2">
                                                        <img src={`https://www.bungie.net${p.iconPath}`} height={32} width={32} alt={perkDef?.displayProperties?.name || "Perk"} />
                                                        <div className="flex flex-col items-start text-left">
                                                            <span className="text-sm font-semibold text-gray-200">{perkDef?.displayProperties?.name || "Perk"}</span>
                                                            <span className="text-xs text-gray-400">{perkDef?.displayProperties?.description || ""}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}
                        
                    </>
                )}
            </div>
            {armor && (
                <div className="p-2 border-t border-gray-700 w-full">
                    <div className="mb-3">
                        <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Armor Stats</div>
                        {mobility && <WeaponStat name={statsDefinitions[mobility.statHash]?.displayProperties?.name || "Mobility"} value={mobility.value} bar={true} max={40}/>} 
                        {resilience && <WeaponStat name={statsDefinitions[resilience.statHash]?.displayProperties?.name || "Resilience"} value={resilience.value} bar={true} max={40}/>} 
                        {recovery && <WeaponStat name={statsDefinitions[recovery.statHash]?.displayProperties?.name || "Recovery"} value={recovery.value} bar={true} max={40}/>} 
                        {discipline && <WeaponStat name={statsDefinitions[discipline.statHash]?.displayProperties?.name || "Discipline"} value={discipline.value} bar={true} max={40}/>} 
                        {intellect && <WeaponStat name={statsDefinitions[intellect.statHash]?.displayProperties?.name || "Intellect"} value={intellect.value} bar={true} max={40}/>} 
                        {strength && <WeaponStat name={statsDefinitions[strength.statHash]?.displayProperties?.name || "Strength"} value={strength.value} bar={true} max={40}/>} 
                    </div>
                </div>
            )}
            {armor && (
                <div className="p-2 border-t border-gray-700 w-full">
                    <div className="mb-3">
                        <div className="text-xs uppercase font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1">Armor Mods</div>
                        {itemInstanceId && itemComponents.perks[itemInstanceId].perks
                            .filter((p) => p.isActive && p.visible && (p.iconPath as string).length > 0)
                            .slice(0, 4)
                            .map((p, idx: number) => {
                                const perkDef = perksDefinitions[p.perkHash];
                                return (
                                    <div key={idx} className="flex flex-row items-center gap-2 mb-2">
                                        <img src={`https://www.bungie.net${p.iconPath}`} height={32} width={32} alt={perkDef?.displayProperties?.name || "Perk"} />
                                        <div className="flex flex-col items-start text-left">
                                            <span className="text-sm font-semibold text-gray-200">{perkDef?.displayProperties?.name || "Perk"}</span>
                                            <span className="text-xs text-gray-400">{perkDef?.displayProperties?.description || ""}</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
            <div className="flex flex-row p-2 items-center justify-between border-t border-gray-700" style={{width: "100%"}}>
                <div className="flex flex-row gap-2">
                    {Object.values(characters).filter((c) => c.characterId !== characterId).map((c) => (
                        <button key={c.characterId} className="hover:opacity-80 transition-opacity">
                            <img src={classDefinitions[c.classHash].displayProperties.name.toLowerCase() + ".svg"} height={32} width={32} alt={classDefinitions[c.classHash].displayProperties.name} />
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
                    {!armor && (
                        <button
                            className="hover:opacity-80 transition-opacity"
                            onClick={() => item && window.open("https://d2foundry.gg/w/" + item.hash)}
                        >
                            <img src="https://d2foundry.gg/_next/image?url=%2Fassets%2Ffoundry_logo_pride.png&w=32&q=75" className="rounded-lg" height={32} width={32} alt="Light.gg" />
                        </button>
                    )}
                </div>
            </div>
            {debugMode && <DebugInfos data={{
                "itemInstance": itemComponents.instances[itemInstanceId],
                ...itemComponents.perks[itemInstanceId], 
                ...itemComponents.stats[itemInstanceId],
                item}}
            />}
            
        </div>
    )
} 

export default GlobalItemTooltip; 