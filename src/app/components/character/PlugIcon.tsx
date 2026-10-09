import Image from "next/image";
import { getEnergyCost } from "@/lib/helpers/mods";
import { ItemDefinition } from "@/lib/types";

/** Icon of a plug (mod, ability, aspect...), with its energy cost when it has one. Artifact perks get the game's teal tile. */
const PlugIcon = ({ plug, size, showCost = true, round = false, artifact = false }: { plug: ItemDefinition | undefined; size: number; showCost?: boolean; round?: boolean; artifact?: boolean }) => {
  const cost = showCost ? getEnergyCost(plug) : 0;
  const tile = artifact
    ? "border-2 border-[#6cc4bb] bg-gradient-to-b from-[#2f8a83] to-[#1c5e5a] shadow-[inset_0_0_6px_rgba(0,0,0,0.35)]"
    : "border border-white/20 bg-black/40";
  return (
    <span className={`relative block shrink-0 ${tile} ${round ? "rounded-full overflow-hidden" : ""}`} style={{ width: size, height: size }}>
      {plug?.displayProperties?.icon && (
        // The artifact glyph (cyan in the icon) is white and sits inside its tile with some margin, like in game
        <span className={`absolute ${artifact ? "inset-[12%] brightness-0 invert" : "inset-0"}`}>
          <Image src={`https://www.bungie.net${plug.displayProperties.icon}`} alt="" fill sizes={`${size}px`} />
        </span>
      )}
      {cost > 0 && (
        <span className="absolute top-0 right-0 min-w-4 px-0.5 bg-black/80 text-[10px] font-bold leading-4 text-center text-white">{cost}</span>
      )}
    </span>
  );
};

export default PlugIcon;
