import { ItemDefinitions, ObjectiveDefinitions } from "@/lib/hooks/useDefinitions";
import { ItemComponents, ItemObjective } from "@/lib/hooks/useProfile";

// Kill tracker plugs (crucible, vanguard, ...) all live in this plug category, whatever the locale
const KILL_TRACKER_PLUG_CATEGORY = "trackers";

export interface KillCounter {
    objective: ItemObjective & { progress: number };
    label: string;
}

export const getWeaponKillCounter = (
    itemInstanceId: string | undefined,
    itemComponents: ItemComponents,
    itemDefinitions: ItemDefinitions,
    objectiveDefinitions: ObjectiveDefinitions
): KillCounter | undefined => {
    if (!itemInstanceId) return undefined;

    const objectivesPerPlug = itemComponents.plugObjectives?.[itemInstanceId]?.objectivesPerPlug ?? {};
    const trackerPlugHash = itemComponents.sockets?.[itemInstanceId]?.sockets
        ?.map((socket) => socket.plugHash)
        .find((plugHash) => plugHash && itemDefinitions[plugHash]?.plug?.plugCategoryIdentifier?.includes(KILL_TRACKER_PLUG_CATEGORY));
    if (!trackerPlugHash) return undefined;

    const objective = (objectivesPerPlug[trackerPlugHash] ?? [])
        .find((objective): objective is ItemObjective & { progress: number } => objective.visible !== false && typeof objective.progress === "number");
    if (!objective) return undefined;

    const definition = objectiveDefinitions[objective.objectiveHash];
    return {
        objective,
        label: definition?.progressDescription || definition?.displayProperties?.name || itemDefinitions[trackerPlugHash]?.displayProperties?.name || "Kills",
    };
};
