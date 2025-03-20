"use client";

import { useEffect, useState } from "react";
import Item from "./Item";
import Currencies from "./Currencies";
import LoadingItem from "./LoadingItem";
import Loadouts from "./Loadouts";
import CharacterStats from "./CharacterStats";
import InventoryItems from "./InventoryItems";
import { transferItem } from "@/lib/bungie";

interface CharacterViewProps {
  db: any;
  token: string;
  characterId: string;
  membershipType: number;
  membershipId: string;
  currencies: any;
  loadoutsColorDefinition: any;
  loadoutIconDefinition: any;
  character: any;
  itemInstances: any;
  itemPerks: any;
  itemStats: any;
  characters: any;
  charactersInventory: any;
  statsDefinition: any;
  perksDefinition: any;
  classDefinition :any
  changeCharacter: () => void;
  refresh: () => Promise<void>;
}

const CharacterView: React.FC<CharacterViewProps> = ({
  db,
  token,
  characterId,
  membershipType,
  membershipId,
  currencies,
  loadoutIconDefinition,
  loadoutsColorDefinition,
  character,
  characters,
  itemInstances,
  itemPerks,
  itemStats,
  statsDefinition,
  perksDefinition,
  classDefinition,
  charactersInventory,
  changeCharacter,
  refresh,
}) => {
  const [primary, setPrimary] = useState<any>();
  const [primaries, setPrimaries] = useState<any[]>([]);
  const [primariesOpen, setPrimariesOpen] = useState<boolean>(false);

  const [energetic, setEnergetic] = useState<any>();
  const [energetics, setEnergetics] = useState<any[]>([]);
  const [energeticsOpen, setEnergeticsOpen] = useState<boolean>(false);

  const [heavy, setHeavy] = useState<any>();
  const [heavies, setHeavies] = useState<any[]>([]);
  const [heaviesOpen, setHeaviesOpen] = useState<boolean>(false);

  const [helmet, setHelmet] = useState<any>();
  const [helmets, setHelmets] = useState<any[]>([]);
  const [helmetsOpen, setHelmetsOpen] = useState<boolean>(false);

  const [arms, setArms] = useState<any>();
  const [armss, setArmss] = useState<any[]>([]);
  const [armssOpen, setArmssOpen] = useState<boolean>(false);

  const [chest, setChest] = useState<any>();
  const [chests, setChests] = useState<any[]>([]);
  const [chestsOpen, setChestsOpen] = useState<boolean>(false);

  const [legs, setLegs] = useState<any>();
  const [legss, setLegss] = useState<any[]>([]);
  const [legsOpen, setLegsOpen] = useState<boolean>(false);

  const [classItem, setClassItem] = useState<any>();
  const [classItems, setClassItems] = useState<any[]>([]);
  const [classItemsOpen, setClassItemsOpen] = useState<boolean>(false);

  const [currenciess, setCurrenciess] = useState<any[]>();

  const [statistics, setStatistics] = useState<any>();

  const [vaultExotic, setVaultExotic] = useState(false);

  const init = async () => {
    const c: any[] = [];
    const glimmers = currencies[0];
    const brightDusts = currencies[2];
    c.push({ item: db[glimmers.itemHash], quantity: glimmers.quantity });
    c.push({ item: db[brightDusts.itemHash], quantity: brightDusts.quantity });
    setCurrenciess(() => c);
    character.equipment?.map((e: any) => {
      const i = db[e.itemHash];

      const ornamentItem = db[e.overrideStyleItemHash];
      if (i.equippingBlock) {
        switch (i.equippingBlock.equipmentSlotTypeHash) {
          case 1498876634:
            setPrimary({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              perks: itemPerks[e.itemInstanceId],
              stats: itemStats[e.itemInstanceId],
              state: e.state,
            });
            break;
          case 2465295065:
            setEnergetic({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              perks: itemPerks[e.itemInstanceId],
              stats: itemStats[e.itemInstanceId],
              state: e.state,
            });
            break;
          case 953998645:
            setHeavy({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              perks: itemPerks[e.itemInstanceId],
              stats: itemStats[e.itemInstanceId],
              state: e.state,
            });
            break;
          case 3448274439:
            setHelmet({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              perks: itemPerks[e.itemInstanceId],
              stats: itemStats[e.itemInstanceId],
              state: e.state,
            });
            break;
          case 3551918588:
            setArms({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              perks: itemPerks[e.itemInstanceId],
              stats: itemStats[e.itemInstanceId],
              state: e.state,
            });
            break;
          case 14239492:
            setChest({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              perks: itemPerks[e.itemInstanceId],
              stats: itemStats[e.itemInstanceId],
              state: e.state,
            });
            break;
          case 20886954:
            setLegs({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              perks: itemPerks[e.itemInstanceId],
              stats: itemStats[e.itemInstanceId],
              state: e.state,
            });
            break;
          case 1585787867:
            setClassItem({
              item: i,
              itemInstance: e,
              ornamentItem: ornamentItem,
              state: e.state,
            });
            break;
        }
      }
    });
    const primes: any[] = [];
    const energs: any[] = [];
    const heavys: any[] = [];

    const helms: any[] = [];
    const armz: any[] = [];
    const chestz: any[] = [];
    const legz: any[] = [];
    const classItemz: any[] = [];

    character.inventory?.map((item: any) => {
      if (item.itemInstanceId && item.location === 1) {
        const i = db[item.itemHash];
        const ornamentItem = db[item.overrideStyleItemHash];
        if (i.equippingBlock) {
          switch (i.equippingBlock.equipmentSlotTypeHash) {
            case 1498876634:
              primes.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
            case 2465295065:
              energs.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
            case 953998645:
              heavys.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
            case 3448274439:
              helms.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
            case 3551918588:
              armz.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
            case 14239492:
              chestz.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
            case 20886954:
              legz.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
            case 1585787867:
              classItemz.push({
                item: i,
                itemInstance: item,
                ornamentItem: ornamentItem,
                perks: itemPerks[item.itemInstanceId],
                stats: itemStats[item.itemInstanceId],
                state: item.state,
              });
              break;
          }
        }
      }
    });
    setPrimaries(() => primes);
    setEnergetics(() => energs);
    setHeavies(() => heavys);

    setHelmets(() => helms);
    setArmss(() => armz);
    setChests(() => chestz);
    setLegss(() => legz);
    setClassItems(() => classItemz);
  };

  useEffect(() => {
    init();

    setStatistics(character.stats);
    const intervalId = setInterval(() => {
      refresh();
    }, 60000);
    setVaultExotic(() => Math.random() < 0.01);

    return () => clearInterval(intervalId);
  }, [character]);

  return (
    <div
      className="mx-auto"
      onDrop={async (event) => {
        event.preventDefault();
        let data = event.dataTransfer.getData("text/plain");
        if (data.startsWith("st:")) {
          data = data.replace("st:", "");
          const args = data.split(":");
          if (args.length > 2) {
            await transferItem(
              token,
              membershipType,
              args[0],
              args[1],
              args[2],
              true
            );
            await transferItem(
              token,
              membershipType,
              args[0],
              args[1],
              characterId,
              false
            );
          } else {
            await transferItem(
              token,
              membershipType as number,
              args[0],
              args[1],
              characterId,
              false
            );
          }
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
    >
      {currenciess && <Currencies currencies={currenciess} />}
      {character && (
        <Loadouts
          loadouts={character.loadouts}
          loadoutIconDefinition={loadoutIconDefinition}
          loadoutsColorDefinition={loadoutsColorDefinition}
          token={token}
          characterId={characterId}
          membershipType={membershipType}
          membershipeId={membershipId}
          refreshChar={async () => await refresh()}
          itemDefinition={db}
          itemInstances={itemInstances}
          character={character}
          charactersInventory={charactersInventory}
        />
      )}
      <div className="flex flex-row gap-10 items-center">
        <div className="flex flex-col gap-5">
          {primary ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setPrimariesOpen(true)}
              onMouseLeave={() => setPrimariesOpen(false)}
            >
              <InventoryItems
                token={token}
                items={primaries}
                open={primariesOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={false}
                onEquip={async (item, itemInstanceId, state, ornamentItem) => {
                  const newPrimaries = primaries.filter((p :any) => p.itemInstance.itemInstanceId !== itemInstanceId)
                  newPrimaries.push(primary)
                  setPrimaries(() => newPrimaries)
                  setPrimary(() => ({
                    item: item,
                    itemInstance: character.inventory?.filter((i :any) => i.itemInstanceId === itemInstanceId)[0],
                    ornamentItem: ornamentItem,
                    perks: itemPerks[itemInstanceId],
                    stats: itemStats[itemInstanceId],
                    state: state
                  }));
                }}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={false}
                itemInstances={itemInstances}
              />
              <Item
                item={primary.item}
                itemInstance={primary.itemInstance}
                ornamentItem={primary.ornamentItem}
                state={primary.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[primary.itemInstance.itemInstanceId]}
                stats={itemStats[primary.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={false}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
          {energetic ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setEnergeticsOpen(true)}
              onMouseLeave={() => setEnergeticsOpen(false)}
            >
              <InventoryItems
                token={token}
                items={energetics}
                open={energeticsOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={false}
                onEquip={async (item, itemInstanceId, state, ornamentItem) => {
                  const newItems = energetics.filter((p :any) => p.itemInstance.itemInstanceId !== itemInstanceId)
                  newItems.push(energetic)
                  setEnergetics(() => newItems)
                  setEnergetic(() => ({
                    item: item,
                    itemInstance: itemInstances[itemInstanceId],
                    ornamentItem: ornamentItem,
                    perks: itemPerks[itemInstanceId],
                    stats: itemStats[itemInstanceId],
                    state: state
                  }));
                }}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={false}
                itemInstances={itemInstances}
              />
              <Item
                item={energetic.item}
                itemInstance={energetic.itemInstance}
                ornamentItem={energetic.ornamentItem}
                state={energetic.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[energetic.itemInstance.itemInstanceId]}
                stats={itemStats[energetic.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={false}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
          {heavy ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setHeaviesOpen(true)}
              onMouseLeave={() => setHeaviesOpen(false)}
            >
              <InventoryItems
                token={token}
                items={heavies}
                open={heaviesOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={false}
                onEquip={async (item, itemInstanceId, state, ornamentItem) => {
                  const newItems = heavies.filter((p :any) => p.itemInstance.itemInstanceId !== itemInstanceId)
                  newItems.push(heavy)
                  setHeavies(() => newItems)
                  setHeavy(() => ({
                    item: item,
                    itemInstance: itemInstances[itemInstanceId],
                    ornamentItem: ornamentItem,
                    perks: itemPerks[itemInstanceId],
                    stats: itemStats[itemInstanceId],
                    state: state
                  }));
                }}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={false}
                itemInstances={itemInstances}
              />
              <Item
                item={heavy.item}
                itemInstance={heavy.itemInstance}
                ornamentItem={heavy.ornamentItem}
                state={heavy.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[heavy.itemInstance.itemInstanceId]}
                stats={itemStats[heavy.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={false}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
        </div>
        <div className="flex flex-col gap-5">
          {helmet ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setHelmetsOpen(true)}
              onMouseLeave={() => setHelmetsOpen(false)}
            >
              <InventoryItems
                token={token}
                items={helmets}
                open={helmetsOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={true}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={true}
                itemInstances={itemInstances}
              />
              <Item
                item={helmet.item}
                itemInstance={helmet.itemInstance}
                ornamentItem={helmet.ornamentItem}
                state={helmet.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[helmet.itemInstance.itemInstanceId]}
                stats={itemStats[helmet.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={true}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
          {arms ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setArmssOpen(true)}
              onMouseLeave={() => setArmssOpen(false)}
            >
              <InventoryItems
                token={token}
                items={armss}
                open={armssOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={true}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={true}
                itemInstances={itemInstances}
              />
              <Item
                item={arms.item}
                itemInstance={arms.itemInstance}
                ornamentItem={arms.ornamentItem}
                state={arms.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[arms.itemInstance.itemInstanceId]}
                stats={itemStats[arms.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={true}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
          {chest ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setChestsOpen(true)}
              onMouseLeave={() => setChestsOpen(false)}
            >
              <InventoryItems
                token={token}
                items={chests}
                open={chestsOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={true}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={true}
                itemInstances={itemInstances}
              />
              <Item
                item={chest.item}
                itemInstance={chest.itemInstance}
                ornamentItem={chest.ornamentItem}
                state={chest.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[chest.itemInstance.itemInstanceId]}
                stats={itemStats[chest.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={true}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
          {legs ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setLegsOpen(true)}
              onMouseLeave={() => setLegsOpen(false)}
            >
              <InventoryItems
                token={token}
                items={legss}
                open={legsOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={true}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={true}
                itemInstances={itemInstances}
              />
              <Item
                item={legs.item}
                itemInstance={legs.itemInstance}
                ornamentItem={legs.ornamentItem}
                state={legs.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[legs.itemInstance.itemInstanceId]}
                stats={itemStats[legs.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={true}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
          {classItem ? (
            <div
              className="flex flex-row gap-1"
              onMouseEnter={() => setClassItemsOpen(true)}
              onMouseLeave={() => setClassItemsOpen(false)}
            >
              <InventoryItems
                token={token}
                items={classItems}
                open={classItemsOpen}
                membershipType={membershipType}
                characterId={characterId}
                refresh={async () => await refresh()}
                right={true}
                characters={characters}
                classDefinition={classDefinition}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armors={true}
                itemInstances={itemInstances}
              />
              <Item
                item={classItem.item}
                itemInstance={classItem.itemInstance}
                ornamentItem={classItem.ornamentItem}
                state={classItem.state}
                characterId={characterId}
                characters={characters}
                classDefinition={classDefinition}
                perks={itemPerks[classItem.itemInstance.itemInstanceId]}
                stats={itemStats[classItem.itemInstance.itemInstanceId]}
                perksDefinition={perksDefinition}
                statsDefinition={statsDefinition}
                armor={true}
                itemInstances={itemInstances}
              />
            </div>
          ) : (
            <LoadingItem />
          )}
        </div>
      </div>
      {statistics && <CharacterStats stats={statistics} />}
      <footer
        className="absolute bottom-0 right-0 w-full flex flex-row items-center justify-between gap-2"
        style={{
          height: "35px",
          borderTop: "2px solid #1a1a1a",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        }}
      >
        <button className="flex flex-row items-center gap-2 ml-5">
          <img src={"intellect.svg"} height={24} width={24} />
          <p className="text-gray-500">VIM v0.1</p>
        </button>
        <button
          className="flex flex-row items-center gap-2"
          onDrop={async (event) => {
            event.preventDefault();
            const infos = event.dataTransfer.getData("text/plain").split(":");
            const hash = infos[0];
            const itemInstanceId = infos[1];
            const slotHash = infos[2];
            await transferItem(
              token,
              membershipType,
              hash,
              itemInstanceId,
              characterId,
              true
            );
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
        >
          <img
            src={vaultExotic ? "./vault_exotic.svg" : "./vault.svg"}
            height={16}
            width={16}
          />
          Open Vault
        </button>
        <button
          className="flex flex-row items-center gap-2 mr-5"
          onClick={() => changeCharacter()}
        >
          <img src={"./ghost.svg"} height={16} width={16} />
          Change Character
        </button>
      </footer>
    </div>
  );
};

export default CharacterView;
