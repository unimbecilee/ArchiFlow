"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  DownloadSimple,
  FolderSimple,
  Trash,
  CheckCircle,
  ArrowCounterClockwise,
  Star,
} from "@phosphor-icons/react";
import type { CrudBulkAction, CrudRowAction } from "@/components/crud";
import type { Document } from "@/types/documents";
import { removeFavorite } from "@/services/favorites.service";

export function useDocumentOpenAction(): CrudRowAction<Document> {
  const router = useRouter();
  return useMemo(
    () => ({
      id: "open",
      label: "Ouvrir",
      icon: <Eye className="h-4 w-4" />,
      onClick: (doc) => router.push(`/documents/${doc.id}`),
    }),
    [router]
  );
}

export function useFavoriteDocumentActions(onChanged: () => void): {
  rowActions: CrudRowAction<Document>[];
  bulkActions: CrudBulkAction<Document>[];
} {
  const open = useDocumentOpenAction();

  const rowActions = useMemo<CrudRowAction<Document>[]>(
    () => [
      open,
      {
        id: "unfavorite",
        label: "Retirer des favoris",
        icon: <Star className="h-4 w-4" />,
        onClick: async (doc) => {
          await removeFavorite(doc.id);
          onChanged();
        },
      },
    ],
    [open, onChanged]
  );

  const bulkActions = useMemo<CrudBulkAction<Document>[]>(
    () => [
      {
        id: "unfavorite-bulk",
        label: "Retirer des favoris",
        icon: <Star className="h-4 w-4" />,
        onClick: async (items) => {
          await Promise.all(items.map((d) => removeFavorite(d.id)));
          onChanged();
        },
      },
    ],
    [onChanged]
  );

  return { rowActions, bulkActions };
}

export type MesDocumentsActionHandlers = {
  onPreview: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onMove: (doc: Document) => void;
  onDelete: (id: number) => void;
  onBulkDelete: (items: Document[]) => void | Promise<void>;
  onStartValidation: (id: number) => void;
};

export function buildMesDocumentsActions(
  handlers: MesDocumentsActionHandlers
): {
  rowActions: CrudRowAction<Document>[];
  bulkActions: CrudBulkAction<Document>[];
} {
  const rowActions: CrudRowAction<Document>[] = [
    {
      id: "open",
      label: "Ouvrir",
      icon: <Eye className="h-4 w-4" />,
      onClick: (doc) => {
        window.location.href = `/documents/${doc.id}`;
      },
    },
    {
      id: "preview",
      label: "Apercu",
      icon: <Eye className="h-4 w-4" />,
      hidden: (doc) => !doc.previewable,
      onClick: handlers.onPreview,
    },
    {
      id: "download",
      label: "Telecharger",
      icon: <DownloadSimple className="h-4 w-4" />,
      onClick: handlers.onDownload,
    },
    {
      id: "move",
      label: "Deplacer",
      icon: <FolderSimple className="h-4 w-4" />,
      onClick: handlers.onMove,
    },
    {
      id: "validate",
      label: "Soumettre a validation",
      icon: <CheckCircle className="h-4 w-4" />,
      hidden: (doc) => doc.status !== "BROUILLON",
      onClick: (doc) => handlers.onStartValidation(doc.id),
    },
    {
      id: "delete",
      label: "Supprimer",
      icon: <Trash className="h-4 w-4" />,
      destructive: true,
      onClick: (doc) => handlers.onDelete(doc.id),
    },
  ];

  const bulkActions: CrudBulkAction<Document>[] = [
    {
      id: "delete-bulk",
      label: "Supprimer",
      icon: <Trash className="h-4 w-4" />,
      destructive: true,
      onClick: (items) => handlers.onBulkDelete(items),
    },
  ];

  return { rowActions, bulkActions };
}

export function buildTrashDocumentActions(
  onRestore: (id: number) => Promise<void>,
  onPurge?: (id: number) => Promise<void>
): {
  rowActions: CrudRowAction<Document>[];
  bulkActions: CrudBulkAction<Document>[];
} {
  return {
    rowActions: [
      {
        id: "restore",
        label: "Restaurer",
        icon: <ArrowCounterClockwise className="h-4 w-4" />,
        onClick: (doc) => void onRestore(doc.id),
      },
      ...(onPurge
        ? [
            {
              id: "purge",
              label: "Purger définitivement",
              icon: <Trash className="h-4 w-4" />,
              destructive: true,
              onClick: (doc: Document) => void onPurge(doc.id),
            },
          ]
        : []),
    ],
    bulkActions: [
      {
        id: "restore-bulk",
        label: "Restaurer",
        icon: <ArrowCounterClockwise className="h-4 w-4" />,
        onClick: async (items) => {
          await Promise.all(items.map((d) => onRestore(d.id)));
        },
      },
    ],
  };
}
