import { LoadoutIdentifiers } from "@/lib/bungie";
import { ARMOR_SLOTS, EQUIPMENT_SLOTS, UNSET_PLUG_HASH } from "@/lib/constants";
import { InstanceComponents, Item, ItemComponents, ItemDefinitions, LoadoutColorDefinitions, LoadoutIconDefinitions, LoadoutItem, LoadoutNameDefinitions } from "@/lib/types";
import { armorStatsWithPlugs, plugsStats, sumStats } from "./stats";

const sortByIndex = <T extends { index: number }>(definitions: Record<string, T>) =>
    Object.values(definitions).sort((a, b) => a.index - b.index);

/** The colors, icons and names a loadout can use, in the game's order, without the blank placeholders. */
export const getLoadoutChoices = (
    colorDefinitions: LoadoutColorDefinitions,
    iconDefinitions: LoadoutIconDefinitions,
    nameDefinitions: LoadoutNameDefinitions
) => ({
    colors: sortByIndex(colorDefinitions).filter((color) => color.colorImagePath),
    icons: sortByIndex(iconDefinitions).filter((icon) => icon.iconImagePath),
    names: sortByIndex(nameDefinitions).filter((name) => name.name),
});

/** First color, icon and name: what a new loadout gets until the player picks. 0 while the tables load. */
export const defaultLoadoutIdentifiers = ({ colors, icons, names }: ReturnType<typeof getLoadoutChoices>): LoadoutIdentifiers => ({
    colorHash: colors[0]?.hash ?? 0,
    iconHash: icons[0]?.hash ?? 0,
    nameHash: names[0]?.hash ?? 0,
});

interface LoadoutEquipContext {
    loadoutItems: LoadoutItem[]
    /** What the character has equipped before the loadout */
    equipped: Item[]
    /** The profile's entry of each item, by instance id */
    itemsById: Map<string, Item>
    itemComponents: ItemComponents
    itemDefinitions: ItemDefinitions
    classType: number | undefined
}

/**
 * What equipping a loadout changes, as the game does it: the plugs it records go in its items (mods, subclass setup,
 * artifact perks), which changes the armor's stats, and the character's armor stats follow the new armor and subclass.
 * Lets the profile show it right away, as Bungie keeps serving the old one for a while.
 */
export const loadoutEquipChanges = ({ loadoutItems, equipped, itemsById, itemComponents, itemDefinitions, classType }: LoadoutEquipContext) => {
    const components: Record<string, InstanceComponents> = {};
    const plugsById: Record<string, Record<number, number>> = {};

    loadoutItems.forEach(({ itemInstanceId, plugItemHashes }) => {
        const current = itemComponents.sockets[itemInstanceId];
        if (!current || !plugItemHashes) return;
        const plugs: Record<number, number> = {};
        plugItemHashes.forEach((plugHash, socketIndex) => {
            if (plugHash && plugHash !== UNSET_PLUG_HASH && current.sockets[socketIndex] && current.sockets[socketIndex].plugHash !== plugHash) {
                plugs[socketIndex] = plugHash;
            }
        });
        if (Object.keys(plugs).length === 0) return;
        plugsById[itemInstanceId] = plugs;

        const sockets = { ...current, sockets: current.sockets.map((socket, socketIndex) => plugs[socketIndex] ? { ...socket, plugHash: plugs[socketIndex] } : socket) };
        const instanceStats = itemComponents.stats[itemInstanceId];
        let stats = instanceStats;
        if (instanceStats) {
            const armorStats = armorStatsWithPlugs(itemInstanceId, plugs, itemComponents, itemDefinitions);
            stats = {
                ...instanceStats,
                stats: Object.fromEntries(Object.entries(instanceStats.stats).map(([statHash, stat]) =>
                    [statHash, armorStats[Number(statHash)] !== undefined ? { ...stat, value: armorStats[Number(statHash)] } : stat])),
            };
        }
        components[itemInstanceId] = { sockets, stats };
    });

    // The armor and subclass worn before and after: the loadout's items replace those of their slot
    const slotOf = (item: Item) => itemDefinitions[item.itemHash]?.inventory?.bucketTypeHash ?? 0;
    const after = new Map(equipped.map((item) => [slotOf(item), item]));
    loadoutItems.forEach(({ itemInstanceId }) => {
        const item = itemsById.get(itemInstanceId);
        if (item) after.set(slotOf(item), item);
    });
    const armorStats = (items: Item[], withLoadoutPlugs: boolean) => sumStats(items
        .filter((item) => ARMOR_SLOTS.includes(slotOf(item)))
        .map((item) => armorStatsWithPlugs(item.itemInstanceId, withLoadoutPlugs ? plugsById[item.itemInstanceId] ?? {} : {}, itemComponents, itemDefinitions)));
    const subclassPlugs = (item: Item | undefined, withLoadoutPlugs: boolean) => (itemComponents.sockets[item?.itemInstanceId ?? ""]?.sockets ?? [])
        .map((socket, socketIndex) => (withLoadoutPlugs ? plugsById[item!.itemInstanceId]?.[socketIndex] : undefined) ?? socket.plugHash);

    const before = sumStats([
        armorStats(equipped, false),
        plugsStats(subclassPlugs(equipped.find((item) => slotOf(item) === EQUIPMENT_SLOTS.SUBCLASS), false), itemDefinitions, classType),
    ]);
    const afterItems = [...after.values()];
    const total = sumStats([
        armorStats(afterItems, true),
        plugsStats(subclassPlugs(afterItems.find((item) => slotOf(item) === EQUIPMENT_SLOTS.SUBCLASS), true), itemDefinitions, classType),
    ]);
    const statDelta = Object.fromEntries(Object.keys(total).map((statHash) => [statHash, total[Number(statHash)] - before[Number(statHash)]]));

    return { components, statDelta };
};
