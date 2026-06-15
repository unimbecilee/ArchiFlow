"use client";

import { useEffect, useRef } from "react";
import type { NotificationStreamPayload } from "@/hooks/use-notification-stream";
import { getRealtimeMode } from "@/lib/realtime-config";
import { subscribeRealtime } from "@/lib/realtime-socket";

export function useNotificationWebSocket(onUpdate: (payload: NotificationStreamPayload) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (getRealtimeMode() !== "ws") {
      return;
    }
    return subscribeRealtime((env) => {
      if (env.type !== "notifications" || !env.payload) return;
      onUpdateRef.current(env.payload as NotificationStreamPayload);
    });
  }, []);
}
