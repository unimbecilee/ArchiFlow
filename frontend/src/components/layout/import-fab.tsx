"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileArrowUp, Pause, Play, UploadSimple, X } from "@phosphor-icons/react";
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
    window.removeEventListener("archiflow-prefs", onStoreChange as EventListener);
  };
}

export function ImportFab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { canWrite } = buildMenuAccessContext(user);
  const showFab = useSyncExternalStore(
    subscribePrefs,
    () => readUserPrefs().showImportFab,
    () => true
  );
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener("archiflow:open-uploader", openPanel);
    return () => window.removeEventListener("archiflow:open-uploader", openPanel);
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Importer</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
                if (e.dataTransfer.files.length) sendFiles(e.dataTransfer.files);
              }}
              className="mx-4 mb-4 mt-3 flex w-[calc(100%-2rem)] flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-5 text-center hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/60"
            >
              <FileArrowUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Glissez vos fichiers ou cliquez pour parcourir
              </span>
              <span className="text-[11px] text-emerald-700/70 dark:text-emerald-400/80">
                Reprise automatique en cas de coupure réseau
              </span>
            </button>
            <p className="flex items-center justify-center gap-2 px-4 pb-4 text-[11px] text-zinc-400">
              <Play className="h-3 w-3" />
              <Pause className="h-3 w-3" />
              Pause et reprise disponibles sur la page d’import
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 hover:bg-emerald-500"
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
