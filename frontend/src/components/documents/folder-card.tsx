"use client";

import { CaretRight, DotsThreeVertical, FolderOpen, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Folder } from "@/types/documents";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FolderCardProps = {
  folder: Folder;
  index?: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function FolderCard({ folder, onOpen, onEdit, onDelete }: FolderCardProps) {
  return (
    <div className="surface-card surface-card-interactive relative flex items-center gap-3 p-3.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="icon-well h-10 w-10">
          <FolderOpen className="h-5 w-5" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{folder.name}</p>
          <p className="text-xs text-muted-foreground">
            {folder.documents_count ?? 0} doc · {folder.subfolders_count ?? 0} sous-dossiers
          </p>
        </div>
        <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Actions pour ${folder.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <DotsThreeVertical className="h-5 w-5" weight="bold" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onEdit}>
            <PencilSimple className="h-4 w-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onClick={onDelete}>
            <Trash className="h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
