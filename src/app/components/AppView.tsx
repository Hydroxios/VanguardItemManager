"use client";

import { getGlobalAlerts } from "@/lib/bungie";
import { useEffect, useState } from "react";
import CharacterSelector from "./CharacterSelector";
import CharacterView from "@/app/components/character/CharacterView";
import RefreshButton from "@/app/components/inputs/RefreshButton";
import "./loading.css";
import Loader from "./Loader";
import { useDebug } from "@/app/components/debug/DebugProvider";
import { useDefinitions } from "@/lib/hooks/useDefinitions";
import { useProfile } from "@/lib/hooks/useProfile";
import { useItemTooltip } from "@/lib/hooks/useItemTooltip";
import DestinyCheckBox from "./destiny-ui/DestinyCheckbox";

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

  const {debugMode, setDebugMode} = useDebug()

  const { loadingDefinitions } = useDefinitions()
  const { loadingProfile, user } = useProfile()
  const { keepOpen, setKeepOpen } = useItemTooltip()
  const init = async () => {
    const alerts: any[] = await getGlobalAlerts();
    setAlerts(alerts);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div>
      <div className="flex flex-row items-center gap-[250px]">
        {!loadingDefinitions ? (
          <>
            {!loadingProfile ? (
              <>
                <div className="flex flex-row gap-2 fixed right-[15px] top-[10px]" style={{zIndex: 1001}}>
                  <RefreshButton/>
                </div>
                {currentCharacter ? (
                  <div className="relative pt-4">
                    <CharacterView
                      characterId={currentCharacter}
                      changeCharacter={() => setCurrentCharacter(undefined)}
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
            ) : (
              <Loader title="Loading Profile..."/>
            )}
          </>
        ) : (
          <Loader title={`Loading Destiny Databases...`}/>
        )}
      </div>
      {alerts.length > 0 && (
        <footer className="p-4 bg-gray-800 text-white w-full text-center mt-2 border-t-4 border-red-500 absolute bottom-8 right-0 ">
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
      {process.env.NODE_ENV === "development" && <div className="fixed top-[80px] left-5 z-[1002] flex flex-col gap-4 items-start w-[200px]">
        <div>
          <DestinyCheckBox label="Debug Mode" checked={debugMode} onClick={() => {setDebugMode(!debugMode)}} />
        </div>
        <div>
          <DestinyCheckBox label="Keep Tooltip Open" checked={keepOpen} onClick={() => {setKeepOpen(!keepOpen)}}/> 
        </div>
      </div>}
    </div>
  );
};

export default AppView;
