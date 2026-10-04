const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

function isLoopbackApiUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function isBrowserOnRemoteHost() {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname } = window.location;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

export function getApiBaseUrl() {
  if (configuredApiUrl && !isLoopbackApiUrl(configuredApiUrl)) {
    return configuredApiUrl;
  }

  if (isBrowserOnRemoteHost()) {
    return "/api/v1";
  }

  return configuredApiUrl || "http://localhost:4011/api/v1";
}

// The in-app Next.js API route validates Supabase tokens; the Nest backend only accepts its own JWTs.
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

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("API is not configured for this environment.");
  }

  const url = `${apiBaseUrl}${endpoint}`;
  const token = getStoredAuthToken();
  const { headers: customHeaders, ...init } = options;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const activeOrganizationId = getActiveOrganizationId();
  if (activeOrganizationId && !usesSupabaseAuth() && !headers.has("X-Organization-Id")) {
    headers.set("X-Organization-Id", activeOrganizationId);
  }

  const response = await fetch(url, { ...init, headers });

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

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};

export default api;
