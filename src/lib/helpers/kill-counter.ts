import { ObjectiveDefinitions } from "@/lib/hooks/useDefinitions";
import { ItemComponents, ItemObjective } from "@/lib/hooks/useProfile";

const KILL_COUNTER_KEYWORDS = [
    "kill",
    "defeat",
    "final blow",
    "combatant",
    "opponent",
    "victime",
    "elimination",
    "élimination",
    "vaincu",
    "adversaire",
    "combattant",
];

export interface KillCounter {
    objective: ItemObjective & { progress: number };
    label: string;
}

export const getWeaponKillCounter = (
    itemInstanceId: string | undefined,
    itemComponents: ItemComponents,
    objectiveDefinitions: ObjectiveDefinitions
): KillCounter | undefined => {
    if (!itemInstanceId) return undefined;

    const itemObjectives = itemComponents.objectives?.[itemInstanceId]?.objectives ?? [];
    const socketPlugHashes = itemComponents.sockets?.[itemInstanceId]?.sockets
        ?.map((socket) => socket.plugHash)
        .filter((plugHash): plugHash is number => Boolean(plugHash)) ?? [];
    const objectivesPerPlug = itemComponents.plugObjectives?.[itemInstanceId]?.objectivesPerPlug ?? {};
    const plugObjectives = socketPlugHashes.flatMap((plugHash) => objectivesPerPlug[plugHash] ?? []);
    const objectives = [...plugObjectives, ...itemObjectives];

    const objective = objectives.find((objective) => {
        if (objective.visible === false || typeof objective.progress !== "number") return false;

        const definition = objectiveDefinitions[objective.objectiveHash];
        const label = `${definition?.progressDescription ?? ""} ${definition?.displayProperties?.name ?? ""}`.toLowerCase();
        if (!label.trim()) return plugObjectives.includes(objective);

        return KILL_COUNTER_KEYWORDS.some((keyword) => label.includes(keyword));
    });

    if (!objective) return undefined;

    const definition = objectiveDefinitions[objective.objectiveHash];
    return {
        objective: objective as ItemObjective & { progress: number },
        label: definition?.progressDescription || definition?.displayProperties?.name || "Kills",
    };
};
