"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getRealtimeMode } from "@/lib/realtime-config";
import { subscribeRealtime } from "@/lib/realtime-socket";

/** Toast discret quand le compteur d'approbations en attente augmente (WS workflows). */
export function useWorkflowApprovalToasts(enabled: boolean) {
  const router = useRouter();
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || getRealtimeMode() !== "ws") return;

    return subscribeRealtime((env) => {
      if (env.type !== "workflows" || !env.payload) return;
      const pending = env.payload.workflows_pending;
      if (typeof pending !== "number") return;

      const prev = pendingRef.current;
      pendingRef.current = pending;
      if (prev === null || pending <= prev) return;

      const delta = pending - prev;
      toast("Approbation en attente", {
        description:
          delta === 1
            ? "Une validation vous a ete assignee."
            : `${delta} validations vous ont ete assignees.`,
        action: {
          label: "Voir la file",
          onClick: () => router.push("/workflows/approbations"),
        },
      });
    });
  }, [enabled, router]);
}

export function userCanApproveWorkflows(
  user: {
    role?: string;
    capabilities?: { approve_workflows?: boolean };
  } | null,
): boolean {
  if (!user) return false;
  if (user.capabilities?.approve_workflows === true) return true;
  if (user.capabilities?.approve_workflows === false) return false;
  return (
    user.role === "admin" ||
    user.role === "manager" ||
    user.role === "validator"
  );
}
