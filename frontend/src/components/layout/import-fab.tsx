"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { buildMenuAccessContext } from "@/lib/menu-access";
import { readUserPrefs } from "@/lib/user-prefs";
import { useAuthStore } from "@/store/auth-store";

function subscribePrefs(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === "archiflow-user-prefs") onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("archiflow-prefs", onStoreChange as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("archiflow-prefs", onStoreChange as EventListener);
  };
}

export function ImportFab() {
  const { user } = useAuthStore();
  const { canWrite } = buildMenuAccessContext(user);
  const showFab = useSyncExternalStore(
    subscribePrefs,
    () => readUserPrefs().showImportFab,
    () => true
  );

  if (!canWrite || !showFab) return null;

  return (
    <Link
      href="/importer"
      className="fixed bottom-6 right-5 z-40 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.98] md:hidden"
    >
      <UploadSimple className="h-5 w-5" weight="bold" />
      Importer
    </Link>
  );
}
