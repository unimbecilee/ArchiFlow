"use client";

import { useState } from "react";
import { Clock, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentQuickPreview } from "@/components/documents/document-quick-preview";
import { useDocumentOpenAction } from "@/lib/document-crud-actions";
import type { Document } from "@/types/documents";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useDocumentListPage } from "@/hooks/use-document-list-page";
import { getRecentDocuments } from "@/services/documents.service";

export default function DocumentsRecentsPage() {
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const {
    items: docs,
    loading,
    load,
    error,
  } = useDocumentListPage({
    loadFn: getRecentDocuments,
  });
  const openAction = useDocumentOpenAction();

  return (
    <PageFrame>
      <PageHeader
        title="Documents récents"
        description="Fichiers ouverts ou modifiés récemment."
        icon={<Clock className="h-5 w-5" weight="duotone" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-1.5"
          >
            <ArrowsClockwise className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}
      <PagePanel
        title="Historique"
        subtitle={
          loading
            ? "Chargement…"
            : `${docs.length === 1 ? "1 document" : `${docs.length} documents`} · clic pour l’aperçu`
        }
      >
        {loading ? (
          <ListSkeleton />
        ) : (
          <DocumentList
            documents={docs}
            emptyMessage="Aucun document récent"
            rowActions={[openAction]}
            storageKey="archiflow-recent-view"
            onQuickPreview={setPreviewDoc}
          />
        )}
      </PagePanel>
      <DocumentQuickPreview
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </PageFrame>
  );
}
