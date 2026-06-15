"use client";

import { useCallback, useState } from "react";
import type { CrudViewMode } from "./crud-types";

export function useCrudViewMode(
  storageKey?: string,
  defaultMode: CrudViewMode = "list"
) {
  const [mode, setModeState] = useState<CrudViewMode>(() => {
    if (typeof window === "undefined" || !storageKey) return defaultMode;
    const stored = localStorage.getItem(storageKey);
    return stored === "grid" || stored === "list" ? stored : defaultMode;
  });

  const setMode = useCallback(
    (next: CrudViewMode) => {
      setModeState(next);
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(storageKey, next);
      }
    },
    [storageKey]
  );

  return [mode, setMode] as const;
}
