"use client";

import { Star, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";
import { useFavoriteDocumentActions } from "@/lib/document-crud-actions";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useDocumentListPage } from "@/hooks/use-document-list-page";
import { getFavorites } from "@/services/favorites.service";

export default function FavorisPage() {
  const { items: docs, loading, load, error } = useDocumentListPage({
    loadFn: getFavorites,
  });
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
      {error ? <ErrorBanner message={error} /> : null}
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
