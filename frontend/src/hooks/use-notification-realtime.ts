"use client";

import { getRealtimeMode } from "@/lib/realtime-config";
import {
  useNotificationStream,
  type NotificationStreamPayload,
} from "@/hooks/use-notification-stream";
import { useNotificationWebSocket } from "@/hooks/use-notification-ws";

/** Notifications temps réel : WebSocket (defaut) ou SSE legacy. */
export function useNotificationRealtime(
  onUpdate: (payload: NotificationStreamPayload) => void,
) {
  useNotificationWebSocket(onUpdate);
  useNotificationStream(onUpdate);
}
