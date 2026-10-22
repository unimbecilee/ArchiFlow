"use client";

import { useCallback, useMemo, useState } from "react";
import { Trash, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";
import type { Document } from "@/types/documents";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useDocumentListPage } from "@/hooks/use-document-list-page";
import {
  getTrashDocuments,
  purgeDocument,
  restoreDocument,
} from "@/services/documents.service";
import { buildTrashDocumentActions } from "@/lib/document-crud-actions";
import { useConfirm } from "@/components/feedback/confirm-provider";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";

export default function CorbeillePage() {
  const confirm = useConfirm();
  const {
    items: docs,
    loading,
    load,
    error,
  } = useDocumentListPage({
    loadFn: getTrashDocuments,
  });

  const handleRestore = useCallback(
    async (id: number) => {
      try {
        await restoreDocument(id);
        toast.success("Document restauré");
        await load();
      } catch (e: unknown) {
        toast.error(getApiErrorMessage(e, "Restauration impossible"));
      }
    },
    [load],
  );

  const handlePurge = useCallback(
    async (id: number) => {
      if (
        !(await confirm({
          title: "Purge définitive",
          description:
            "Ce document sera détruit définitivement. Impossible si un legal hold est actif.",
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
        toast.error(
          getApiErrorMessage(e, "Purge impossible (conservation active ?)"),
        );
      }
    },
    [confirm, load],
  );

  const handleBulkPurge = useCallback(
    async (items: Document[]) => {
      if (
        !(await confirm({
          title: "Purge définitive",
          description: `${items.length} document${items.length > 1 ? "s" : ""} seront détruits définitivement.`,
          confirmLabel: "Purger",
          destructive: true,
        }))
      ) {
        return;
      }
      const results = await Promise.allSettled(
        items.map((d) => purgeDocument(d.id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (ok > 0) toast.success(`${ok} document${ok > 1 ? "s" : ""} purgé${ok > 1 ? "s" : ""}`);
      if (failed > 0) {
        const first = results.find((r) => r.status === "rejected") as
          | PromiseRejectedResult
          | undefined;
        toast.error(
          getApiErrorMessage(
            first?.reason,
            `${failed} purge${failed > 1 ? "s" : ""} en échec`,
          ),
        );
      }
      await load();
    },
    [confirm, load],
  );

  const { rowActions, bulkActions } = useMemo(
    () => buildTrashDocumentActions(handleRestore, handlePurge, handleBulkPurge),
    [handleRestore, handlePurge, handleBulkPurge],
  );

  return (
    <PageFrame>
      <PageHeader
        title="Corbeille"
        description="Documents supprimés, récupérables avant purge définitive."
        icon={<Trash className="h-5 w-5" weight="duotone" />}
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
          />
        )}
      </PagePanel>
    </PageFrame>
  );
}
