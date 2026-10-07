"use client";

import React, { createContext, useContext, ReactNode, useSyncExternalStore } from "react";

type DebugContextType = {
  debugMode: boolean;
  handleDebugModeChange: (value: boolean) => void;
};

const DebugContext = createContext<DebugContextType | undefined>(undefined);

// The setting lives in localStorage; these listeners let the page hear its own changes
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getDebugMode = () => localStorage.getItem("debugMode") === "true";
// Off while rendering on the server, so hydration matches
const getServerDebugMode = () => false;

export const DebugProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const debugMode = useSyncExternalStore(subscribe, getDebugMode, getServerDebugMode);

  const handleDebugModeChange = (value: boolean) => {
    localStorage.setItem("debugMode", value.toString());
    listeners.forEach((listener) => listener());
  };

  return (
    <DebugContext.Provider value={{ debugMode, handleDebugModeChange }}>
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = (): DebugContextType => {
  const context = useContext(DebugContext);
  if (!context) throw new Error("useDebug must be used within a DebugProvider");
  return context;
};
