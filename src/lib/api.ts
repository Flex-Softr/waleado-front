import type { AuthSessionPayload } from "@/types/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import { hasAuthSessionMarker } from "@/lib/auth-session";

let accessToken: string | null = null;
let refreshPromise: Promise<AuthSessionPayload | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function isAccessTokenExpired(token: string, nowMs = Date.now()): boolean {
  const parts = token.split(".");
  if (parts.length < 2) return true;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(normalized)) as { exp?: unknown };
    if (typeof payload.exp !== "number") return true;

    return payload.exp * 1000 <= nowMs;
  } catch {
    return true;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; details?: Record<string, string[] | string> };
    };
    let msg = body.error?.message ?? res.statusText;
    if (body.error?.details && typeof body.error.details === "object") {
      const detailEntries = Object.entries(body.error.details);
      if (detailEntries.length > 0) {
        const detailsStr = detailEntries
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("; ");
        msg = `${msg} (${detailsStr})`;
      }
    }
    const code = body.error?.code;
    return new ApiError(res.status, msg, code);
  } catch {
    return new ApiError(res.status, res.statusText);
  }
}

export async function refreshAccessToken(): Promise<AuthSessionPayload | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const data = (await res.json()) as AuthSessionPayload;
      accessToken = data.accessToken;
      return data;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  retried = false
): Promise<Response> {
  if (
    !accessToken &&
    hasAuthSessionMarker() &&
    !path.startsWith("/v1/auth/refresh") &&
    !path.startsWith("/v1/auth/login") &&
    !path.startsWith("/v1/auth/register")
  ) {
    await refreshAccessToken();
  }

  const url = `${getApiBaseUrl()}${path}`;
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: init.cache ?? "no-store",
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach the API. Start the Express server (e.g. cd server && npm run dev) and check NEXT_PUBLIC_API_URL.",
      "NETWORK_ERROR"
    );
  }

  if (
    res.status === 401 &&
    !retried &&
    !path.startsWith("/v1/auth/refresh") &&
    !path.startsWith("/v1/auth/login") &&
    !path.startsWith("/v1/auth/register")
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, init, true);
    }
  }

  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** POST multipart form (do not set Content-Type; boundary is set automatically). */
export async function apiFormJson<T>(path: string, formData: FormData): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return res.json() as Promise<T>;
}
