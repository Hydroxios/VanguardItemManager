import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { useEffect, useState, useRef } from "react";
import HeaderButton from "./HeaderButton";
import EmblemSelector from "./EmblemSelector";

interface CharacterHeaderProps {
  characterId: string;
  changeCharacter: (characterId: string | undefined) => void;
  toggleSearch: () => void;
  onOpenSettings: () => void;
}

const CharacterHeader = ({
  characterId,
  changeCharacter,
  toggleSearch,
  onOpenSettings,
}: CharacterHeaderProps) => {
  const { itemDefinitions, seasonDefinitions } = useDefinitions();
  const { characters, profile, refresh, refreshing } =
    useProfile();

  const [emblemSpecial, setEmblemSpecial] = useState<string>(
    `https://www.bungie.net${itemDefinitions[characters[characterId].emblemHash].secondarySpecial}`
  );
  const [emblemOverlay, setEmblemOverlay] = useState<string>(
    `https://www.bungie.net${itemDefinitions[characters[characterId].emblemHash].secondaryOverlay}`
  );

  const [isEmblemSelectorOpen, setIsEmblemSelectorOpen] = useState(false);
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState<number>(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const fadeTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isFirstRender, setIsFirstRender] = useState(true);

  const setEmblem = () => {
    setEmblemSpecial(
      `https://www.bungie.net${itemDefinitions[characters[characterId].emblemHash].secondarySpecial}`
    );
    setEmblemOverlay(
      `https://www.bungie.net${itemDefinitions[characters[characterId].emblemHash].secondaryOverlay}`
    );
  };

  const handleCharacterChangeFade = () => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }
    setFadeOpacity(0); // Fade out
    // Nettoie un fade précédent si encore actif
    if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    fadeTimeout.current = setTimeout(() => {
      setEmblem(); // Mets à jour l'emblème
      setFadeOpacity(1); // Fade in
    }, 200); // Durée du fade out (ms)
  };

  useEffect(() => {
    setEmblem();
    setCurrentSeasonNumber(
      seasonDefinitions[profile.currentSeasonHash].seasonNumber
    );
  }, []);

  useEffect(() => {
    handleCharacterChangeFade();
  }, [characterId, characters[characterId].emblemHash]);

  return (
    <div
      className="w-full flex flex-row items-center fixed top-0 left-0 right-0 z-[1001] shadow-lg"
      style={{
        height: "70px",
        backgroundSize: "100%",
        backgroundImage: `url(${emblemSpecial})`,
        transition: "opacity 0.5s ease-in-out",
        opacity: fadeOpacity,
      }}
    >
      <div className="w-full flex flex-row items-center justify-center">
        <img
          src={emblemOverlay}
          alt="Emblem"
          className="absolute left-[150px] top-[25px] w-20 h-20 cursor-pointer hover:scale-105 transition-all duration-500"
          style={{ transition: "opacity 0.5s ease-in-out", opacity: fadeOpacity }}
          onClick={() => setIsEmblemSelectorOpen((prev) => !prev)}
        />
        {isEmblemSelectorOpen && (
          <EmblemSelector
            isOpen={isEmblemSelectorOpen}
            onClose={() => setIsEmblemSelectorOpen(false)}
            characterId={characterId}
          />
        )}
        <div className="flex flex-col items-start justify-center absolute left-[240px] top-[20px]">
          <div className="w-2 h-[2px] bg-white" />
          <span className="text-white text-xl font-bold">
            {profile.userInfo?.displayName}
            <span className="text-cyan-300">
              #{profile.userInfo?.bungieGlobalDisplayNameCode}
            </span>
          </span>
          <div className="flex flex-row items-center justify-center gap-2">
            <span className="text-white text-sm">
              Season {currentSeasonNumber}
            </span>
            <span className="text-yellow-400 text-sm">
              ✧ {characters[characterId].light}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-row items-center justify-center relative right-[20px] bottom-[0px] h-full">
        <div className="flex flex-row items-center justify-center pr-10">
          {profile.characterIds.map((c) => (
            <HeaderButton
              key={c}
              active={c === characterId}
              onClick={() => {
                c !== characterId && changeCharacter(c);
              }}
              width={50}
            >
              <img
                src={`${characters[c].classHash}.svg`}
                alt="Emblem"
                className="w-6 h-6"
              />
            </HeaderButton>
          ))}
        </div>

        <HeaderButton
          onClick={toggleSearch}
          width={50}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="16.65"
              y1="16.65"
              x2="21"
              y2="21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </HeaderButton>
        <HeaderButton
          onClick={() => {
            refresh();
          }}
          width={50}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${refreshing ? "animate-spin" : ""}`}
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </HeaderButton>
        <HeaderButton
          onClick={onOpenSettings}
          width={50}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M19.43 12.98c.04-.31.07-.63.07-.98s-.03-.67-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.65l-2-3.46a.5.5 0 0 0-.61-.23l-2.49 1a7.03 7.03 0 0 0-1.7-.98l-.38-2.65A.488.488 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.25-1.21.58-1.76.99l-2.49-1a.5.5 0 0 0-.61.23l-2 3.46a.5.5 0 0 0 .12.65l2.11 1.65c-.05.32-.08.64-.08.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.65l2 3.46a.5.5 0 0 0 .61.23l2.49-1c.54.41 1.13.74 1.76.99l.38 2.65A.5.5 0 0 0 10 22h4c.25 0 .46-.18.5-.42l.38-2.65a6.97 6.97 0 0 0 1.7-.98l2.49 1a.5.5 0 0 0 .61-.23l2-3.46a.5.5 0 0 0-.12-.65l-2.11-1.65ZM12 15.5a3.5 3.5 0 1 1 .001-7.001A3.5 3.5 0 0 1 12 15.5Z"
            />
          </svg>
        </HeaderButton>
      </div>
    </div>
  );
};

export default CharacterHeader;
