"use client";

import type { CrudBulkAction, CrudRowAction } from "@/components/crud";
import type { Document } from "@/types/documents";
import { DocumentCrudView } from "./document-crud-view";

type DocumentListProps = {
  documents: Document[];
  emptyMessage?: string;
  emptyDescription?: string;
  rowActions: CrudRowAction<Document>[];
  bulkActions?: CrudBulkAction<Document>[];
  storageKey?: string;
  defaultViewMode?: "list" | "grid";
};

export function DocumentList({
  documents,
  emptyMessage,
  emptyDescription,
  rowActions,
  bulkActions,
  storageKey,
  defaultViewMode,
}: DocumentListProps) {
  return (
    <DocumentCrudView
      documents={documents}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
      rowActions={rowActions}
      bulkActions={bulkActions}
      storageKey={storageKey}
      defaultViewMode={defaultViewMode}
    />
  );
}
