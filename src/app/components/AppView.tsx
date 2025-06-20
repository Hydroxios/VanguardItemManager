"use client";

import {
  BungieUser,
  getCurrentUser,
  getDefinitions,
  getGlobalAlerts,
  getProfile,
} from "@/lib/bungie";
import { useEffect, useState } from "react";
import CharacterSelector from "./CharacterSelector";
import CharacterView from "./CharacterView";
import SearchButton from "./SearchButton";
import RefreshButton from "./RefreshButton";
import "./loading.css";
import Loader from "./Loader";
import Switch from "./Switch";
import { useDebug } from "./DebugProvider";

interface AppViewProps {
  token: string;
}

const AppView = ({ token }: AppViewProps) => {
  const [user, setUser] = useState<BungieUser>();
  const [profile, setProfile] = useState<any>();
  const [currentCharacter, setCurrentCharacter] = useState<
    string | undefined
  >();

  const [alerts, setAlerts] = useState<any[]>([]);

  const [db, setDB] = useState<any | undefined>();

  const {debugMode, setDebugMode} = useDebug()

  const init = async () => {
    const alerts: any[] = await getGlobalAlerts();
    setAlerts(alerts);
    setDB(await getDefinitions(localStorage.getItem("locale") ?? "en"));
    const u = await getCurrentUser(token);
    setUser(() => u);
    const profile = await getProfile(token, u.membershipId, u.membershipType);
    setProfile(profile);
  };

  const refreshProfile = async () => {
    if (user?.membershipId && user?.membershipType) {
      const updatedProfile = await getProfile(
        token,
        user.membershipId,
        user.membershipType
      );
      setProfile(() => updatedProfile);
      console.log("Refreshed !");
    }
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div>
      <div className="flex flex-row items-center gap-[250px]">
        {db ? (
          <>
            {profile ? (
              <>
                <div className="flex flex-row gap-4 fixed top-5 right-5" style={{zIndex: 1001}}>
                  <SearchButton 
                    itemDefinition={db.DestinyInventoryItemDefinition}
                    classDefinition={db.DestinyClassDefinition}
                    characterEquipements={profile.characterEquipment.data} 
                    characterInventories={profile.characterInventories.data}
                    profileInventory={profile.profileInventory.data.items}
                    characters={profile.characters.data}
                    itemInstances={profile.itemComponents.instances.data}
                  />
                  <RefreshButton onClick={async () => await refreshProfile()} />
                </div>
                {currentCharacter ? (
                  <div className="relative pt-4">
                    <CharacterView
                      db={db.DestinyInventoryItemDefinition}
                      statsDefinition={db.DestinyStatDefinition}
                      perksDefinition={db.DestinySandboxPerkDefinition}
                      classDefinition={db.DestinyClassDefinition}
                      recordDefinition={db.DestinyRecordDefinition}
                      token={token}
                      characterId={currentCharacter}
                      membershipType={user?.membershipType as number}
                      membershipId={user?.membershipId as string}
                      changeCharacter={() => setCurrentCharacter(undefined)}
                      currencies={profile.profileCurrencies.data.items}
                      loadoutsColorDefinition={db.DestinyLoadoutColorDefinition}
                      loadoutIconDefinition={db.DestinyLoadoutIconDefinition}
                      character={{
                        equipment:
                          profile.characterEquipment.data[currentCharacter].items,
                        loadouts:
                          profile.characterLoadouts.data[currentCharacter].loadouts,
                        stats: profile.characters.data[currentCharacter].stats,
                        inventory:
                          profile.characterInventories.data[currentCharacter].items,
                      }}
                      itemInstances={profile.itemComponents.instances.data}
                      itemPerks={profile.itemComponents.perks.data}
                      itemStats={profile.itemComponents.stats.data}
                      characters={profile.characters.data}
                      refresh={async () => await refreshProfile()}
                      charactersInventory={profile.characterInventories.data}
                      profileInventory={profile.profileInventory.data.items}
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
                      {profile && (
                        <CharacterSelector
                          token={token}
                          membershipType={user?.membershipType as number}
                          membershipId={user?.membershipId as string}
                          itemDefinitions={db.DestinyInventoryItemDefinition}
                          characters={Object.values(profile.characters.data)}
                          classDefinition={db.DestinyClassDefinition}
                          raceDefinition={db.DestinyRaceDefinition}
                          onSelectCharacter={(charId) => {
                            setCurrentCharacter(charId);
                          }}
                          refresh={async () => await refreshProfile()}
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <Loader title="Loading Profile..."/>
            )}
          </>
        ) : (
          <Loader title="Loading Destiny Databases..."/>
        )}
      </div>
      {alerts.length > 0 && (
        <footer className="p-4 bg-gray-800 text-white w-full text-center mt-2 border-t-4 border-red-500 absolute bottom-8 right-0 z-[-1]">
          <ul>
            {alerts.map((alert, index) => (
              <li key={index}>{alert.AlertHtml}</li>
            ))}
          </ul>
        </footer>
      )}
      {process.env.NODE_ENV === "development" && <Switch label="Debug Mode" checked={debugMode} onChange={() => {setDebugMode(!debugMode)}}/>}
    </div>
  );
};

export default AppView;
