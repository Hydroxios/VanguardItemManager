"use client";

import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode, useRef } from 'react';
import { AccessToken, InvalidRefreshTokenError, refreshToken, setTokenSource } from '../bungie';

// Renew the access token this long before it expires, so no request leaves with a token about to expire
const EXPIRY_MARGIN = 5 * 60 * 1000;

interface UseAuthResult {
  token: string | null;
  isTokenLoading: boolean;
  isTokenRefreshing: boolean;
}

const AuthContext = createContext<UseAuthResult | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(true);
  const [isTokenRefreshing, setIsTokenRefreshing] = useState<boolean>(false);

  // Also read by the API layer, between renders
  const tokenRef = useRef<AccessToken | null>(null);

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
      tokenRef.current = t;
      setToken(t.value);
      return t.value;
    } catch (error) {
      // Only drop the session when there is no valid refresh token; a network
      // hiccup or a 5xx keeps the cookie so the next attempt can succeed
      if (error instanceof InvalidRefreshTokenError) {
        tokenRef.current = null;
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
    // Every authenticated Bungie call asks for its token here, right before it is sent
    setTokenSource({
      getToken: async () => {
        const current = tokenRef.current;
        if (current && Date.now() < current.expiresAt - EXPIRY_MARGIN) return current.value;
        // When the renewal fails (network...), the current token still works until it really expires
        const renewed = await refreshUserToken();
        return renewed ?? (current && Date.now() < current.expiresAt ? current.value : null);
      },
      renewToken: async (rejectedToken) => {
        // Another request may already have replaced the rejected token
        const current = tokenRef.current;
        if (current && current.value !== rejectedToken) return current.value;
        return refreshUserToken();
      },
    });

    // Nothing is stored client side: restore the session from the refresh cookie on every load
    refreshUserToken().finally(() => setIsTokenLoading(false));

    return () => setTokenSource(undefined);
  }, [refreshUserToken]);

  const value: UseAuthResult = {
    token,
    isTokenLoading,
    isTokenRefreshing,
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
