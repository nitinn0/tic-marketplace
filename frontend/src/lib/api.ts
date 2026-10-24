declare global {
  interface Window {
    __TIC_API_URL__?: string;
  }
}

const buildTimeApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

function isLoopbackApiUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function isPrivateOrLocalHostname(hostname: string) {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return true;
  if (hostname.endsWith(".local")) return true;
  // LAN / private ranges — treat like local so Next on a phone/LAN IP can reach Nest.
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
}

function isBrowserOnRemoteHost() {
  if (typeof window === "undefined") {
    return false;
  }
  return !isPrivateOrLocalHostname(window.location.hostname);
}

function resolvedConfiguredApiUrl() {
  if (typeof window !== "undefined") {
    const runtime = (window.__TIC_API_URL__ ?? "").trim();
    if (runtime) return runtime;
  }
  return buildTimeApiUrl;
}

/**
 * Authenticated marketplace APIs use Nest. Deployed frontends must set
 * NEXT_PUBLIC_API_URL (or API_URL) to the Nest base (e.g. https://tic-backend.onrender.com/api/v1).
 * The Next /api/v1 proxy is not a full Nest substitute.
 */
export function getApiBaseUrl() {
  const configuredApiUrl = resolvedConfiguredApiUrl();

  if (configuredApiUrl && !isLoopbackApiUrl(configuredApiUrl)) {
    return configuredApiUrl;
  }

  if (isBrowserOnRemoteHost()) {
    return "";
  }

  return configuredApiUrl || "http://localhost:4011/api/v1";
}

/** True only when the client is deliberately pointed at a same-origin path API (legacy). */
export function usesSupabaseAuth() {
  return getApiBaseUrl().startsWith("/");
}

export function isRemoteApiConfigured() {
  const url = getApiBaseUrl();
  return Boolean(url) && !isLoopbackApiUrl(url);
}

const ACTIVE_ORGANIZATION_KEY = "tic_active_organization_id";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("tic_access_token");
}

function getStoredRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("tic_refresh_token");
}

export function getActiveOrganizationId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
}

/** The backend re-validates this id against the user's membership on every request. */
export function setActiveOrganizationId(organizationId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (organizationId) {
    window.localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
  } else {
    window.localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (usesSupabaseAuth()) return false;
  const refreshToken = getStoredRefreshToken();
  const apiBaseUrl = getApiBaseUrl();
  if (!refreshToken || !apiBaseUrl) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;
        const data = (await response.json()) as {
          accessToken: string;
          refreshToken: string;
          user?: unknown;
        };
        window.localStorage.setItem("tic_access_token", data.accessToken);
        window.localStorage.setItem("tic_refresh_token", data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(endpoint: string, options: RequestInit = {}, didRefresh = false): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error(
      "API is not configured. Set NEXT_PUBLIC_API_URL to your Nest API base (…/api/v1) for this deployment.",
    );
  }

  const url = `${apiBaseUrl}${endpoint}`;
  const token = getStoredAuthToken();
  const { headers: customHeaders, ...init } = options;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const activeOrganizationId = getActiveOrganizationId();
  if (activeOrganizationId && !headers.has("X-Organization-Id")) {
    headers.set("X-Organization-Id", activeOrganizationId);
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status === 401 && !didRefresh && !endpoint.startsWith("/auth/")) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return request<T>(endpoint, options, true);
    }
    window.localStorage.removeItem("tic_access_token");
    window.localStorage.removeItem("tic_refresh_token");
    window.localStorage.removeItem("tic_user");
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.assign(`/login?next=${next}`);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        message = parsed.message.join(", ");
      } else if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // Keep the raw response text when it is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function logoutRemote() {
  const refreshToken = getStoredRefreshToken();
  const apiBaseUrl = getApiBaseUrl();
  if (!refreshToken || !apiBaseUrl || usesSupabaseAuth()) return;
  try {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Local clear still happens.
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { method: "DELETE", ...options }),
};

export default api;
