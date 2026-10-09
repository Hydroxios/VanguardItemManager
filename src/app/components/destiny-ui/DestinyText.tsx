import { Fragment, useMemo } from "react";
import { useDefinitions } from "@/lib/hooks/useDefinitions";

/**
 * Glyphs of the Destiny Symbols font, each with a definition whose text holds its bracketed term (from DIM's data).
 * The term is read from the manifest, so it matches the language the definitions are loaded in.
 */
const GLYPH_SOURCES: [codepoint: number, table: "perk" | "objective" | "item", hash: number][] = [
  [0xe110, "perk", 729990577], // [Melee]
  [0xe111, "perk", 528482921], // [Grenade]
  [0xe099, "objective", 1368601876], // [Bow]
  [0xe100, "objective", 49530695], // [Auto Rifle]
  [0xe101, "objective", 189060104], // [Pulse Rifle]
  [0xe102, "objective", 75057024], // [Scout Rifle]
  [0xe103, "objective", 563593850], // [Hand Cannon]
  [0xe109, "objective", 141911950], // [Sidearm]
  [0xe107, "objective", 102976778], // [SMG]
  [0xe104, "objective", 212380697], // [Shotgun]
  [0xe105, "objective", 273389628], // [Sniper Rifle]
  [0xe106, "objective", 215999859], // [Fusion Rifle]
  [0xe155, "objective", 1217177904], // [Special Grenade Launcher]
  [0xe156, "objective", 1351954994], // [Glaive]
  [0xe138, "objective", 554293431], // [Trace Rifle]
  [0xe108, "objective", 13215836], // [Rocket Launcher]
  [0xe113, "objective", 43313268], // [Grenade Launcher]
  [0xe152, "objective", 1476676901], // [Linear Fusion Rifle]
  [0xe153, "objective", 1260068656], // [Sword]
  [0xe154, "objective", 172143731], // [Machine Gun]
  [0xe142, "objective", 30510483], // [Headshot]
  [0xe143, "perk", 679036014], // [Arc]
  [0xe144, "perk", 1554078996], // [Void]
  [0xe140, "perk", 1821367741], // [Solar]
  [0xe139, "perk", 35992462], // [Stasis]
  [0xef0e, "perk", 381243875], // [Strand]
  [0xe070, "perk", 200616812], // [Shield-Piercing]
  [0xe072, "perk", 72139184], // [Stagger]
  [0xe071, "perk", 136649446], // [Disruption]
  [0xe075, "objective", 119206183], // [Quest]
  // Kinetic: only artifact descriptions use it; this one starts with it (Encrypted Data Disk)
  [0xe141, "item", 1014202826], // [Kill]
];

// Used when the source above doesn't give the term (definitions still loading, or Bungie reworded the text)
const ENGLISH_FALLBACK: Record<string, number> = { "[Kill]": 0xe141 };

// Like in game, element glyphs take their element's color
const GLYPH_COLORS: Record<string, string> = {
  [String.fromCodePoint(0xe143)]: "#7aecf3", // Arc
  [String.fromCodePoint(0xe144)]: "#b185df", // Void
  [String.fromCodePoint(0xe140)]: "#f2721b", // Solar
  [String.fromCodePoint(0xe139)]: "#4d88ff", // Stasis
  [String.fromCodePoint(0xef0e)]: "#35e366", // Strand
};

const BRACKETED = /\[[^\]]+\]/;
// A bracketed term, a glyph the text already holds (private use area of the font), or a line break
const TOKEN = /(\[[^\]]+\]|[\uE000-\uF8FF]|\n)/;
const isGlyph = (part: string) => /^[\uE000-\uF8FF]$/.test(part);

/** A text from the game, with its bracketed terms and symbols drawn as the game's icons, and its line breaks. */
const DestinyText = ({ text }: { text?: string }) => {
  const { perksDefinitions, objectiveDefinitions, itemDefinitions } = useDefinitions();

  // "[Arc]" (or its translation) -> glyph
  const glyphs = useMemo(() => {
    const table: Record<string, string> = Object.fromEntries(
      Object.entries(ENGLISH_FALLBACK).map(([term, codepoint]) => [term, String.fromCodePoint(codepoint)])
    );
    GLYPH_SOURCES.forEach(([codepoint, kind, hash]) => {
      const source = kind === "perk"
        ? perksDefinitions[hash]?.displayProperties.description
        : kind === "item"
          ? itemDefinitions[hash]?.displayProperties.description
          : objectiveDefinitions[hash]?.progressDescription;
      const term = source?.match(BRACKETED)?.[0];
      if (term) table[term] = String.fromCodePoint(codepoint);
    });
    return table;
  }, [perksDefinitions, objectiveDefinitions, itemDefinitions]);

  if (!text) return null;
  return (
    <>
      {text.split(TOKEN).map((part, index) => {
        if (part === "\n") return <br key={index} />;
        const glyph = glyphs[part] ?? (isGlyph(part) ? part : undefined);
        return glyph
          ? <span key={index} className="destiny-symbols" style={{ color: GLYPH_COLORS[glyph] }} title={part.startsWith("[") ? part.slice(1, -1) : undefined}>{glyph}</span>
          : <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
};

export default DestinyText;
