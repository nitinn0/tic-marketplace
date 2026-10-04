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

function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("tic_access_token");
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

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // Keep the raw response text when it is not JSON.
    }
    throw new Error(message);
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
