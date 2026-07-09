"use client";

import { motion } from "framer-motion";
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

export function FolderCard({ folder, index = 0, onOpen, onEdit, onDelete }: FolderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="surface-bento relative flex items-center gap-3 p-5 transition-transform hover:-translate-y-0.5"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]"
      >
        <span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-700">
          <FolderOpen className="h-5 w-5" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-900">{folder.name}</p>
          <p className="text-xs text-zinc-500">
            {folder.documents_count ?? 0} doc · {folder.subfolders_count ?? 0} sous-dossiers
          </p>
          {folder.description ? (
            <p className="mt-0.5 truncate text-xs text-zinc-400">{folder.description}</p>
          ) : null}
        </div>
        <CaretRight className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
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
    </motion.div>
  );
}
