"use client";

import Image from "next/image";
import AppView from "./components/AppView";
import useAuth from "@/lib/hooks/useAuth";
import { DefinitionsProvider } from "@/lib/hooks/useDefinitions";
import { ItemTooltipProvider, useItemTooltip } from "@/lib/hooks/useItemTooltip";
import GlobalItemTooltip from "./components/GlobalItemTooltip";
import { ProfileProvider } from "@/lib/hooks/useProfile";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginButton from "./components/LoginButton";

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
  const { token, isTokenLoading, sessionError } = useAuth();

  // Avoid flashing the login screen while the session is restored from the cookie
  if (isTokenLoading) return null;

  return (
    <div className="flex items-center justify-center text-center min-h-screen p-8 ">
      {!token ? (
        <div className="flex flex-col justify-center items-center gap-5">
          <Image src="./vanguard.svg" height={256} width={256} alt="Vanguard Item Manager logo" loading="eager" />
          <h1 className="text-3xl sm:text-4xl">Vanguard Item Manager</h1>
          <p>A Custom Destiny Item Manager !</p>
          {/* The session may still be valid: say why it couldn't be restored instead of just asking to log in */}
          {sessionError && (
            <div className="flex flex-col items-center gap-2">
              <p className="max-w-md text-red-400">{sessionError}</p>
              <button
                className="px-4 py-1 bg-gray-300/10 hover:bg-gray-300/20 transition-all duration-300"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}
          <div>
            <LoginButton />
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
