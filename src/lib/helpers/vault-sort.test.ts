import { describe, expect, it } from "vitest";
import { SortableItem, sortVaultItems } from "./vault-sort";

const names = (items: SortableItem[]) => items.map((item) => item.name);
const sort = (items: SortableItem[], by: Parameters<typeof sortVaultItems>[1], direction: "asc" | "desc") =>
    names(sortVaultItems(items, by, direction, (item) => item));

const items: SortableItem[] = [
    { name: "Fatebringer", itemInstanceId: "6917529000000000002", rarity: 5, power: 450, tier: 3, typeName: "Hand Cannon" },
    { name: "Ace of Spades", itemInstanceId: "6917529000000000010", rarity: 6, power: 460, typeName: "Hand Cannon" },
    { name: "Bad Juju", itemInstanceId: "6917529000000000001", rarity: 6, power: 450, tier: 5, typeName: "Pulse Rifle" },
    { name: "Glimmer", rarity: 3 },
];

describe("sortVaultItems", () => {
    it("sorts by name both ways", () => {
        expect(sort(items, "name", "asc")).toEqual(["Ace of Spades", "Bad Juju", "Fatebringer", "Glimmer"]);
        expect(sort(items, "name", "desc")).toEqual(["Glimmer", "Fatebringer", "Bad Juju", "Ace of Spades"]);
    });

    it("breaks ties by name", () => {
        expect(sort(items, "power", "desc")).toEqual(["Ace of Spades", "Bad Juju", "Fatebringer", "Glimmer"]);
        expect(sort(items, "rarity", "desc")).toEqual(["Ace of Spades", "Bad Juju", "Fatebringer", "Glimmer"]);
    });

    it("puts items without the value last, whatever the direction", () => {
        expect(sort(items, "tier", "desc")).toEqual(["Bad Juju", "Fatebringer", "Ace of Spades", "Glimmer"]);
        expect(sort(items, "tier", "asc")).toEqual(["Fatebringer", "Bad Juju", "Ace of Spades", "Glimmer"]);
        expect(sort(items, "power", "asc")).toEqual(["Bad Juju", "Fatebringer", "Ace of Spades", "Glimmer"]);
    });

    it("sorts the newest first from instance ids too big for numbers", () => {
        expect(sort(items, "newest", "desc")).toEqual(["Ace of Spades", "Fatebringer", "Bad Juju", "Glimmer"]);
    });

    it("groups by type", () => {
        expect(sort(items, "type", "asc")).toEqual(["Ace of Spades", "Fatebringer", "Bad Juju", "Glimmer"]);
    });

    it("leaves the input untouched", () => {
        const copy = [...items];
        sortVaultItems(items, "power", "desc", (item) => item);
        expect(items).toEqual(copy);
    });
});
