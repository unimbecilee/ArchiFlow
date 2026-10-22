"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowSquareOut, DownloadSimple, X } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DocumentPreviewPane } from "@/components/documents/document-preview-pane";
import type { Document } from "@/types/documents";
import { downloadDocumentFile } from "@/services/documents.service";

type DocumentQuickPreviewProps = {
  doc: Document | null;
  onClose: () => void;
};

export function DocumentQuickPreview({
  doc,
  onClose,
}: DocumentQuickPreviewProps) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  return (
    <AnimatePresence>
      {doc && (
        <>
          <motion.button
            type="button"
            aria-label="Fermer l'apercu"
            className="fixed inset-0 z-[60] bg-overlay backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-labelledby="quick-preview-title"
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-xl flex-col border-l border-border bg-background shadow-lg md:max-w-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Apercu rapide
                </p>
                <h2
                  id="quick-preview-title"
                  className="mt-1 truncate text-lg font-semibold text-foreground"
                >
                  {doc.titre}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {doc.file_name || doc.titre} · {doc.mime_type}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              <DocumentPreviewPane
                doc={doc}
                expanded
                className="min-h-[280px]"
              />
            </div>

            <footer className="flex flex-wrap gap-2 border-t border-border bg-card px-5 py-4">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href={`/documents/${doc.id}`}>
                  <ArrowSquareOut className="h-4 w-4" />
                  Ouvrir la fiche
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                type="button"
                onClick={() =>
                  void downloadDocumentFile(doc.id, doc.file_name || doc.titre)
                }
              >
                <DownloadSimple className="h-4 w-4" />
                Telecharger
              </Button>
              <Button
                type="button"
                size="sm"
                className="ml-auto"
                onClick={onClose}
              >
                Fermer
              </Button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
