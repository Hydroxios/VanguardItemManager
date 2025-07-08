"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type DebugContextType = {
  debugMode: boolean;
  setDebugMode: (value: boolean) => void;
};

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [debugMode, setDebugMode] = useState<boolean>(false);

  return (
    <DebugContext.Provider value={{ debugMode, setDebugMode }}>
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = (): DebugContextType => {
  const context = useContext(DebugContext);
  if (!context) throw new Error("useDebug must be used within a DebugProvider");
  return context;
}; 