"use client";

import { useCallback, useMemo, useState } from "react";
import { Trash, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentQuickPreview } from "@/components/documents/document-quick-preview";
import type { Document } from "@/types/documents";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useDocumentListPage } from "@/hooks/use-document-list-page";
import { getTrashDocuments, purgeDocument, restoreDocument } from "@/services/documents.service";
import { buildTrashDocumentActions } from "@/lib/document-crud-actions";
import { useConfirm } from "@/components/feedback/confirm-provider";
import { toast } from "sonner";

export default function CorbeillePage() {
  const confirm = useConfirm();
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const { items: docs, loading, load, error } = useDocumentListPage({
    loadFn: getTrashDocuments,
  });

  const handleRestore = useCallback(async (id: number) => {
    await restoreDocument(id);
    await load();
  }, [load]);

  const handlePurge = useCallback(async (id: number) => {
    if (
      !(await confirm({
        title: "Purge définitive",
        description: "Ce document sera détruit définitivement. Impossible si un legal hold est actif.",
        confirmLabel: "Purger",
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await purgeDocument(id);
      toast.success("Document purgé");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Purge impossible (conservation active ?)");
    }
  }, [confirm, load]);

  const { rowActions, bulkActions } = useMemo(
    () => buildTrashDocumentActions(handleRestore, handlePurge),
    [handleRestore, handlePurge]
  );

  return (
    <PageFrame>
      <PageHeader
        title="Corbeille"
        description="Documents supprimés, récupérables avant purge définitive."
        icon={<Trash className="h-5 w-5" weight="duotone" />}
        actions={
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <ArrowsClockwise className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}
      <PagePanel
        title="Éléments supprimés"
        subtitle={
          loading
            ? "Chargement…"
            : docs.length === 1
              ? "1 élément"
              : `${docs.length} éléments`
        }
      >
        {loading ? (
          <ListSkeleton />
        ) : (
          <DocumentList
            documents={docs}
            emptyMessage="Corbeille vide"
            emptyDescription="Les fichiers supprimes y apparaissent ici le temps de la retention."
            rowActions={rowActions}
            bulkActions={bulkActions}
            storageKey="archiflow-trash-view"
            onQuickPreview={setPreviewDoc}
          />
        )}
      </PagePanel>
      <DocumentQuickPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </PageFrame>
  );
}
