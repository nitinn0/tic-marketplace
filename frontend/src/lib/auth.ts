export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
};

export type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number | string;
  user: SessionUser;
};

export function getStoredSession(): SessionPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("tic_access_token");
  const refresh = window.localStorage.getItem("tic_refresh_token");
  const rawUser = window.localStorage.getItem("tic_user");

  if (!token || !refresh || !rawUser) {
    return null;
  }

  try {
    return {
      accessToken: token,
      refreshToken: refresh,
      expiresIn: 900,
      user: JSON.parse(rawUser) as SessionUser,
    };
  } catch {
    return null;
  }
}

export function saveSession(payload: SessionPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("tic_access_token", payload.accessToken);
  window.localStorage.setItem("tic_refresh_token", payload.refreshToken);
  window.localStorage.setItem("tic_user", JSON.stringify(payload.user));
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("tic_access_token");
  window.localStorage.removeItem("tic_refresh_token");
  window.localStorage.removeItem("tic_user");
}

export function isAuthenticated() {
  return Boolean(getStoredSession());
}
