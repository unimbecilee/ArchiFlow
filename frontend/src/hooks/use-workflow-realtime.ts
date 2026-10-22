"use client";

import { useEffect } from "react";
import { subscribeRealtime } from "@/lib/realtime-socket";
import { getRealtimeMode } from "@/lib/realtime-config";

export type WorkflowRealtimePayload = {
  workflows_pending?: number;
  workflows_in_progress?: number;
};

export function useWorkflowRealtime(
  onUpdate: (payload: WorkflowRealtimePayload) => void,
) {
  useEffect(() => {
    if (getRealtimeMode() !== "ws") {
      return;
    }
    return subscribeRealtime((env) => {
      if (env.type !== "workflows" || !env.payload) return;
      onUpdate(env.payload as WorkflowRealtimePayload);
    });
  }, [onUpdate]);
}
