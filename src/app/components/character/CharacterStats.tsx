"use client"

import { useDefinitions } from "@/lib/hooks/useDefinitions"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

interface CharacterStatsProps {
	stats: Record<string, number>
}

const CharacterStats = ({ stats }: CharacterStatsProps) => {

	const [mobility, setMobility] = useState<number>(0)
	const [resilience, setResilience] = useState<number>(0)
	const [recovery, setRecovery] = useState<number>(0)
	const [discipline, setDiscipline] = useState<number>(0)
	const [intelligence, setIntelligence] = useState<number>(0)
	const [strenght, setStrenght] = useState<number>(0)

	// Animated values for smooth count up/down when stats change
	const [aMobility, setAMobility] = useState<number>(0)
	const [aResilience, setAResilience] = useState<number>(0)
	const [aRecovery, setARecovery] = useState<number>(0)
	const [aDiscipline, setADiscipline] = useState<number>(0)
	const [aIntelligence, setAIntelligence] = useState<number>(0)
	const [aStrength, setAStrength] = useState<number>(0)

	// refs to cancel ongoing animations per stat
	const rafMobility = useRef<number | null>(null)
	const rafResilience = useRef<number | null>(null)
	const rafRecovery = useRef<number | null>(null)
	const rafDiscipline = useRef<number | null>(null)
	const rafIntelligence = useRef<number | null>(null)
	const rafStrength = useRef<number | null>(null)

	const { statsDefinitions } = useDefinitions()
	const statIconsReady =
		statsDefinitions[392767087] &&
		statsDefinitions[4244567218] &&
		statsDefinitions[1735777505] &&
		statsDefinitions[144602215] &&
		statsDefinitions[1943323491] &&
		statsDefinitions[2996146975]

	useEffect(() => {
		Object.keys(stats).forEach((s) => {
			switch (s) {
				case "2996146975": setMobility(stats[s]); break;
				case "392767087": setResilience(stats[s]); break;
				case "1943323491": setRecovery(stats[s]); break;
				case "1735777505": setDiscipline(stats[s]); break;
				case "144602215": setIntelligence(stats[s]); break;
				case "4244567218": setStrenght(stats[s]); break;
			}
		})
	}, [stats])

	// helper to animate from current to target
	const animate = (
		from: number,
		to: number,
		setter: (v: number) => void,
		durationMs: number,
		rRef: React.MutableRefObject<number | null>
	) => {
		if (rRef.current !== null) {
			cancelAnimationFrame(rRef.current)
		}
		const start = performance.now()
		const diff = to - from
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / durationMs)
			// easeInOutQuad for smoother feel
			const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
			setter(Math.round(from + diff * eased))
			if (t < 1) {
				rRef.current = requestAnimationFrame(step)
			} else {
				rRef.current = null
				setter(to)
			}
		}
		rRef.current = requestAnimationFrame(step)
	}

	// Run animations when raw values change
	useEffect(() => { animate(aResilience, resilience, setAResilience, 400, rafResilience) }, [resilience])
	useEffect(() => { animate(aStrength, strenght, setAStrength, 400, rafStrength) }, [strenght])
	useEffect(() => { animate(aDiscipline, discipline, setADiscipline, 400, rafDiscipline) }, [discipline])
	useEffect(() => { animate(aIntelligence, intelligence, setAIntelligence, 400, rafIntelligence) }, [intelligence])
	useEffect(() => { animate(aRecovery, recovery, setARecovery, 400, rafRecovery) }, [recovery])
	useEffect(() => { animate(aMobility, mobility, setAMobility, 400, rafMobility) }, [mobility])

	// Cleanup any pending frames on unmount
	useEffect(() => {
		return () => {
			[rafMobility, rafResilience, rafRecovery, rafDiscipline, rafIntelligence, rafStrength].forEach(r => {
				if (r.current !== null) cancelAnimationFrame(r.current)
			})
		}
	}, [])

	return (
		<div className="flex flex-col gap-2 stats">
			{!statIconsReady && (
				<div className="text-xs text-gray-400">Loading stats...</div>
			)}
			<div className="flex flex-row items-center gap-2">
				{statsDefinitions[392767087] && <Image src={`https://www.bungie.net${statsDefinitions[392767087].displayProperties.icon}`} height={24} width={24} alt="resilience" />}
				<progress key={"resilience"} value={aResilience} max={200} />
				{aResilience}
			</div>
			<div className="flex flex-row items-center gap-2">
				{statsDefinitions[4244567218] && <Image src={`https://www.bungie.net${statsDefinitions[4244567218].displayProperties.icon}`} height={24} width={24} alt="strength" />}
				<progress key={"strength"} value={aStrength} max={200} />
				{aStrength}
			</div>
			<div className="flex flex-row items-center gap-2">
				{statsDefinitions[1735777505] && <Image src={`https://www.bungie.net${statsDefinitions[1735777505].displayProperties.icon}`} height={24} width={24} alt="discipline" />}
				<progress key={"discipline"} value={aDiscipline} max={200} />
				{aDiscipline}
			</div>
			<div className="flex flex-row items-center gap-2">
				{statsDefinitions[144602215] && <Image src={`https://www.bungie.net${statsDefinitions[144602215].displayProperties.icon}`} height={24} width={24} alt="intelligence" />}
				<progress key={"intelligence"} value={aIntelligence} max={200} />
				{aIntelligence}
			</div>
			<div className="flex flex-row items-center gap-2">
				{statsDefinitions[1943323491] && <Image src={`https://www.bungie.net${statsDefinitions[1943323491].displayProperties.icon}`} height={24} width={24} alt="recovery" />}
				<progress key={"recovery"} value={aRecovery} max={200} />
				{aRecovery}
			</div>
			<div className="flex flex-row items-center gap-2">
				{statsDefinitions[2996146975] && <Image alt="mobility" src={`https://www.bungie.net${statsDefinitions[2996146975].displayProperties.icon}`} height={24} width={24} />}
				<progress key={"mobility"} value={aMobility} max={200} />
				{aMobility}
			</div>
		</div>
	)
}

export default CharacterStats;
