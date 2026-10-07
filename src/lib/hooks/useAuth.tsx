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

  // The access token only lives in memory; the refresh token is an httpOnly cookie sent to /api/token
  const doRefresh = async (): Promise<string | null> => {
    // Sessions from older versions kept the refresh token in localStorage: hand it over once so the
    // route moves it into the cookie, then wipe it
    const legacyRefreshToken = localStorage.getItem("rtoken") ?? undefined;
    localStorage.removeItem("token");
    localStorage.removeItem("rtoken");
    localStorage.removeItem("lastUpdate");

    setIsTokenRefreshing(true);
    try {
      const t = await refreshToken(legacyRefreshToken);
      setToken(t);
      setLastUpdate(Date.now())
      return t;
    } catch (error) {
      // Only drop the session when there is no valid refresh token; a network
      // hiccup or a 5xx keeps the cookie so the next attempt can succeed
      if (error instanceof InvalidRefreshTokenError) {
        setToken(null);
      } else {
        console.error("Failed to refresh token:", error);
      }
      return null;
    } finally {
      setIsTokenRefreshing(false);
    }
  };

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

  useEffect(() => {
    // Nothing is stored client side: restore the session from the refresh cookie on every load
    refreshUserToken().finally(() => setIsTokenLoading(false));
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