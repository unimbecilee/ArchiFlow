"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";
import { useFavoriteDocumentActions } from "@/lib/document-crud-actions";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import type { Document } from "@/types/documents";
import { getFavorites } from "@/services/favorites.service";

export default function FavorisPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await getFavorites());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { rowActions, bulkActions } = useFavoriteDocumentActions(load);

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Documents"
        title="Favoris"
        description="Acces direct aux dossiers que vous suivez au quotidien."
        icon={<Star className="h-6 w-6" weight="duotone" />}
        actions={
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <ArrowsClockwise className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />
      <PagePanel
        title="Selection"
        subtitle={loading ? "Chargement..." : `${docs.length} favori(s)`}
      >
        {loading ? (
          <ListSkeleton />
        ) : (
          <DocumentList
            documents={docs}
            emptyMessage="Aucun favori"
            emptyDescription="Marquez un document depuis sa fiche detail pour le retrouver ici."
            rowActions={rowActions}
            bulkActions={bulkActions}
            storageKey="archiflow-favorites-view"
          />
        )}
      </PagePanel>
    </PageFrame>
  );
}
