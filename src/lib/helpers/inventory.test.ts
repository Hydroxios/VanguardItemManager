import { describe, expect, it } from "vitest";
import { item } from "@/test/fixtures";
import { InventoryState, moveItemInState, putItem, takeItem } from "./inventory";

const state = (fields: Partial<InventoryState>): InventoryState => ({
    profileInventory: [],
    characterInventories: {},
    characterEquipment: {},
    ...fields,
});

describe("takeItem", () => {
    it("matches instanced items by instance id only", () => {
        const items = [item({ itemHash: 1, itemInstanceId: "a" }), item({ itemHash: 1, itemInstanceId: "b" })];
        const result = takeItem(items, { itemHash: 1, itemInstanceId: "b", quantity: 1 });
        expect(result.item?.itemInstanceId).toBe("b");
        expect(result.items.map((i) => i.itemInstanceId)).toEqual(["a"]);
    });

    it("splits a stack when moving part of it", () => {
        const items = [item({ itemHash: 7, quantity: 10 })];
        const result = takeItem(items, { itemHash: 7, itemInstanceId: undefined, quantity: 3 });
        expect(result.item?.quantity).toBe(3);
        expect(result.items[0].quantity).toBe(7);
        expect(items[0].quantity).toBe(10);
    });

    it("treats instance id \"0\" as a stack", () => {
        const items = [item({ itemHash: 7, quantity: 2 })];
        expect(takeItem(items, { itemHash: 7, itemInstanceId: "0", quantity: 2 }).items).toEqual([]);
    });

    it("picks the stack in the given bucket", () => {
        const items = [item({ itemHash: 7, bucketHash: 1, quantity: 5 }), item({ itemHash: 7, bucketHash: 2, quantity: 5 })];
        const result = takeItem(items, { itemHash: 7, itemInstanceId: undefined, quantity: 5, sourceBucketHash: 2 });
        expect(result.item?.bucketHash).toBe(2);
        expect(result.items.map((i) => i.bucketHash)).toEqual([1]);
    });

    it("never takes an instanced item for a stack", () => {
        const items = [item({ itemHash: 7, itemInstanceId: "a" })];
        const result = takeItem(items, { itemHash: 7, itemInstanceId: undefined, quantity: 1 });
        expect(result.item).toBeUndefined();
        expect(result.items).toBe(items);
    });
});

describe("putItem", () => {
    it("merges a stack into the existing one of the same bucket", () => {
        const items = [item({ itemHash: 7, quantity: 4 })];
        expect(putItem(items, item({ itemHash: 7, quantity: 3 }))).toEqual([item({ itemHash: 7, quantity: 7 })]);
    });

    it("keeps stacks of different buckets apart", () => {
        const items = [item({ itemHash: 7, bucketHash: 1 })];
        expect(putItem(items, item({ itemHash: 7, bucketHash: 2 }))).toHaveLength(2);
    });

    it("appends instanced items", () => {
        const items = [item({ itemHash: 1, itemInstanceId: "a" })];
        expect(putItem(items, item({ itemHash: 1, itemInstanceId: "b" }))).toHaveLength(2);
    });
});

describe("moveItemInState", () => {
    it("moves an item from a character to the vault", () => {
        const sword = item({ itemHash: 1, itemInstanceId: "a" });
        const before = state({ characterInventories: { c1: { items: [sword] } } });
        const { state: after, movedItem } = moveItemInState(before, { itemHash: 1, itemInstanceId: "a", fromId: "c1", toId: "vault", quantity: 1 });
        expect(movedItem?.location).toBe(2);
        expect(after.characterInventories.c1.items).toEqual([]);
        expect(after.profileInventory).toEqual([{ ...sword, location: 2 }]);
    });

    it("moves an item from the vault to a character it never had items on", () => {
        const sword = item({ itemHash: 1, itemInstanceId: "a", location: 2 });
        const { state: after } = moveItemInState(state({ profileInventory: [sword] }), { itemHash: 1, itemInstanceId: "a", fromId: "vault", toId: "c1", quantity: 1 });
        expect(after.profileInventory).toEqual([]);
        expect(after.characterInventories.c1.items).toEqual([{ ...sword, location: 1 }]);
    });

    it("takes the item from the equipment when it isn't in the inventory", () => {
        const helmet = item({ itemHash: 2, itemInstanceId: "h" });
        const before = state({ characterInventories: { c1: { items: [] } }, characterEquipment: { c1: { items: [helmet] } } });
        const { state: after } = moveItemInState(before, { itemHash: 2, itemInstanceId: "h", fromId: "c1", toId: "c2", quantity: 1 });
        expect(after.characterEquipment.c1.items).toEqual([]);
        expect(after.characterInventories.c1).toBe(before.characterInventories.c1);
        expect(after.characterInventories.c2.items).toEqual([helmet]);
    });

    it("applies the updates to the moved item", () => {
        const gift = item({ itemHash: 3, bucketHash: 215593132 });
        const before = state({ characterInventories: { c1: { items: [gift] } } });
        const { movedItem } = moveItemInState(before, { itemHash: 3, itemInstanceId: undefined, fromId: "c1", toId: "c1", quantity: 1, updates: { bucketHash: 9 } });
        expect(movedItem?.bucketHash).toBe(9);
    });

    it("leaves the state untouched when the item isn't found", () => {
        const before = state({ profileInventory: [item({ itemHash: 1, itemInstanceId: "a" })] });
        const result = moveItemInState(before, { itemHash: 1, itemInstanceId: "z", fromId: "vault", toId: "c1", quantity: 1 });
        expect(result.movedItem).toBeUndefined();
        expect(result.state).toBe(before);
    });

    it("keeps the references of the lists it doesn't touch", () => {
        const before = state({
            profileInventory: [item({ itemHash: 1, itemInstanceId: "a" })],
            characterInventories: { c1: { items: [] }, c2: { items: [] } },
            characterEquipment: { c1: { items: [] } },
        });
        const { state: after } = moveItemInState(before, { itemHash: 1, itemInstanceId: "a", fromId: "vault", toId: "c1", quantity: 1 });
        expect(after.characterInventories.c2).toBe(before.characterInventories.c2);
        expect(after.characterEquipment).toBe(before.characterEquipment);
    });
});
