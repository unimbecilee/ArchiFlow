"use client";

import Link from "next/link";
import { FileText } from "@phosphor-icons/react";
import {
  CrudDataView,
  type CrudBulkAction,
  type CrudRowAction,
} from "@/components/crud";
import { EmptyState } from "@/components/layout/empty-state";
import type { Document } from "@/types/documents";

type DocumentCrudViewProps = {
  documents: Document[];
  emptyMessage?: string;
  emptyDescription?: string;
  rowActions: CrudRowAction<Document>[];
  bulkActions?: CrudBulkAction<Document>[];
  storageKey?: string;
  defaultViewMode?: "list" | "grid";
  onQuickPreview?: (doc: Document) => void;
};

export function DocumentCrudView({
  documents,
  emptyMessage = "Aucun document",
  emptyDescription = "Les fichiers apparaitront ici des qu'ils seront disponibles.",
  rowActions,
  bulkActions,
  storageKey = "archiflow-documents-view",
  defaultViewMode = "list",
  onQuickPreview,
}: DocumentCrudViewProps) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
        icon={<FileText className="h-6 w-6" weight="duotone" />}
      />
    );
  }

  return (
    <CrudDataView
      items={documents}
      getItemId={(d) => d.id}
      storageKey={storageKey}
      defaultViewMode={defaultViewMode}
      bulkActions={bulkActions}
      rowActions={rowActions}
      onRowClick={onQuickPreview}
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
                <Link
                  href={`/documents/${doc.id}`}
                  className="block truncate font-medium hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {doc.titre}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {doc.taille_formatee || doc.taille} · {doc.mime_type}
                  {doc.status && ` · ${doc.status}`}
                </p>
              </div>
            </div>
          ),
        },
        {
          id: "status",
          header: "Statut",
          hideOnMobile: true,
          cell: (doc) => (
            <span className="text-xs font-medium text-muted-foreground">
              {doc.status || "—"}
            </span>
          ),
        },
      ]}
      renderGridCard={(doc) => (
        <div className="space-y-2">
          <span className="icon-well">
            <FileText className="h-5 w-5" weight="duotone" />
          </span>
          <Link
            href={`/documents/${doc.id}`}
            className="block font-medium hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {doc.titre}
          </Link>
          <p className="text-xs text-muted-foreground">
            {doc.taille_formatee || doc.taille} · {doc.mime_type}
          </p>
          {doc.status && (
            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {doc.status}
            </span>
          )}
        </div>
      )}
    />
  );
}
