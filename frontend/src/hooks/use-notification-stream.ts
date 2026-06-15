"use client";

import { useEffect } from "react";
import type { Notification } from "@/types/collaboration";
import { apiUrl } from "@/lib/api-base";
import { refreshAccessToken } from "@/lib/auth-session";
import { getRealtimeMode } from "@/lib/realtime-config";
import { getAccessToken } from "@/lib/session-tokens";

export type NotificationStreamPayload = {
  unread: number;
  unread_shares?: number;
  items?: Notification[];
};

export function useNotificationStream(onUpdate: (payload: NotificationStreamPayload) => void) {
  useEffect(() => {
    if (getRealtimeMode() !== "sse") {
      return;
    }
    const controller = new AbortController();
    let lastId = 0;

    const run = async () => {
      while (!controller.signal.aborted) {
        let token = getAccessToken();
        if (!token) {
          token = await refreshAccessToken();
        }
        if (!token) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        try {
          const res = await fetch(
            apiUrl(`/api/notifications/stream?last_id=${lastId}`),
            {
              headers: { Authorization: `Bearer ${token}` },
              credentials: "include",
              signal: controller.signal,
            }
          );
          if (res.status === 401) {
            const renewed = await refreshAccessToken();
            if (!renewed) {
              await new Promise((r) => setTimeout(r, 3000));
            }
            continue;
          }
          if (!res.ok || !res.body) break;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";
            for (const block of parts) {
              const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
              if (!dataLine) continue;
              try {
                const payload = JSON.parse(dataLine.slice(6)) as NotificationStreamPayload;
                onUpdate(payload);
                const items = payload.items;
                if (items?.length) {
                  const maxId = Math.max(...items.map((i) => i.id));
                  if (maxId > lastId) lastId = maxId;
                }
              } catch {
                /* ignore parse errors */
              }
            }
          }
        } catch {
          if (controller.signal.aborted) return;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    };

    void run();
    return () => controller.abort();
  }, [onUpdate]);
}
