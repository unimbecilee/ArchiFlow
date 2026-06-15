"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import type { Document } from "@/types/documents";
import { getTrashDocuments, restoreDocument } from "@/services/documents.service";
import { buildTrashDocumentActions } from "@/lib/document-crud-actions";

export default function CorbeillePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await getTrashDocuments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = useCallback(async (id: number) => {
    await restoreDocument(id);
    await load();
  }, [load]);

  const { rowActions, bulkActions } = useMemo(
    () => buildTrashDocumentActions(handleRestore),
    [handleRestore]
  );

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Documents"
        title="Corbeille"
        description="Documents supprimes recemment, recuperables avant purge definitive."
        icon={<Trash className="h-6 w-6" weight="duotone" />}
        actions={
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <ArrowsClockwise className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />
      <PagePanel
        title="Elements supprimes"
        subtitle={loading ? "Chargement..." : `${docs.length} element(s)`}
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
          />
        )}
      </PagePanel>
    </PageFrame>
  );
}
