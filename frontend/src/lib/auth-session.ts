import axios from "axios";
import { apiUrl } from "@/lib/api-base";
import { setAccessToken, clearAccessToken } from "@/lib/session-tokens";

/** Single in-flight refresh — shared by ApiClient, auth-store, WS, SSE. */
let refreshPromise: Promise<string | null> | null = null;

async function doRefreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(apiUrl("/api/auth/refresh"), {}, { withCredentials: true });
    const token = res.data?.data?.token?.access_token as string | undefined;
    if (!token) {
      clearAccessToken();
      return null;
    }
    setAccessToken(token);
    return token;
  } catch {
    clearAccessToken();
    return null;
  }
}

/** Echange le cookie refresh HttpOnly contre un nouvel access token (mutex global). */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Efface le cookie refresh (endpoint public). */
export async function clearAuthSession(): Promise<void> {
  clearAccessToken();
  try {
    await axios.post(apiUrl("/api/auth/logout"), {}, { withCredentials: true });
  } catch {
    // ignore
  }
}
