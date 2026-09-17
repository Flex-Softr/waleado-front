import type { AuthSessionPayload, AuthUser, AuthWorkspace } from "@/types/auth";

const AUTH_SESSION_KEY = "waleado_auth_session";
const AUTH_LEGACY_KEY = "fw_auth_session";
const AUTH_TOKEN_KEY = "waleado_access_token";
const AUTH_DATA_KEY = "waleado_auth_data";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function markAuthSessionActive(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, "1");
  } catch {}
}

export function clearAuthSessionMarker(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    window.localStorage.removeItem(AUTH_LEGACY_KEY);
  } catch {}
}

export function hasAuthSessionMarker(): boolean {
  if (!canUseStorage()) return false;
  try {
    return (
      window.localStorage.getItem(AUTH_SESSION_KEY) === "1" ||
      window.localStorage.getItem(AUTH_LEGACY_KEY) === "1" ||
      Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY))
    );
  } catch {
    return false;
  }
}

export function saveAuthSession(payload: AuthSessionPayload): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, "1");
    if (payload.accessToken) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, payload.accessToken);
    }
    const data = {
      user: payload.user,
      workspace: payload.workspace,
    };
    window.localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(data));
  } catch {}
}

export function getStoredAccessToken(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredAuthSession(): {
  user: AuthUser;
  workspace: AuthWorkspace;
  accessToken: string;
} | null {
  if (!canUseStorage()) return null;
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const raw = window.localStorage.getItem(AUTH_DATA_KEY);
    if (!token || !raw) return null;
    const parsed = JSON.parse(raw) as {
      user: AuthUser;
      workspace: AuthWorkspace;
    };
    if (!parsed.user || !parsed.workspace) return null;
    return {
      user: parsed.user,
      workspace: parsed.workspace,
      accessToken: token,
    };
  } catch {
    return null;
  }
}

export function updateStoredUser(user: AuthUser): void {
  if (!canUseStorage()) return;
  try {
    const raw = window.localStorage.getItem(AUTH_DATA_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      user: AuthUser;
      workspace: AuthWorkspace;
    };
    parsed.user = user;
    window.localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(parsed));
  } catch {}
}

export function updateStoredWorkspace(workspace: AuthWorkspace): void {
  if (!canUseStorage()) return;
  try {
    const raw = window.localStorage.getItem(AUTH_DATA_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      user: AuthUser;
      workspace: AuthWorkspace;
    };
    parsed.workspace = workspace;
    window.localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(parsed));
  } catch {}
}

export function clearAuthSession(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    window.localStorage.removeItem(AUTH_LEGACY_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_DATA_KEY);
  } catch {}
}
