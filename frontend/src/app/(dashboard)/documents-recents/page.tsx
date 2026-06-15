"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";
import { useDocumentOpenAction } from "@/lib/document-crud-actions";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import type { Document } from "@/types/documents";
import { getRecentDocuments } from "@/services/documents.service";

export default function DocumentsRecentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await getRecentDocuments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAction = useDocumentOpenAction();

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Documents"
        title="Documents recents"
        description="Retrouvez les fichiers modifies recemment dans votre espace."
        icon={<Clock className="h-6 w-6" weight="duotone" />}
        actions={
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <ArrowsClockwise className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />
      <PagePanel
        title="Historique"
        subtitle={loading ? "Chargement..." : `${docs.length} document(s)`}
      >
        {loading ? (
          <ListSkeleton />
        ) : (
          <DocumentList
            documents={docs}
            emptyMessage="Aucun document recent"
            rowActions={[openAction]}
            storageKey="archiflow-recent-view"
          />
        )}
      </PagePanel>
    </PageFrame>
  );
}
