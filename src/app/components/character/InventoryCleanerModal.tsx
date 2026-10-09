"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ItemComponent from "./Item";
import DestinyCheckBox from "../destiny-ui/DestinyCheckbox";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import useTransferItem from "@/lib/hooks/useTransferItem";
import { useItemTooltipActions } from "@/lib/hooks/useItemTooltip";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { useNotifications } from "@/app/components/NotificationsProvider";
import { ClearOptions, collectGear, findClearableItems, findJunk, JunkOptions, JunkReason, OwnedItem, planGather } from "@/lib/helpers/inventory-cleaner";
import { ARMOR_SLOTS, WEAPON_SLOTS } from "@/lib/constants";
import { Item } from "@/lib/types";

interface InventoryCleanerModalProps {
    characterId: string;
    onClose: () => void;
}

type CleanerMode = "clear" | "junk";

const DEFAULT_CLEAR: ClearOptions = { weapons: true, armor: true, keepLocked: false };
const DEFAULT_JUNK: JunkOptions = { dupes: true, minArmorTotal: 60, minGearTier: 0 };

const REASON_LABELS: Record<JunkReason, string> = {
    dupe: "Worse duplicate",
    lowStats: "Low stats",
    lowTier: "Low tier",
};

const MODES: { id: CleanerMode, label: string }[] = [
    { id: "clear", label: "Clear inventory" },
    { id: "junk", label: "Find junk" },
];

const sectionLabel = "text-xs uppercase tracking-wider text-gray-400";

// The options left last time; a display preference, so a broken or missing save just means the defaults
const loadOptions = () => {
    try {
        const saved = JSON.parse(localStorage.getItem("cleanerOptions") ?? "{}");
        return { mode: (saved.mode === "junk" ? "junk" : "clear") as CleanerMode, clear: { ...DEFAULT_CLEAR, ...saved.clear } as ClearOptions, junk: { ...DEFAULT_JUNK, ...saved.junk } as JunkOptions };
    } catch {
        return { mode: "clear" as CleanerMode, clear: DEFAULT_CLEAR, junk: DEFAULT_JUNK };
    }
};

/** Empties the character's inventory into the vault, or finds the gear worth dismantling and brings it to the character. */
const InventoryCleanerModal = ({ characterId, onClose }: InventoryCleanerModalProps) => {
    const [options, setOptions] = useState(loadOptions);
    // Junk items left out of the batch, by instance id
    const [excluded, setExcluded] = useState<Set<string>>(new Set());
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState<{ done: number, total: number }>();

    const { itemDefinitions, classDefinitions } = useDefinitions();
    const { characters, characterInventories, characterLoadouts, profileInventory, itemComponents } = useProfile();
    const { move } = useTransferItem();
    const { hideTooltip } = useItemTooltipActions();
    const { addNotification } = useNotifications();

    const { mode } = options;
    const className = classDefinitions[characters[characterId]?.classHash]?.displayProperties.name ?? "Character";

    useEffect(() => {
        try {
            localStorage.setItem("cleanerOptions", JSON.stringify(options));
        } catch { /* the options just won't be remembered */ }
    }, [options]);

    // Escape closes the cleaner, unless items are moving
    useModalKeys(onClose, { canClose: !running });

    const clearable = useMemo(
        () => findClearableItems(characterInventories[characterId]?.items ?? [], itemDefinitions, options.clear)
            .map((item) => ({ item, ownerId: characterId })),
        [characterInventories, characterId, itemDefinitions, options.clear]
    );

    const junk = useMemo(() => {
        // Items in a loadout are in use, whatever their rolls
        const inLoadouts = new Set(Object.values(characterLoadouts).flatMap(({ loadouts }) => loadouts.flatMap((l) => l.items.map((i) => i.itemInstanceId))));
        const gear = collectGear(profileInventory, characterInventories, itemDefinitions);
        return findJunk(gear, itemDefinitions, itemComponents, options.junk, inLoadouts);
    }, [profileInventory, characterInventories, characterLoadouts, itemDefinitions, itemComponents, options.junk]);

    const selectedJunk = useMemo(() => junk.filter(({ item }) => !excluded.has(item.itemInstanceId)), [junk, excluded]);

    const gatherPlan = useMemo(
        () => planGather(selectedJunk, characterId, characterInventories[characterId]?.items ?? [], itemDefinitions),
        [selectedJunk, characterId, characterInventories, itemDefinitions]
    );

    const reasonCounts = useMemo(() => {
        const counts: Record<JunkReason, number> = { dupe: 0, lowStats: 0, lowTier: 0 };
        junk.forEach(({ reasons }) => reasons.forEach((reason) => counts[reason]++));
        return counts;
    }, [junk]);

    const setMode = (next: CleanerMode) => setOptions((prev) => ({ ...prev, mode: next }));
    const setClear = (fields: Partial<ClearOptions>) => setOptions((prev) => ({ ...prev, clear: { ...prev.clear, ...fields } }));
    const setJunk = (fields: Partial<JunkOptions>) => setOptions((prev) => ({ ...prev, junk: { ...prev.junk, ...fields } }));

    const toggleExcluded = (itemInstanceId: string) => setExcluded((prev) => {
        const next = new Set(prev);
        if (!next.delete(itemInstanceId)) next.add(itemInstanceId);
        return next;
    });

    /** Moves the items one after the other, showing the progress in the footer. */
    const runMoves = async (items: OwnedItem[], toId: string) => {
        if (items.length === 0 || running) return;
        hideTooltip();
        setRunning(true);
        let failed = 0;
        for (const [index, { item, ownerId }] of items.entries()) {
            setProgress({ done: index, total: items.length });
            try {
                await move({ itemHash: item.itemHash, itemInstanceId: item.itemInstanceId, fromId: ownerId, toId });
            } catch {
                failed++;
            }
        }
        const moved = items.length - failed;
        addNotification(
            failed === 0 ? `${moved} items moved` : `${moved} items moved, ${failed} failed`,
            failed === 0 ? (toId === "vault" ? "Sent to the vault" : `Brought to your ${className}`) : "The vault or the character may be full",
            failed === 0 ? "success" : "warning",
            "",
            5000
        );
        setProgress(undefined);
        setRunning(false);
    };

    const ownerName = (ownerId: string) => ownerId === "vault"
        ? "Vault"
        : classDefinitions[characters[ownerId]?.classHash]?.displayProperties.name ?? "Character";

    const renderItem = (item: Item) => (
        <ItemComponent
            itemHash={item.itemHash}
            itemInstanceId={item.itemInstanceId}
            state={item.state}
            characterId={characterId}
            ornamentItem={item.overrideStyleItemHash ? itemDefinitions[item.overrideStyleItemHash] : undefined}
            perks={itemComponents.perks[item.itemInstanceId]}
            stats={itemComponents.stats[item.itemInstanceId]}
            size={56}
        />
    );

    // Weapons and armor in their own sections, like the vault's tabs
    const renderGroups = <T extends OwnedItem>(items: T[], renderTile: (owned: T) => React.ReactNode) => {
        const slotOf = ({ item }: OwnedItem) => itemDefinitions[item.itemHash]?.equippingBlock?.equipmentSlotTypeHash ?? 0;
        const groups = [
            { label: "Weapons", items: items.filter((owned) => WEAPON_SLOTS.includes(slotOf(owned))) },
            { label: "Armor", items: items.filter((owned) => ARMOR_SLOTS.includes(slotOf(owned))) },
        ].filter((group) => group.items.length > 0);
        return groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-3">
                <span className={sectionLabel}>{group.label} <span className="text-gray-600">{group.items.length}</span></span>
                <div className="flex flex-wrap gap-3">{group.items.map(renderTile)}</div>
            </section>
        ));
    };

    const numberField = (label: string, hint: string, value: number, max: number, onChange: (value: number) => void) => (
        <label className="flex items-center justify-between gap-4">
            <span className="flex flex-col">
                <span className="text-sm text-gray-200">{label}</span>
                <span className="text-xs text-gray-500">{hint}</span>
            </span>
            <input
                type="number"
                min={0}
                max={max}
                value={value}
                onChange={(e) => onChange(Math.min(Math.max(Number(e.target.value) || 0, 0), max))}
                className="w-20 bg-[#2a2a2a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#7e57c2]"
            />
        </label>
    );

    const shownCount = mode === "clear" ? clearable.length : junk.length;

    // Portaled to <body>, above the header (1001) and below the item tooltip (1005)
    return createPortal(
        <div className="fixed inset-0 z-[1003] flex flex-col bg-[#141414]/95 backdrop-blur-md text-left animate-fade-in" role="dialog" aria-label="Inventory cleaner">
            <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center border-2 border-white text-white">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M5 6l1 14h12l1-14" />
                            <path d="M10 11v5M14 11v5" />
                        </svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xl text-white font-semibold truncate">Inventory cleaner</span>
                        <span className="text-sm text-gray-500 truncate">{className} · {mode === "clear" ? "Send unequipped gear to the vault" : "Gear worth dismantling, across the vault and characters"}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    disabled={running}
                    className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 disabled:opacity-40"
                    title="Close (Esc)"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                </button>
            </header>

            {/* Body: options on the left, the items on the right */}
            <div className={`flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,360px)_1fr] ${running ? "pointer-events-none opacity-60" : ""}`}>
                <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar lg:border-r border-white/10">
                    <div className="flex rounded-md bg-white/5 p-0.5 self-start">
                        {MODES.map(({ id, label }) => (
                            <button
                                key={id}
                                onClick={() => setMode(id)}
                                className={`px-3 py-1 text-sm rounded transition-colors ${id === mode ? "bg-[#7e57c2] text-white" : "text-gray-400 hover:text-white"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {mode === "clear" ? (
                        <>
                            <div className="flex flex-col gap-3 items-start">
                                <span className={sectionLabel}>Send</span>
                                <DestinyCheckBox checked={options.clear.weapons} label="Weapons" onClick={() => setClear({ weapons: !options.clear.weapons })} />
                                <DestinyCheckBox checked={options.clear.armor} label="Armor" onClick={() => setClear({ armor: !options.clear.armor })} />
                            </div>
                            <div className="flex flex-col gap-3 items-start">
                                <span className={sectionLabel}>Keep</span>
                                <DestinyCheckBox checked={options.clear.keepLocked} label="Locked items" onClick={() => setClear({ keepLocked: !options.clear.keepLocked })} />
                            </div>
                            <p className="text-sm text-gray-500">Equipped items and the postmaster stay where they are.</p>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col gap-4">
                                <span className={sectionLabel}>Rules</span>
                                <div className="flex items-center justify-between gap-4">
                                    <DestinyCheckBox checked={options.junk.dupes} label="Worse duplicates" onClick={() => setJunk({ dupes: !options.junk.dupes })} />
                                    <span className="text-sm text-gray-500">{reasonCounts.dupe}</span>
                                </div>
                                {numberField("Armor stat total under", `0 turns it off · ${reasonCounts.lowStats} found`, options.junk.minArmorTotal, 200, (minArmorTotal) => setJunk({ minArmorTotal }))}
                                {numberField("Gear tier under", `0 turns it off · ${reasonCounts.lowTier} found`, options.junk.minGearTier, 5, (minGearTier) => setJunk({ minGearTier }))}
                            </div>
                            <p className="text-sm text-gray-500">
                                Locked items and items in a loadout are never flagged. Among duplicates, the copy kept is the locked,
                                crafted or masterworked one, then the highest tier, power and stats.
                            </p>
                            <p className="text-sm text-gray-500">
                                Bungie doesn&apos;t allow dismantling from here: bring the junk to your {className} and dismantle it in game.
                            </p>
                        </>
                    )}
                </div>

                <div className="flex flex-col min-h-0 gap-6 p-6 overflow-y-auto custom-scrollbar border-t lg:border-t-0 border-white/10">
                    {shownCount === 0 ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-gray-500 text-center">
                            {mode === "clear" ? "Nothing to send to the vault." : "No junk found with these rules."}
                        </div>
                    ) : mode === "clear" ? (
                        renderGroups(clearable, ({ item }) => <div key={item.itemInstanceId}>{renderItem(item)}</div>)
                    ) : (
                        renderGroups(junk, ({ item, ownerId, reasons }) => {
                            const isExcluded = excluded.has(item.itemInstanceId);
                            const reasonText = reasons.map((r) => REASON_LABELS[r]).join(", ");
                            return (
                                <div key={item.itemInstanceId} className="flex flex-col items-center gap-1 w-[76px]">
                                    <div className={`relative transition-opacity ${isExcluded ? "opacity-30" : ""}`}>
                                        {renderItem(item)}
                                        <button
                                            onClick={() => toggleExcluded(item.itemInstanceId)}
                                            role="checkbox"
                                            aria-checked={!isExcluded}
                                            aria-label={`Include ${itemDefinitions[item.itemHash]?.displayProperties?.name ?? "item"}`}
                                            title={isExcluded ? "Include" : "Leave out"}
                                            className={`absolute -top-1.5 -right-1.5 z-[2] flex size-5 items-center justify-center rounded-full border transition-colors ${isExcluded ? "bg-[#2a2a2a] border-white/30 text-transparent hover:text-gray-400" : "bg-[#7e57c2] border-[#7e57c2] text-white hover:bg-[#8e67d2]"}`}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                                        </button>
                                    </div>
                                    <span className="w-full truncate text-center text-[10px] leading-tight text-gray-400" title={reasonText}>{reasonText}</span>
                                    <span className="text-[10px] leading-tight text-gray-600">{ownerName(ownerId)}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
                {progress ? (
                    <span className="mr-auto text-sm text-gray-400">Moving {progress.done + 1}/{progress.total}...</span>
                ) : mode === "junk" && gatherPlan.skipped.length > 0 ? (
                    <span className="mr-auto text-sm text-amber-400">
                        {gatherPlan.skipped.length} items won&apos;t fit on your {className} and will stay where they are.
                    </span>
                ) : null}
                {mode === "clear" ? (
                    <button
                        onClick={() => runMoves(clearable, "vault")}
                        disabled={running || clearable.length === 0}
                        className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors disabled:opacity-40 disabled:hover:bg-[#7e57c2]"
                    >
                        Send {clearable.length} items to the vault
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => setExcluded(new Set())}
                            disabled={running || excluded.size === 0}
                            className="px-4 py-2 text-sm text-gray-300 rounded-md hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => runMoves(gatherPlan.moves, characterId)}
                            disabled={running || gatherPlan.moves.length === 0}
                            className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors disabled:opacity-40 disabled:hover:bg-[#7e57c2]"
                        >
                            Bring {gatherPlan.moves.length} items to your {className}
                        </button>
                    </>
                )}
            </footer>
        </div>,
        document.body
    );
};

export default InventoryCleanerModal;
