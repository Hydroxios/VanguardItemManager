import { LoadoutIdentifiers } from "@/lib/bungie";
import { LoadoutColorDefinitions, LoadoutIconDefinitions, LoadoutNameDefinitions } from "@/lib/types";

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
