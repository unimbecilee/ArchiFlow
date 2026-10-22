"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileArrowUp,
  Pause,
  Play,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { buildMenuAccessContext } from "@/lib/menu-access";
import { pushPendingImportFiles } from "@/lib/pending-import";
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
    window.removeEventListener(
      "archiflow-prefs",
      onStoreChange as EventListener,
    );
  };
}

export function ImportFab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { canWrite } = buildMenuAccessContext(user);
  const showFab = useSyncExternalStore(
    subscribePrefs,
    () => readUserPrefs().showImportFab,
    () => true,
  );
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener("archiflow:open-uploader", openPanel);
    return () =>
      window.removeEventListener("archiflow:open-uploader", openPanel);
  }, []);

  if (!canWrite || !showFab) return null;

  function sendFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    pushPendingImportFiles(list);
    setOpen(false);
    router.push("/importer");
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-card shadow-e3"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Importer</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.98]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length)
                  sendFiles(e.dataTransfer.files);
              }}
              className="mx-4 mb-4 mt-3 flex w-[calc(100%-2rem)] flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/35 bg-accent-soft/60 px-4 py-5 text-center transition-colors hover:border-primary/55 hover:bg-accent-soft active:scale-[0.99]"
            >
              <FileArrowUp className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-accent-soft-foreground">
                Glissez vos fichiers ou cliquez pour parcourir
              </span>
              <span className="text-[11px] text-muted-foreground">
                Reprise automatique en cas de coupure réseau
              </span>
            </button>
            <p className="flex items-center justify-center gap-2 px-4 pb-4 text-[11px] text-muted-foreground">
              <Play className="h-3 w-3" />
              <Pause className="h-3 w-3" />
              Pause et reprise disponibles sur la page d&apos;import
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-e3 hover:bg-primary-hover"
        aria-label={open ? "Fermer l’import" : "Importer des documents"}
        aria-expanded={open}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="up"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <UploadSimple className="h-6 w-6" weight="bold" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) sendFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
