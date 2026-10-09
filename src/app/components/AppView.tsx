"use client";

import { getGlobalAlerts } from "@/lib/bungie";
import { useEffect, useState } from "react";
import CharacterSelector from "./CharacterSelector";
import CharacterView from "@/app/components/character/CharacterView";
import { useDebug } from "@/app/components/debug/DebugProvider";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import { useSettings } from "@/lib/hooks/useSettings";
import LoadingStatus from "./LoadingStatus";
import SettingsModal from "./SettingsModal";
import Image from "next/image";
import { Alert } from "@/lib/types";

// Bungie alerts are HTML snippets; show their text without rendering untrusted markup
const htmlToText = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";

const AppView = () => {
  const [currentCharacter, setCurrentCharacter] = useState<string | undefined>();

  const [alerts, setAlerts] = useState<Alert[]>([]);

  const { debugMode, handleDebugModeChange } = useDebug()

  const { loadingDefinitions } = useDefinitions()
  const { loadingProfile, profile, lastRefresh, refresh } = useProfile()
  const { keepOpen, setKeepOpen } = useItemTooltip()
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings: { refreshInterval } } = useSettings();

  // Bungie's global alerts (maintenance announcements...)
  useEffect(() => {
    let active = true;
    getGlobalAlerts().then((alerts: Alert[]) => {
      if (active) setAlerts(alerts);
    });
    return () => { active = false; };
  }, []);

  // Keeps the profile in sync with the game, as often as set (never at 0); the API layer renews the access token when needed
  useEffect(() => {
    if (refreshInterval === 0) return;
    const interval = refreshInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      if (lastRefresh && Date.now() - lastRefresh < interval) {
        return;
      }
      refresh();
    }, interval);

    return () => clearInterval(intervalId);
  }, [lastRefresh, refresh, refreshInterval]);

  return (
    <div>
      {/* Global aggregated loading status */}
      <LoadingStatus />

      <div className="flex flex-row items-center gap-[250px]">
        {!loadingDefinitions && !loadingProfile && (
          <>
            {currentCharacter ? (
              <div className="relative pt-4">
                <CharacterView
                  characterId={currentCharacter}
                  changeCharacter={setCurrentCharacter}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              </div>
            ) : (
              <>
                <div className="p-10">
                  <div className="flex flex-col items-center">
                    <Image src="./vanguard.svg" height={128} width={128} alt="Vanguard Item Manager logo" />
                    <span className="text-white text-xl font-bold">
                      Welcome {profile.userInfo?.displayName}
                      <span className="text-cyan-300">
                        #{profile.userInfo?.bungieGlobalDisplayNameCode}
                      </span>
                    </span>
                    <h4>Select Your Character</h4>
                  </div>
                </div>
                <div className="p-10">
                  <CharacterSelector
                    onSelectCharacter={(charId) => {
                      setCurrentCharacter(charId);
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
      {/* SettingsModal (new, see implementation) */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} debugMode={debugMode} handleDebugModeChange={handleDebugModeChange} keepOpen={keepOpen} setKeepOpen={setKeepOpen} />
      {alerts.length > 0 && (
        <footer className="p-2 bg-black/50 backdrop-blur-lg text-white w-full text-center mt-2 border-t-2 border-red-500 absolute bottom-10 right-0 shadow-lg" style={{ backdropFilter: 'blur(12px)' }}>
          <ul>
            {alerts.map((alert, index) => (
              <li key={index}>
                <span className="cursor-pointer" onClick={() => window.open(alert.AlertLink)}>
                  {htmlToText(alert.AlertHtml)}
                </span>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </div>
  );
};

export default AppView;
