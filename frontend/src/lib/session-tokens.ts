/**
 * Access token en memoire uniquement (court). Refresh = cookie HttpOnly cote API.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

/** Nettoie d'anciennes sessions persistees (migration). */
export function purgeLegacyTokenStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("auth-storage");
}
