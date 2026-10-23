"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import ItemComponent from "./Item";
import DestinyCheckBox from "../destiny-ui/DestinyCheckbox";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import useTransferItem from "@/lib/hooks/useTransferItem";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { collectGear } from "@/lib/helpers/inventory-cleaner";
import {
    assignMods, Build, collectArmor, ExoticChoice, findStatModPlug, freeEnergyWithoutStatMods, MAX_STAT, MAX_STAT_MODS,
    optimizeArmor, OptimizerOptions, StatVector,
} from "@/lib/helpers/armor-optimizer";
import { ARMOR_STAT_ORDER } from "@/lib/helpers/item-stats";
import { plugsStats } from "@/lib/helpers/stats";
import { equipItems, insertSocketPlugFree } from "@/lib/bungie";
import { ARMOR_SLOTS, EQUIPMENT_SLOTS } from "@/lib/constants";
import { ItemStats } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface ArmorOptimizerModalProps {
    characterId: string;
    onClose: () => void;
}

interface SavedOptions {
    minimums: StatVector
    weights: number[]
    exotic: ExoticChoice
    set?: { hash: number, count: number }
    statMods: number
    applyMods: boolean
}

const STAT_COUNT = ARMOR_STAT_ORDER.length;
const PRIORITIES = [0, 1, 2, 3];
const DEFAULT_OPTIONS: SavedOptions = {
    minimums: new Array(STAT_COUNT).fill(0),
    weights: new Array(STAT_COUNT).fill(1),
    exotic: "any",
    statMods: MAX_STAT_MODS,
    applyMods: true,
};

const sectionLabel = "text-xs uppercase tracking-wider text-gray-400";
const selectClass = "w-full bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7e57c2]";

const isVector = (value: unknown): value is number[] =>
    Array.isArray(value) && value.length === STAT_COUNT && value.every((entry) => typeof entry === "number");

// The options left last time; a display preference, so a broken or missing save just means the defaults
const loadOptions = (): SavedOptions => {
    try {
        const saved = JSON.parse(localStorage.getItem("optimizerOptions") ?? "{}");
        return {
            minimums: isVector(saved.minimums) ? saved.minimums : DEFAULT_OPTIONS.minimums,
            weights: isVector(saved.weights) ? saved.weights : DEFAULT_OPTIONS.weights,
            exotic: saved.exotic === "none" || typeof saved.exotic === "number" ? saved.exotic : "any",
            set: typeof saved.set?.hash === "number" && typeof saved.set?.count === "number" ? saved.set : undefined,
            statMods: typeof saved.statMods === "number" ? Math.min(Math.max(saved.statMods, 0), MAX_STAT_MODS) : DEFAULT_OPTIONS.statMods,
            applyMods: saved.applyMods !== false,
        };
    } catch {
        return DEFAULT_OPTIONS;
    }
};

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "");

/** Finds the armor (one piece per slot) that reaches the stats the player wants, and equips it. */
const ArmorOptimizerModal = ({ characterId, onClose }: ArmorOptimizerModalProps) => {
    const [options, setOptions] = useState(loadOptions);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState<{ done: number, total: number }>();

    const { itemDefinitions, classDefinitions, statsDefinitions, equipableItemSetDefinitions } = useDefinitions();
    const {
        user, characters, characterEquipment, characterInventories, profileInventory, itemComponents, plugSets,
        equipItemLocally, setItemComponentsLocally, setCharacterStatsLocally,
    } = useProfile();
    const { move } = useTransferItem();
    const { hideTooltip } = useItemTooltipActions();
    const { addNotification } = useNotifications();
    const t = useT();

    const character = characters[characterId];
    const className = classDefinitions[character?.classHash]?.displayProperties.name ?? t.cleaner.character;
    const statName = (statIndex: number) => statsDefinitions[ARMOR_STAT_ORDER[statIndex]]?.displayProperties.name ?? t.plugs.stat;
    const statIcon = (statIndex: number) => statsDefinitions[ARMOR_STAT_ORDER[statIndex]]?.displayProperties.icon;

    useEffect(() => {
        try {
            localStorage.setItem("optimizerOptions", JSON.stringify(options));
        } catch { /* the options just won't be remembered */ }
    }, [options]);

    // Escape closes the optimizer, unless items are moving
    useModalKeys(onClose, { canClose: !running });

    // Every armor piece the character can wear, equipped ones included
    const pieces = useMemo(() => {
        const equipped = Object.entries(characterEquipment).flatMap(([ownerId, { items }]) => items.map((item) => ({ item, ownerId })));
        const gear = [...collectGear(profileInventory, characterInventories, itemDefinitions), ...equipped];
        return collectArmor(gear, character?.classType, itemDefinitions, itemComponents);
    }, [characterEquipment, profileInventory, characterInventories, itemDefinitions, itemComponents, character?.classType]);

    // What the character gets without armor: the stats of its subclass setup
    const baseline = useMemo(() => {
        const subclass = characterEquipment[characterId]?.items
            .find((item) => itemDefinitions[item.itemHash]?.equippingBlock?.equipmentSlotTypeHash === EQUIPMENT_SLOTS.SUBCLASS);
        const plugs = (itemComponents.sockets[subclass?.itemInstanceId ?? ""]?.sockets ?? []).map((socket) => socket.plugHash);
        const totals = plugsStats(plugs, itemDefinitions, character?.classType);
        return ARMOR_STAT_ORDER.map((statHash) => totals[statHash] ?? 0);
    }, [characterEquipment, characterId, itemComponents, itemDefinitions, character?.classType]);

    // The exotics owned for each slot, in the slots' order
    const exotics = useMemo(() => {
        const seen = new Map<number, number>();
        pieces.forEach((piece) => { if (piece.isExotic) seen.set(piece.item.itemHash, piece.slot); });
        return [...seen.entries()]
            .sort(([hashA, slotA], [hashB, slotB]) => ARMOR_SLOTS.indexOf(slotA) - ARMOR_SLOTS.indexOf(slotB)
                || (itemDefinitions[hashA]?.displayProperties.name ?? "").localeCompare(itemDefinitions[hashB]?.displayProperties.name ?? ""))
            .map(([hash]) => hash);
    }, [pieces, itemDefinitions]);

    // The armor sets with pieces in at least two slots, and the bonus counts they offer
    const sets = useMemo(() => {
        const slotsBySet = new Map<number, Set<number>>();
        pieces.forEach((piece) => {
            if (piece.setHash) slotsBySet.set(piece.setHash, (slotsBySet.get(piece.setHash) ?? new Set()).add(piece.slot));
        });
        return [...slotsBySet.entries()]
            .filter(([hash, slots]) => slots.size >= 2 && equipableItemSetDefinitions[hash])
            .map(([hash, slots]) => ({
                hash,
                name: equipableItemSetDefinitions[hash].displayProperties.name,
                counts: [...new Set(equipableItemSetDefinitions[hash].setPerks.map((perk) => perk.requiredSetCount))]
                    .filter((count) => count <= slots.size)
                    .sort((a, b) => a - b),
            }))
            .filter((set) => set.counts.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [pieces, equipableItemSetDefinitions]);

    // Choices of an earlier visit the player no longer has fall back to none
    const exotic = typeof options.exotic === "number" && !exotics.includes(options.exotic) ? "any" : options.exotic;
    const set = options.set && sets.some((s) => s.hash === options.set!.hash && s.counts.includes(options.set!.count)) ? options.set : undefined;

    const searchOptions: OptimizerOptions = useMemo(
        () => ({ minimums: options.minimums, weights: options.weights, exotic, set, statMods: options.statMods }),
        [options.minimums, options.weights, exotic, set, options.statMods]
    );
    // Typing a minimum stays smooth: the search follows once React has time
    const deferredOptions = useDeferredValue(searchOptions);
    const result = useMemo(() => optimizeArmor(pieces, baseline, deferredOptions), [pieces, baseline, deferredOptions]);
    const stale = deferredOptions !== searchOptions;

    const setMinimum = (statIndex: number, value: number) =>
        setOptions((prev) => ({ ...prev, minimums: prev.minimums.map((entry, i) => i === statIndex ? value : entry) }));
    const setWeight = (statIndex: number, value: number) =>
        setOptions((prev) => ({ ...prev, weights: prev.weights.map((entry, i) => i === statIndex ? value : entry) }));

    const ownerName = (ownerId: string) => ownerId === "vault"
        ? t.item.vault
        : classDefinitions[characters[ownerId]?.classHash]?.displayProperties.name ?? t.cleaner.character;

    /**
     * Brings the build's pieces to the character and equips them (the exotic last, once the one it replaces is gone),
     * then inserts the stat mods. The character's stats follow right away, as Bungie keeps serving the old profile a while.
     */
    const equipBuild = async (build: Build) => {
        if (running) return;
        hideTooltip();
        setRunning(true);
        const ordered = [...build.pieces.filter((piece) => !piece.isExotic), ...build.pieces.filter((piece) => piece.isExotic)];
        const steps = ordered.length + 1 + (options.applyMods ? build.mods.length : 0);
        let step = 0;
        const advance = () => setProgress({ done: ++step, total: steps });
        setProgress({ done: 0, total: steps });

        let failedPieces = 0;
        let failedMods = 0;
        const statsById = new Map<string, ItemStats | undefined>();
        try {
            const onCharacter: string[] = [];
            for (const piece of ordered) {
                try {
                    await move({ itemHash: piece.item.itemHash, itemInstanceId: piece.item.itemInstanceId, toId: characterId });
                    onCharacter.push(piece.item.itemInstanceId);
                } catch {
                    failedPieces++;
                }
                advance();
            }

            const results = onCharacter.length > 0 ? await equipItems(user.membershipType, characterId, onCharacter) : [];
            const equippedIds = results.filter((r) => r.equipStatus === 1).map((r) => r.itemInstanceId);
            equippedIds.forEach((id) => equipItemLocally(characterId, id));
            failedPieces += onCharacter.length - equippedIds.length;
            advance();

            build.pieces.forEach((piece) => statsById.set(piece.item.itemInstanceId, itemComponents.stats[piece.item.itemInstanceId]));
            if (options.applyMods && build.mods.length > 0) {
                const freeEnergy = (piece: Build["pieces"][number]) =>
                    freeEnergyWithoutStatMods(piece.item.itemInstanceId, itemDefinitions[piece.item.itemHash], itemComponents, itemDefinitions);
                for (const [itemInstanceId, statIndex] of assignMods(build, freeEnergy)) {
                    const piece = build.pieces.find((p) => p.item.itemInstanceId === itemInstanceId)!;
                    const definition = itemDefinitions[piece.item.itemHash];
                    const target = definition && findStatModPlug(statIndex, { definition, itemInstanceId, characterId, itemComponents, itemDefinitions, plugSets });
                    if (!target || !onCharacter.includes(itemInstanceId)) {
                        failedMods++;
                    } else {
                        try {
                            const changed = await insertSocketPlugFree(user.membershipType, characterId, itemInstanceId, target.socketIndex, target.plugHash);
                            setItemComponentsLocally(itemInstanceId, changed);
                            if (changed.stats) statsById.set(itemInstanceId, changed.stats);
                        } catch {
                            failedMods++;
                        }
                    }
                    advance();
                }
            }

            // The character's stats: the armor it wore swapped for the build's, as it is now
            if (character && equippedIds.length > 0) {
                const armorStat = (stats: ItemStats | undefined, statHash: number) => stats?.stats[statHash]?.value ?? 0;
                const wornBefore = (characterEquipment[characterId]?.items ?? [])
                    .filter((item) => ARMOR_SLOTS.includes(itemDefinitions[item.itemHash]?.equippingBlock?.equipmentSlotTypeHash ?? 0));
                const replaced = wornBefore.filter((item) => {
                    const slot = itemDefinitions[item.itemHash]?.equippingBlock?.equipmentSlotTypeHash;
                    return build.pieces.some((piece) => piece.slot === slot && equippedIds.includes(piece.item.itemInstanceId));
                });
                const stats = { ...character.stats };
                ARMOR_STAT_ORDER.forEach((statHash) => {
                    if (stats[statHash] === undefined) return;
                    const removed = replaced.reduce((total, item) => total + armorStat(itemComponents.stats[item.itemInstanceId], statHash), 0);
                    const added = equippedIds.reduce((total, id) => total + armorStat(statsById.get(id), statHash), 0);
                    stats[statHash] = Math.min(MAX_STAT, Math.max(0, stats[statHash] - removed + added));
                });
                setCharacterStatsLocally(characterId, stats);
            }
        } catch (error) {
            addNotification(t.optimizer.equippedPartially(build.pieces.length), error instanceof Error ? error.message : "", "error", "", 5000);
            setProgress(undefined);
            setRunning(false);
            return;
        }

        if (failedPieces > 0) {
            addNotification(t.optimizer.equippedPartially(failedPieces), t.cleaner.maybeFull, "warning", "", 6000);
        } else if (failedMods > 0) {
            addNotification(t.optimizer.equipped, t.optimizer.modsFailed(failedMods), "warning", "", 6000);
        } else {
            addNotification(t.optimizer.equipped, t.optimizer.saveHint, "success", "", 6000);
        }
        setProgress(undefined);
        setRunning(false);
    };

    const currentStats = ARMOR_STAT_ORDER.map((statHash) => character?.stats[statHash] ?? 0);

    const renderStatIcon = (statIndex: number, size: number) => {
        const icon = statIcon(statIndex);
        return (
            <span className="relative shrink-0" style={{ width: size, height: size }}>
                {icon && <Image src={`https://www.bungie.net${icon}`} alt="" fill sizes={`${size}px`} />}
            </span>
        );
    };

    const renderBuild = (build: Build, index: number) => {
        const modCounts = new Map<number, number>();
        build.mods.forEach((stat) => modCounts.set(stat, (modCounts.get(stat) ?? 0) + 1));
        return (
            <div key={build.pieces.map((p) => p.item.itemInstanceId).join(":")} className="flex flex-col xl:flex-row xl:items-center gap-4 p-4 rounded-md bg-white/[0.03] border border-white/5">
                <span className="text-sm text-gray-600 tabular-nums w-6 shrink-0">{index + 1}</span>
                <div className="flex gap-2 shrink-0">
                    {build.pieces.map((piece) => (
                        <div key={piece.item.itemInstanceId} className="flex flex-col items-center gap-1 w-[52px]">
                            <ItemComponent
                                itemHash={piece.item.itemHash}
                                itemInstanceId={piece.item.itemInstanceId}
                                state={piece.item.state}
                                characterId={characterId}
                                ornamentItem={piece.item.overrideStyleItemHash ? itemDefinitions[piece.item.overrideStyleItemHash] : undefined}
                                perks={itemComponents.perks[piece.item.itemInstanceId]}
                                stats={itemComponents.stats[piece.item.itemInstanceId]}
                                size={48}
                            />
                            <span className="w-full truncate text-center text-[10px] leading-tight text-gray-600">{ownerName(piece.ownerId)}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2 flex-1 min-w-0">
                    {build.stats.map((value, statIndex) => {
                        const delta = value - currentStats[statIndex];
                        const reached = options.minimums[statIndex] > 0 && value >= options.minimums[statIndex];
                        return (
                            <div key={statIndex} className="flex flex-col gap-1 min-w-0" title={statName(statIndex)}>
                                <div className="flex items-center gap-1.5 text-sm">
                                    {renderStatIcon(statIndex, 16)}
                                    <span className={`tabular-nums ${options.weights[statIndex] === 0 ? "text-gray-500" : reached ? "text-green-300" : "text-white"}`}>{value}</span>
                                    <span className={`text-[10px] tabular-nums ${delta > 0 ? "text-green-400" : "text-red-400"}`}>{formatDelta(delta)}</span>
                                </div>
                                <div className="h-1 bg-white/10">
                                    <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(value / MAX_STAT, 1)) * 100}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex xl:flex-col items-center xl:items-end justify-between gap-2 shrink-0 xl:w-40">
                    <span className="text-xs text-gray-400 xl:text-right">
                        {build.mods.length === 0
                            ? t.optimizer.noMods
                            : [...modCounts.entries()].map(([stat, count]) => t.optimizer.modsList(count, statName(stat))).join(", ")}
                    </span>
                    <button
                        onClick={() => equipBuild(build)}
                        disabled={running}
                        className="px-4 py-1.5 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors disabled:opacity-40 disabled:hover:bg-[#7e57c2]"
                    >
                        {t.optimizer.equip}
                    </button>
                </div>
            </div>
        );
    };

    // Portaled to <body>, above the header (1001) and below the item tooltip (1005)
    return createPortal(
        <div className="fixed inset-0 z-[1003] flex flex-col bg-[#141414]/95 backdrop-blur-md text-left animate-fade-in" role="dialog" aria-label={t.optimizer.title}>
            <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center border-2 border-white text-white">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xl text-white font-semibold truncate">{t.optimizer.title}</span>
                        <span className="text-sm text-gray-500 truncate">{className} · {t.optimizer.subtitle}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    disabled={running}
                    className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 disabled:opacity-40"
                    title={t.common.closeEsc}
                    aria-label={t.common.close}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                </button>
            </header>

            {/* Body: options on the left, the builds on the right */}
            <div className={`flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,380px)_1fr] ${running ? "pointer-events-none opacity-60" : ""}`}>
                <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar lg:border-r border-white/10 max-h-[45vh] lg:max-h-none">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className={sectionLabel}>{t.optimizer.stats}</span>
                            <span className="flex gap-6 text-[10px] uppercase tracking-wider text-gray-600">
                                <span>{t.optimizer.minimum}</span>
                                <span className="w-[116px] text-center">{t.optimizer.priority}</span>
                            </span>
                        </div>
                        {ARMOR_STAT_ORDER.map((statHash, statIndex) => (
                            <div key={statHash} className="flex items-center gap-2">
                                {renderStatIcon(statIndex, 20)}
                                <span className="flex-1 min-w-0 truncate text-sm text-gray-200">{statName(statIndex)}</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={MAX_STAT}
                                    step={10}
                                    value={options.minimums[statIndex]}
                                    aria-label={t.optimizer.minimumOf(statName(statIndex))}
                                    onChange={(e) => setMinimum(statIndex, Math.min(Math.max(Number(e.target.value) || 0, 0), MAX_STAT))}
                                    className="w-16 bg-[#2a2a2a] border border-white/10 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-[#7e57c2]"
                                />
                                <div className="flex rounded-md bg-white/5 p-0.5">
                                    {PRIORITIES.map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={() => setWeight(statIndex, priority)}
                                            title={t.optimizer.priorities[priority]}
                                            aria-label={t.optimizer.priorityOf(statName(statIndex), t.optimizer.priorities[priority])}
                                            aria-pressed={options.weights[statIndex] === priority}
                                            className={`w-7 py-0.5 text-xs rounded transition-colors ${options.weights[statIndex] === priority ? "bg-[#7e57c2] text-white" : "text-gray-400 hover:text-white"}`}
                                        >
                                            {priority === 0 ? "–" : priority}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <label className="flex flex-col gap-2">
                        <span className={sectionLabel}>{t.optimizer.exotic}</span>
                        <select
                            value={String(exotic)}
                            onChange={(e) => setOptions((prev) => ({ ...prev, exotic: e.target.value === "any" || e.target.value === "none" ? e.target.value : Number(e.target.value) }))}
                            className={selectClass}
                        >
                            <option value="any">{t.optimizer.anyExotic}</option>
                            <option value="none">{t.optimizer.noExotic}</option>
                            {exotics.map((hash) => (
                                <option key={hash} value={hash}>{itemDefinitions[hash]?.displayProperties.name ?? hash}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className={sectionLabel}>{t.optimizer.armorSet}</span>
                        <select
                            value={set ? `${set.hash}:${set.count}` : ""}
                            onChange={(e) => {
                                const [hash, count] = e.target.value.split(":").map(Number);
                                setOptions((prev) => ({ ...prev, set: e.target.value ? { hash, count } : undefined }));
                            }}
                            className={selectClass}
                        >
                            <option value="">{t.optimizer.noSet}</option>
                            {sets.flatMap((s) => s.counts.map((count) => (
                                <option key={`${s.hash}:${count}`} value={`${s.hash}:${count}`}>{s.name} · {t.optimizer.pieces(count)}</option>
                            )))}
                        </select>
                    </label>

                    <div className="flex flex-col gap-3">
                        <label className="flex items-center justify-between gap-4">
                            <span className="flex flex-col">
                                <span className={sectionLabel}>{t.optimizer.statMods}</span>
                                <span className="text-xs text-gray-500">{t.optimizer.statModsHint}</span>
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={MAX_STAT_MODS}
                                value={options.statMods}
                                onChange={(e) => setOptions((prev) => ({ ...prev, statMods: Math.min(Math.max(Number(e.target.value) || 0, 0), MAX_STAT_MODS) }))}
                                className="w-16 bg-[#2a2a2a] border border-white/10 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-[#7e57c2]"
                            />
                        </label>
                        <div className="self-start">
                            <DestinyCheckBox checked={options.applyMods} label={t.optimizer.applyMods} onClick={() => setOptions((prev) => ({ ...prev, applyMods: !prev.applyMods }))} />
                        </div>
                    </div>

                    <p className="text-sm text-gray-500">{t.optimizer.note}</p>
                </div>

                <div className={`flex flex-col min-h-0 gap-3 p-6 overflow-y-auto custom-scrollbar border-t lg:border-t-0 border-white/10 transition-opacity ${stale ? "opacity-60" : ""}`}>
                    {pieces.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-gray-500 text-center">{t.optimizer.noArmor}</div>
                    ) : result.builds.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-gray-500 text-center">{t.optimizer.noBuild}</div>
                    ) : (
                        <>
                            <span className={sectionLabel}>
                                {t.optimizer.builds(result.builds.length)} <span className="normal-case text-gray-600">· {t.optimizer.vsCurrent}</span>
                            </span>
                            {result.builds.map(renderBuild)}
                        </>
                    )}
                </div>
            </div>

            <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0 min-h-[64px]">
                {progress ? (
                    <span className="mr-auto text-sm text-gray-400">{t.optimizer.equipping(progress.done, progress.total)}</span>
                ) : result.truncated ? (
                    <span className="mr-auto text-sm text-amber-400">{t.optimizer.truncated}</span>
                ) : (
                    <span className="mr-auto text-sm text-gray-500">{t.optimizer.saveHint}</span>
                )}
            </footer>
        </div>,
        document.body
    );
};

export default ArmorOptimizerModal;
