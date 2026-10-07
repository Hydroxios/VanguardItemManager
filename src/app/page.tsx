"use client";

import Image from "next/image";
import AppView from "./components/AppView";
import useAuth from "@/lib/hooks/useAuth";
import { DefinitionsProvider } from "@/lib/hooks/useDefinitions";
import { ItemTooltipProvider, useItemTooltip } from "@/lib/hooks/useItemTooltip";
import GlobalItemTooltip from "./components/GlobalItemTooltip";
import { ProfileProvider } from "@/lib/hooks/useProfile";
import ErrorBoundary from "./components/ErrorBoundary";

// A crashing tooltip only hides itself and comes back on the next hovered item
const SafeGlobalItemTooltip = () => {
  const { tooltipState } = useItemTooltip();
  return (
    <ErrorBoundary fallback={null} resetKeys={[tooltipState.item, tooltipState.itemInstanceId]}>
      <GlobalItemTooltip />
    </ErrorBoundary>
  );
};

export default function Home() {
  const { token, isTokenLoading } = useAuth();

  // Avoid flashing the login screen while the session is restored from the cookie
  if (isTokenLoading) return null;

  return (
    <div className="flex items-center justify-center text-center min-h-screen p-8 ">
      {!token ? (
        <div className="flex flex-col justify-center items-center gap-5">
          <Image src="./vanguard.svg" height={256} width={256} alt="Vanguard Item Manager logo" loading="eager" />
          <h1 className="text-3xl sm:text-4xl">Vanguard Item Manager</h1>
          <p>A Custom Destiny Item Manager !</p>
          <div>
            <a
              className="w-[350px] rounded-full transition-colors flex items-center justify-center bg-[#ededed] text-black gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
              href={
                "https://www.bungie.net/en/OAuth/Authorize?client_id=" +
                (process.env.NODE_ENV === "production" ? "46066" : "45124") +
                "&response_type=code"
              }
              rel="noopener noreferrer"
            >
              <Image
                className="dark:invert"
                src="/bungie.svg"
                alt="Bungie logo"
                width={20}
                height={20}
              />
              Login with Bungie
            </a>
          </div>
        </div>
      ) : (
        <ErrorBoundary>
          <DefinitionsProvider>
            <ProfileProvider>
              <ItemTooltipProvider>
                <AppView />
                <SafeGlobalItemTooltip />
              </ItemTooltipProvider>
            </ProfileProvider>
          </DefinitionsProvider>
        </ErrorBoundary>
      )}
    </div>
  );
}
