"use client"

import { useDefinitions } from "@/lib/hooks/useDefinitions"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ARMOR_STATS } from "@/lib/constants";

// In the game's order: Health, Melee, Grenade, Super, Class, Weapons
const STAT_ORDER = [
	ARMOR_STATS.RESILIENCE,
	ARMOR_STATS.STRENGTH,
	ARMOR_STATS.DISCIPLINE,
	ARMOR_STATS.INTELLECT,
	ARMOR_STATS.RECOVERY,
	ARMOR_STATS.MOBILITY,
];

const ANIMATION_MS = 400;

/** Counts from the value on screen to `target` whenever it changes (from 0 on mount). */
const useAnimatedNumber = (target: number) => {
	const [shown, setShown] = useState(0);
	const shownRef = useRef(0);

	useEffect(() => {
		const from = shownRef.current;
		const start = performance.now();
		let frame = requestAnimationFrame(function step(now) {
			const t = Math.min(1, (now - start) / ANIMATION_MS);
			// easeInOutQuad for smoother feel
			const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
			const value = t < 1 ? Math.round(from + (target - from) * eased) : target;
			shownRef.current = value;
			setShown(value);
			if (t < 1) frame = requestAnimationFrame(step);
		});
		return () => cancelAnimationFrame(frame);
	}, [target]);

	return shown;
}

const StatRow = ({ statHash, value }: { statHash: number, value: number }) => {
	const { statsDefinitions } = useDefinitions()
	const definition = statsDefinitions[statHash]
	const shown = useAnimatedNumber(value)

	return (
		<div className="flex flex-row items-center gap-2">
			{definition && <Image src={`https://www.bungie.net${definition.displayProperties.icon}`} height={24} width={24} alt={definition.displayProperties.name} />}
			<progress value={shown} max={200} />
			{shown}
		</div>
	)
}

interface CharacterStatsProps {
	stats: Record<string, number>
}

const CharacterStats = ({ stats }: CharacterStatsProps) => {
	const { statsDefinitions } = useDefinitions()
	const statIconsReady = STAT_ORDER.every((statHash) => statsDefinitions[statHash])

	return (
		<div className="flex flex-col gap-2 stats">
			{!statIconsReady && (
				<div className="text-xs text-gray-400">Loading stats...</div>
			)}
			{STAT_ORDER.map((statHash) => (
				<StatRow key={statHash} statHash={statHash} value={stats[statHash] ?? 0} />
			))}
		</div>
	)
}

export default CharacterStats;
