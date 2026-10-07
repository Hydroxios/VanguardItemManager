import { Item, ItemComponents, ItemDefinition, ItemDefinitions, ItemPlug } from "@/lib/types";

/** Builders for the few fields the helpers read; everything else of the real types is left out. */

export const item = (fields: Partial<Item>): Item => ({
    bucketHash: 1,
    itemHash: 100,
    itemInstanceId: "",
    overrideStyleItemHash: 0,
    location: 1,
    quantity: 1,
    state: 0,
    transferStatus: 0,
    ...fields,
});

export const definition = (fields: Partial<ItemDefinition>): ItemDefinition => fields as ItemDefinition;

export const definitions = (...defs: ItemDefinition[]): ItemDefinitions =>
    Object.fromEntries(defs.map((def) => [def.hash, def])) as ItemDefinitions;

export const plug = (plugItemHash: number, fields: Partial<ItemPlug> = {}): ItemPlug =>
    ({ plugItemHash, canInsert: true, enabled: true, ...fields });

export const components = (fields: Partial<ItemComponents> = {}): ItemComponents => ({
    instances: {},
    perks: {},
    sockets: {},
    stats: {},
    plugObjectives: {},
    reusablePlugs: {},
    ...fields,
});
