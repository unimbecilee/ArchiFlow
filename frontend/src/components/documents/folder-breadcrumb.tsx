"use client";

import Link from "next/link";
import { CaretRight, House } from "@phosphor-icons/react";
import type { FolderBreadcrumbItem } from "@/types/documents";

type FolderBreadcrumbProps = {
  items: FolderBreadcrumbItem[];
  currentFolderId: number | null;
};

export function FolderBreadcrumb({ items, currentFolderId }: FolderBreadcrumbProps) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1 text-sm text-zinc-600"
      aria-label="Fil d'Ariane dossiers"
    >
      <Link
        href="/mes-documents"
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
          currentFolderId === null ? "font-medium text-emerald-800" : ""
        }`}
      >
        <House className="h-4 w-4" weight="duotone" />
        Racine
      </Link>
      {items.map((item) => (
        <span key={item.id} className="inline-flex items-center gap-1">
          <CaretRight className="h-3.5 w-3.5 text-zinc-400" />
          <Link
            href={`/mes-documents?folder=${item.id}`}
            className={`rounded-lg px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
              currentFolderId === item.id ? "font-medium text-emerald-800" : ""
            }`}
          >
            {item.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
