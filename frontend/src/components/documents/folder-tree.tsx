"use client";

import { FolderSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type FolderTreeProps = {
  folders: { id: number; path: string }[];
  currentId: number | null;
  onSelect: (id: number | null) => void;
};

export function FolderTree({ folders, currentId, onSelect }: FolderTreeProps) {
  return (
    <nav aria-label="Arborescence des dossiers" className="text-sm">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left",
          currentId == null
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted",
        )}
      >
        <FolderSimple className="h-4 w-4 shrink-0" />
        Racine
      </button>
      <ul className="mt-1 space-y-0.5">
        {folders.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onSelect(f.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left",
                currentId === f.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted",
              )}
            >
              <FolderSimple className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{f.path}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
