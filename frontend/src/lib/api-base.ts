/**
 * Navigateur : URLs relatives /api/* (rewrite Next.js → backend, cookies same-site).
 * SSR : URL absolue vers l'API Go.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.INTERNAL_API_URL ||
    "http://localhost:5000"
  );
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${p}`;
}
