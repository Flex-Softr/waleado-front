"use client";

import * as React from "react";
import type { AuthUser, AuthWorkspace, AuthSessionPayload } from "@/types/auth";
import {
  getAccessToken,
  isAccessTokenExpired,
  refreshAccessToken,
  setAccessToken,
} from "@/lib/api";
import {
  clearAuthSessionMarker,
  hasAuthSessionMarker,
  markAuthSessionActive,
} from "@/lib/auth-session";
import {
  loginRequest,
  logoutRequest,
  registerRequest,
} from "@/lib/auth-api";
import { logoutAllSessions } from "@/features/profile/lib/profile-api";

type AuthContextValue = {
  user: AuthUser | null;
  workspace: AuthWorkspace | null;
  /** True until first refresh/bootstrap attempt finishes */
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthSessionPayload>;
  register: (input: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<AuthSessionPayload>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  updateWorkspace: (workspace: AuthWorkspace) => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [workspace, setWorkspace] = React.useState<AuthWorkspace | null>(null);
  const [isBootstrapping, setIsBootstrapping] = React.useState(true);

  const logout = React.useCallback(async () => {
    await logoutRequest();
    clearAuthSessionMarker();
    setAccessToken(null);
    setUser(null);
    setWorkspace(null);
  }, []);

  const logoutAll = React.useCallback(async () => {
    try {
      await logoutAllSessions();
    } catch {
      /* ignore */
    }
    clearAuthSessionMarker();
    setAccessToken(null);
    setUser(null);
    setWorkspace(null);
  }, []);

  const updateUser = React.useCallback((updated: AuthUser) => {
    setUser(updated);
  }, []);

  const updateWorkspace = React.useCallback((updated: AuthWorkspace) => {
    setWorkspace(updated);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!hasAuthSessionMarker()) {
          setUser(null);
          setWorkspace(null);
          return;
        }

        const data = await refreshAccessToken();
        if (cancelled) return;
        if (data) {
          markAuthSessionActive();
          setUser(data.user);
          setWorkspace(data.workspace);
        } else {
          clearAuthSessionMarker();
          setUser(null);
          setWorkspace(null);
        }
      } catch {
        if (!cancelled) {
          clearAuthSessionMarker();
          setUser(null);
          setWorkspace(null);
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (isBootstrapping || !user) return;

    const checkTokenExpiry = async () => {
      const token = getAccessToken();
      if (!token || isAccessTokenExpired(token)) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          void logout();
        } else {
          setUser(refreshed.user);
          setWorkspace(refreshed.workspace);
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void checkTokenExpiry();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [isBootstrapping, user, logout]);

  const login = React.useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    markAuthSessionActive();
    setUser(data.user);
    setWorkspace(data.workspace);
    return data;
  }, []);

  const register = React.useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const data = await registerRequest(input);
      markAuthSessionActive();
      setUser(data.user);
      setWorkspace(data.workspace);
      return data;
    },
    []
  );

  const value = React.useMemo(
    () => ({
      user,
      workspace,
      isBootstrapping,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      logoutAll,
      updateUser,
      updateWorkspace,
    }),
    [
      user,
      workspace,
      isBootstrapping,
      login,
      register,
      logout,
      logoutAll,
      updateUser,
      updateWorkspace,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
