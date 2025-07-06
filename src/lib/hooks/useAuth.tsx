"use client";

import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { refreshToken } from '../bungie';

interface UseAuthResult {
  token: string | null;
  isTokenLoading: boolean;
  isTokenRefreshing: boolean;
  refreshUserToken: () => Promise<void>;
}

const AuthContext = createContext<UseAuthResult | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(true);
  const [isTokenRefreshing, setIsTokenRefreshing] = useState<boolean>(false);

  const refreshUserToken = useCallback(async () => {
    const refreshTokenValue = localStorage.getItem("rtoken");
    if (!refreshTokenValue) return;

    setIsTokenRefreshing(true);
    try {
      await refreshToken(refreshTokenValue);
      setToken(localStorage.getItem("token"));
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // If refresh fails, clear stored tokens to prompt re-login
      localStorage.removeItem("token");
      localStorage.removeItem("rtoken");
      localStorage.removeItem("lastUpdate");
      setToken(null);
    } finally {
      setIsTokenRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Get token from local storage on mount
    const storedToken = localStorage.getItem("token");
    // Check if token needs refreshing
    if (localStorage.getItem("lastUpdate")) {
      const now = Date.now();
      const lastUpdate = new Date(
        Number(localStorage.getItem("lastUpdate"))
      ).getTime();
      
      if (now - lastUpdate > 3600 * 1000) {
        // Token is older than 1 hour, refresh it
        refreshUserToken();
      } else {
        // Token is still valid
        setToken(storedToken);
      }
    } else {
      // No lastUpdate timestamp, just set the token as is
      setToken(storedToken);
    }
    
    setIsTokenLoading(false);
  }, [refreshUserToken]);

  const value: UseAuthResult = {
    token,
    isTokenLoading,
    isTokenRefreshing,
    refreshUserToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): UseAuthResult => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth; 