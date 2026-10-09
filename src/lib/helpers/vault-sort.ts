export type VaultSort = "name" | "power" | "rarity" | "tier" | "type" | "newest";
export type SortDirection = "asc" | "desc";

export const VAULT_SORTS: { value: VaultSort; label: string; direction: SortDirection }[] = [
  { value: "name", label: "Name", direction: "asc" },
  { value: "power", label: "Power", direction: "desc" },
  { value: "rarity", label: "Rarity", direction: "desc" },
  { value: "tier", label: "Tier", direction: "desc" },
  { value: "type", label: "Type", direction: "asc" },
  { value: "newest", label: "Newest", direction: "desc" },
];

/** What an item is sorted on; a missing value always goes last */
export interface SortableItem {
  name: string;
  itemInstanceId?: string;
  /** `inventory.tierType`: exotic above legendary... */
  rarity?: number;
  power?: number;
  /** Gear tier, 1 to 5, on newer gear only */
  tier?: number;
  typeName?: string;
}

// Instance ids grow as items drop: the highest is the newest. Too big for a number, hence BigInt
const instanceAge = (id: string | undefined) => (id && id !== "0" ? BigInt(id) : undefined);

const compareValues = (a: number | bigint | string | undefined, b: number | bigint | string | undefined, direction: SortDirection) => {
  const missingA = a === undefined || a === "" || a === 0;
  const missingB = b === undefined || b === "" || b === 0;
  if (missingA || missingB) return missingA === missingB ? 0 : missingA ? 1 : -1;
  const order = typeof a === "string" || typeof b === "string" ? String(a).localeCompare(String(b)) : a < b ? -1 : a > b ? 1 : 0;
  return direction === "asc" ? order : -order;
};

const keyOf = (item: SortableItem, sort: VaultSort) => {
  switch (sort) {
    case "name": return item.name;
    case "power": return item.power;
    case "rarity": return item.rarity;
    case "tier": return item.tier;
    case "type": return item.typeName;
    case "newest": return instanceAge(item.itemInstanceId);
  }
};

/** A sorted copy of the items; equal items stay grouped by name */
export const sortVaultItems = <T>(items: T[], sort: VaultSort, direction: SortDirection, toSortable: (item: T) => SortableItem): T[] => {
  const sortables = new Map(items.map((item) => [item, toSortable(item)]));
  return [...items].sort((a, b) => {
    const sa = sortables.get(a)!;
    const sb = sortables.get(b)!;
    return compareValues(keyOf(sa, sort), keyOf(sb, sort), direction)
      || (sort === "name" ? 0 : sa.name.localeCompare(sb.name));
  });
};
