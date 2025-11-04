"use client";

import { getGlobalAlerts } from "@/lib/bungie";
import { useEffect, useState } from "react";
import CharacterSelector from "./CharacterSelector";
import CharacterView from "@/app/components/character/CharacterView";
import "./loading.css";
import { useDebug } from "@/app/components/debug/DebugProvider";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import DestinyCheckBox from "./destiny-ui/DestinyCheckbox";
import LoadingStatus from "./LoadingStatus";
import SettingsModal from "./SettingsModal";

interface Alert {
  AlertKey: string
  AlertHtml: string
  AlertTimestamp: Date
  AlertLink: string
  AlertLevel: number
  AlertType: number
}

const AppView = () => {
  const [currentCharacter, setCurrentCharacter] = useState<string | undefined>();

  const [alerts, setAlerts] = useState<Alert[]>([]);

  const {debugMode, handleDebugModeChange} = useDebug()

  const { loadingDefinitions } = useDefinitions()
  const { loadingProfile, user } = useProfile()
  const { keepOpen, setKeepOpen } = useItemTooltip()
  const [settingsOpen, setSettingsOpen] = useState(false);
  const init = async () => {
    const alerts: any[] = await getGlobalAlerts();
    setAlerts(alerts);
  };

  useEffect(() => {
    init();
  }, []);

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
                  changeCharacter={(characterId) => setCurrentCharacter(characterId)}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              </div>
            ) : (
              <>
                <div className="p-10">
                  <h2>{user && "Welcome " + user.uniqueName}</h2>
                  <br />
                  <h4>Select Your Character</h4>
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
        <footer className="p-2 bg-black bg-opacity-50 backdrop-blur-lg text-white w-full text-center mt-2 border-t-2 border-red-500 absolute bottom-10 right-0 shadow-lg" style={{ backdropFilter: 'blur(12px)' }}>
          <ul>
            {alerts.map((alert, index) => (
              <li key={index}>
                <span className="cursor-pointer" onClick={() => window.open(alert.AlertLink)}>
                  {alert.AlertHtml}
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
