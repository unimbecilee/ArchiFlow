export type RealtimeMode = "ws" | "sse";

/** ws = WebSocket push ; sse = legacy SSE poll stream */
export function getRealtimeMode(): RealtimeMode {
  const raw = (
    process.env.NEXT_PUBLIC_REALTIME_MODE ?? "ws"
  ).toLowerCase();
  return raw === "sse" ? "sse" : "ws";
}

function httpToWsBase(url: string): string {
  return url.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"));
}

/** URL WebSocket notifications (token en query). */
export function getNotificationWebSocketUrl(token: string): string {
  const path = `/api/ws?token=${encodeURIComponent(token)}`;
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "");
  if (explicit) {
    return `${httpToWsBase(explicit)}${path}`;
  }
  const apiPublic = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (apiPublic) {
    return `${httpToWsBase(apiPublic)}${path}`;
  }
  if (typeof window === "undefined") {
    return path;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}
