import Image from "next/image";
import { getEnergyCost } from "@/lib/helpers/mods";
import { ItemDefinition } from "@/lib/types";

/** Icon of a plug (mod, ability, aspect...), with its energy cost when it has one. */
const PlugIcon = ({ plug, size, showCost = true, round = false }: { plug: ItemDefinition | undefined; size: number; showCost?: boolean; round?: boolean }) => {
  const cost = showCost ? getEnergyCost(plug) : 0;
  return (
    <span className={`relative block shrink-0 border border-white/20 bg-black/40 ${round ? "rounded-full overflow-hidden" : ""}`} style={{ width: size, height: size }}>
      {plug?.displayProperties?.icon && (
        <Image src={`https://www.bungie.net${plug.displayProperties.icon}`} alt="" fill sizes={`${size}px`} />
      )}
      {cost > 0 && (
        <span className="absolute top-0 right-0 min-w-4 px-0.5 bg-black/80 text-[10px] font-bold leading-4 text-center text-white">{cost}</span>
      )}
    </span>
  );
};

export default PlugIcon;
