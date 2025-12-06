export enum DamageType {
    Kinetic = 1,
    Arc = 2,
    Solar = 3,
    Void = 4,
    Stasis = 6,
    Strand = 7,
}

export const DAMAGE_TYPES_LIST = [
    DamageType.Kinetic,
    DamageType.Arc,
    DamageType.Solar,
    DamageType.Void,
    DamageType.Stasis,
    DamageType.Strand,
];

const DAMAGE_NAMES: Record<number, string> = {
    [DamageType.Kinetic]: "Kinetic",
    [DamageType.Arc]: "Arc",
    [DamageType.Solar]: "Solar",
    [DamageType.Void]: "Void",
    [DamageType.Stasis]: "Stasis",
    [DamageType.Strand]: "Strand",
};

export const getDamageType = (type: number): string => {
    return DAMAGE_NAMES[type] ?? "Kinetic";
};

export const getDamageTypeIcon = (type: number): string => {
    const name = getDamageType(type).toLowerCase();
    const extension = type === DamageType.Strand ? "png" : "svg";
    return `${name}.${extension}`;
};