"use client"

import { useEffect, useState } from "react"

interface CharacterStats {
    stats :any
}

const CharacterStats = ({stats}:CharacterStats) => {

    const [mobility, setMobility] = useState<number>(0)
    const [resilience, setResilience] = useState<number>(0)
    const [recovery, setRecovery] = useState<number>(0)
    const [discipline, setDiscipline] = useState<number>(0)
    const [intelligence, setIntelligence] = useState<number>(0)
    const [strenght, setStrenght] = useState<number>(0)

    useEffect(() => {
        Object.keys(stats).forEach((s) => {
            switch(s){
                case "2996146975":setMobility(stats[s]); break;
                case "392767087":setResilience(stats[s]); break;
                case "1943323491":setRecovery(stats[s]); break;
                case "1735777505":setDiscipline(stats[s]); break;
                case "144602215":setIntelligence(stats[s]); break;
                case "4244567218":setStrenght(stats[s]); break;
            }
        })
    }, [stats])

    return (
        <div className="flex flex-col gap-2 stats">
            <div className="flex flex-row items-center gap-2">
                <img src={"/mobility.svg"} height={24} width={24}/>
                <progress key={"mobility"} value={mobility} max={100}/>
                {mobility}
            </div>
            <div className="flex flex-row items-center gap-2">
                <img src={"/resilience.svg"} height={24} width={24}/>
                <progress key={"resilience"} value={resilience} max={100}/>
                {resilience}
            </div>
            <div className="flex flex-row items-center gap-2">
            <img src={"/recovery.svg"} height={24} width={24}/>
                <progress key={"recovery"} value={recovery} max={100}/>
                {recovery}
            </div>
            <div className="flex flex-row items-center gap-2">
                <img src={"/discipline.svg"} height={24} width={24}/>
                <progress key={"discipline"} value={discipline} max={100}/>
                {discipline}
            </div>
            <div className="flex flex-row items-center gap-2">
                <img src={"/intellect.svg"} height={24} width={24}/>
                <progress key={"intelligence"} value={intelligence} max={100}/>
                {intelligence}
            </div>
            <div className="flex flex-row items-center gap-2">
                <img src={"/strength.svg"} height={24} width={24}/>
                <progress key={"strength"} value={strenght} max={100}/>
                {strenght}
            </div>
        </div>
    )
}

export default CharacterStats;