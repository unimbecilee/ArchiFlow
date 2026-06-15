#!/usr/bin/env node
/**
 * Test WebSocket notifications (Phase 1/2).
 * Usage: node scripts/test-realtime-ws.mjs [API_BASE]
 * Default API_BASE=http://localhost:5010
 */

const API = (process.argv[2] || "http://localhost:5010").replace(/\/$/, "");
const WS_BASE = API.replace(/^http/, "ws");
const EMAIL = process.env.TEST_EMAIL || "admin@archiflow.local";
const PASSWORD = process.env.TEST_PASSWORD || "Admin1234!";

async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`login ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  const token =
    body?.data?.token?.access_token ??
    body?.data?.access_token ??
    body?.access_token;
  if (!token) throw new Error("no access_token in login response");
  return token;
}

function waitWs(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const t = setTimeout(() => {
      ws.close();
      reject(new Error("WS timeout"));
    }, timeoutMs);
    ws.addEventListener("open", () => {
      clearTimeout(t);
      resolve(ws);
    });
    ws.addEventListener("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function main() {
  console.log("API:", API);
  const token = await login();
  console.log("login ok");

  const wsUrl = `${WS_BASE}/api/ws?token=${encodeURIComponent(token)}`;
  const ws = await waitWs(wsUrl);
  console.log("WS connected");

  const gotMessage = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("no WS message in 20s")), 20000);
    ws.addEventListener("message", (ev) => {
      const text = typeof ev.data === "string" ? ev.data : String(ev.data);
      console.log("WS message:", text.slice(0, 500));
      try {
        const env = JSON.parse(text);
        if (env.type === "notifications" || env.type === "workflows") {
          clearTimeout(t);
          resolve(env);
        }
      } catch {
        /* ignore */
      }
    });
  });

  const markRes = await fetch(`${API}/api/notifications/read-all`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("mark-all-read:", markRes.status);

  const env = await gotMessage;
  console.log("PASS event type:", env.type);
  ws.close();
}

main().catch((e) => {
  console.error("FAIL:", e.message || e);
  process.exit(1);
});
