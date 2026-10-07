"use client";

import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode, useRef } from 'react';
import { InvalidRefreshTokenError, refreshToken } from '../bungie';

interface UseAuthResult {
  token: string | null;
  lastUpdate: number
  isTokenLoading: boolean;
  isTokenRefreshing: boolean;
  refreshUserToken: () => Promise<string | null>;
}

const AuthContext = createContext<UseAuthResult | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(true);
  const [isTokenRefreshing, setIsTokenRefreshing] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState(0)

  // Shared in-flight refresh so concurrent callers don't race with the same refresh token
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const refreshUserToken = useCallback((): Promise<string | null> => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = doRefresh().finally(() => {
        refreshPromiseRef.current = null;
      });
    }
    return refreshPromiseRef.current;
  }, []);

  const doRefresh = async (): Promise<string | null> => {
    const refreshTokenValue = localStorage.getItem("rtoken");
    if (!refreshTokenValue) return null;

    setIsTokenRefreshing(true);
    try {
      const t = await refreshToken(refreshTokenValue);
      setToken(localStorage.getItem("token"));
      setLastUpdate(Date.now())
      return t;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Only drop the session when Bungie rejected the refresh token; a network
      // hiccup or a 5xx keeps the stored tokens so the next attempt can succeed
      if (error instanceof InvalidRefreshTokenError) {
        localStorage.removeItem("token");
        localStorage.removeItem("rtoken");
        localStorage.removeItem("lastUpdate");
        setToken(null);
      }
      return null;
    } finally {
      setIsTokenRefreshing(false);
    }
  };

  useEffect(() => {
    // Get token from local storage on mount
    const storedToken = localStorage.getItem("token");
    // Check if token needs refreshing
    if (localStorage.getItem("lastUpdate")) {
      const now = Date.now();
      const lu = new Date(
        Number(localStorage.getItem("lastUpdate"))
      ).getTime();

      if (now - lu > 3600 * 1000) {
        // Token is older than 1 hour, refresh it
        refreshUserToken();
      } else {
        // Token is still valid
        setLastUpdate(lu)
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
    lastUpdate,
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