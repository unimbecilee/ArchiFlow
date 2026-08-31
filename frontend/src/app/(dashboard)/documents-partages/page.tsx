"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShareNetwork, ArrowsClockwise, FileText, Eye } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { EmptyState } from "@/components/layout/empty-state";
import { CrudDataView, type CrudRowAction } from "@/components/crud";
import type { SharedDocument } from "@/types/collaboration";
import type { Document } from "@/types/documents";
import { sharedDocumentForPreview } from "@/lib/document-quick-preview";
import { DocumentQuickPreview } from "@/components/documents/document-quick-preview";
import { useNotifications } from "@/context/notification-context";
import { getSharedWithMe } from "@/services/collaboration.service";

export default function DocumentsPartagesPage() {
  const router = useRouter();
  const { unreadShares } = useNotifications();
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [docs, setDocs] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocs(await getSharedWithMe());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rowActions = useMemo<CrudRowAction<SharedDocument>[]>(
    () => [
      {
        id: "open",
        label: "Ouvrir",
        icon: <Eye className="h-4 w-4" />,
        onClick: (doc) => router.push(`/documents/${doc.id}`),
      },
    ],
    [router]
  );

  return (
    <PageFrame>
      <PageHeader
        title="Documents partages"
        hideTitle
        description="Fichiers que d'autres utilisateurs ont partages avec vous."
        icon={<ShareNetwork className="h-6 w-6" weight="duotone" />}
        badge={
          unreadShares > 0 ? (
            <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-700">
              {unreadShares} partage(s) non lu(s)
            </span>
          ) : undefined
        }
        actions={
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <ArrowsClockwise className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />
      {error && <ErrorBanner message={error} />}
      <PagePanel
        title="Partages recus"
        subtitle={
          loading
            ? "Chargement..."
            : `${docs.length} document(s) · clic sur une ligne pour l'apercu`
        }
      >
        {loading ? (
          <ListSkeleton />
        ) : docs.length === 0 ? (
          <EmptyState
            title="Aucun partage pour le moment"
            description="Lorsqu'un collegue partagera un document, il apparaitra ici avec ses permissions."
            icon={<ShareNetwork className="h-6 w-6" weight="duotone" />}
          />
        ) : (
          <CrudDataView
            items={docs}
            getItemId={(d) => d.id}
            storageKey="archiflow-shared-view"
            rowActions={rowActions}
            selectable={false}
            onRowClick={(doc) => setPreviewDoc(sharedDocumentForPreview(doc))}
            columns={[
              {
                id: "doc",
                header: "Document",
                cell: (doc) => (
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="icon-well h-9 w-9">
                      <FileText className="h-4 w-4" weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{doc.titre}</p>
                      <p className="text-xs text-zinc-500">
                        {doc.taille_formatee || doc.taille} ·{" "}
                        {doc.permissions?.join(", ") || "lecture"}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                id: "date",
                header: "Partage",
                hideOnMobile: true,
                cell: (doc) => (
                  <span className="text-xs text-zinc-500">
                    {new Date(doc.date_partage).toLocaleDateString("fr-FR")}
                  </span>
                ),
              },
            ]}
            renderGridCard={(doc) => (
              <div className="space-y-2">
                <span className="icon-well">
                  <FileText className="h-5 w-5" weight="duotone" />
                </span>
                <p className="font-medium text-zinc-900">{doc.titre}</p>
                <p className="text-xs text-zinc-500">
                  {doc.permissions?.join(", ") || "lecture"}
                </p>
                <p className="text-xs text-zinc-400">
                  {new Date(doc.date_partage).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}
          />
        )}
      </PagePanel>
      <DocumentQuickPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </PageFrame>
  );
}
