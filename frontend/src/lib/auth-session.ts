import axios from "axios";
import { apiUrl } from "@/lib/api-base";
import { setAccessToken, clearAccessToken } from "@/lib/session-tokens";

/** Echange le cookie refresh HttpOnly contre un nouvel access token. */
export async function refreshAccessToken(): Promise<string | null> {
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

/** Efface le cookie refresh (endpoint public). */
export async function clearAuthSession(): Promise<void> {
  clearAccessToken();
  try {
    await axios.post(apiUrl("/api/auth/logout"), {}, { withCredentials: true });
  } catch {
    // ignore
  }
}
