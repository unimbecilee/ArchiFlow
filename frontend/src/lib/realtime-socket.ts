"use client";

import { refreshAccessToken } from "@/lib/auth-session";
import { getNotificationWebSocketUrl, getRealtimeMode } from "@/lib/realtime-config";
import { fetchWsTicket } from "@/services/ws-ticket.service";
import { getAccessToken } from "@/lib/session-tokens";

export type RealtimeEnvelope = {
  v?: number;
  type?: string;
  ts?: number;
  payload?: Record<string, unknown>;
};

type Listener = (env: RealtimeEnvelope) => void;

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

let listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let cancelled = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let delay = BASE_DELAY_MS;
let connectGeneration = 0;

function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (cancelled || getRealtimeMode() !== "ws") return;
  clearReconnect();
  reconnectTimer = setTimeout(() => {
    delay = Math.min(delay * 2, MAX_DELAY_MS);
    void connect();
  }, delay);
}

function dispatch(raw: string) {
  try {
    const env = JSON.parse(raw) as RealtimeEnvelope;
    Array.from(listeners).forEach((fn) => fn(env));
  } catch {
    /* ignore */
  }
}

async function connect() {
  if (cancelled || getRealtimeMode() !== "ws") return;
  const gen = ++connectGeneration;

  let token = getAccessToken();
  if (!token) {
    token = await refreshAccessToken();
  }
  if (!token || cancelled || gen !== connectGeneration) {
    scheduleReconnect();
    return;
  }

  let ticket: string;
  try {
    ticket = await fetchWsTicket();
  } catch {
    scheduleReconnect();
    return;
  }
  if (cancelled || gen !== connectGeneration) {
    scheduleReconnect();
    return;
  }

  try {
    socket = new WebSocket(getNotificationWebSocketUrl(ticket));
  } catch {
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    delay = BASE_DELAY_MS;
  };

  socket.onmessage = (ev) => {
    if (typeof ev.data === "string") {
      dispatch(ev.data);
    }
  };

  socket.onclose = () => {
    socket = null;
    if (!cancelled) scheduleReconnect();
  };

  socket.onerror = () => {
    socket?.close();
  };
}

function ensureStarted() {
  if (typeof window === "undefined" || getRealtimeMode() !== "ws") return;
  if (cancelled) {
    cancelled = false;
  }
  if (!socket && !reconnectTimer) {
    void connect();
  }
}

function teardownIfIdle() {
  if (listeners.size > 0) return;
  cancelled = true;
  connectGeneration++;
  clearReconnect();
  socket?.close();
  socket = null;
}

/** Abonnement partagé sur une seule connexion WebSocket. */
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  ensureStarted();
  return () => {
    listeners.delete(listener);
    teardownIfIdle();
  };
}
