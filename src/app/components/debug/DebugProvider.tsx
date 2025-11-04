"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

type DebugContextType = {
  debugMode: boolean;
  handleDebugModeChange: (value: boolean) => void;
};

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [debugMode, setDebugMode] = useState<boolean>(false);

  useEffect(() => {
    const debugMode = localStorage.getItem("debugMode") || false;
    if (debugMode) {
      setDebugMode(debugMode === "true");
    }
  }, []);

  const handleDebugModeChange = (value: boolean) => {
    setDebugMode(value);
    localStorage.setItem("debugMode", value.toString());
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