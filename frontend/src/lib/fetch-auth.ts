import { refreshAccessToken } from "@/lib/auth-session";
import { getAccessToken } from "@/lib/session-tokens";

/** Fetch avec Bearer + refresh automatique sur 401 / token absent. */
export async function fetchAuthenticated(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();
  if (!token) {
    token = await refreshAccessToken();
  }

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, {
        ...init,
        credentials: "include",
        headers,
      });
    }
  }

  return res;
}

/** Message d'erreur API (JSON) ou statut HTTP. */
export async function readFetchError(res: Response): Promise<string> {
  const fallback = `Erreur ${res.status}`;
  try {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return fallback;
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
}
