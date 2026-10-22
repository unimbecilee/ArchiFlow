"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DownloadSimple, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentPreviewPane } from "@/components/documents/document-preview-pane";
import { downloadDocumentFile } from "@/services/documents.service";
import type { Document } from "@/types/documents";

type Props = {
  open: boolean;
  onClose: () => void;
  doc: Pick<
    Document,
    | "id"
    | "titre"
    | "mime_type"
    | "file_name"
    | "previewable"
    | "taille_formatee"
  >;
};

export function DocumentPreviewModal({ open, onClose, doc }: Props) {
  const isPdf = doc.mime_type === "application/pdf";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Apercu — ${doc.titre}`}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/60 p-2 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`flex w-[min(98vw,1440px)] max-w-none flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-[0_24px_64px_-24px_rgba(15,23,42,0.35)] sm:rounded-[1.75rem] ${
              isPdf ? "h-[min(94dvh,920px)]" : "max-h-[min(92dvh,900px)]"
            }`}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Apercu document
                </p>
                <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {doc.titre}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {doc.mime_type}
                  {doc.taille_formatee ? ` · ${doc.taille_formatee}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    void downloadDocumentFile(
                      doc.id,
                      doc.file_name || doc.titre,
                    )
                  }
                >
                  <DownloadSimple className="h-4 w-4" />
                  <span className="hidden sm:inline">Telecharger</span>
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-muted active:scale-[0.98]"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div
              className={`min-h-0 flex-1 overflow-hidden ${
                isPdf
                  ? "bg-card p-1.5 sm:p-2"
                  : "overflow-auto bg-muted/40 p-4 sm:p-6"
              }`}
            >
              <DocumentPreviewPane
                doc={doc}
                expanded
                className="h-full w-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
