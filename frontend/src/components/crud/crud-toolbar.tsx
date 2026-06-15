"use client";

import { List, SquaresFour, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrudBulkAction, CrudViewMode } from "./crud-types";

type CrudToolbarProps<T> = {
  viewMode: CrudViewMode;
  onViewModeChange: (mode: CrudViewMode) => void;
  selectedCount: number;
  selectedItems: T[];
  bulkActions?: CrudBulkAction<T>[];
  onClearSelection: () => void;
  children?: React.ReactNode;
};

export function CrudToolbar<T>({
  viewMode,
  onViewModeChange,
  selectedCount,
  selectedItems,
  bulkActions = [],
  onClearSelection,
  children,
}: CrudToolbarProps<T>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-h-9 flex-1 flex-wrap items-center gap-2">
        {selectedCount > 0 ? (
          <>
            <span className="text-sm font-medium text-zinc-800">
              {selectedCount} selectionne(s)
            </span>
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.destructive ? "outline" : "secondary"}
                className={cn(
                  "gap-1.5",
                  action.destructive && "border-red-200 text-red-700 hover:bg-red-50"
                )}
                disabled={action.disabled?.(selectedItems)}
                onClick={() => void action.onClick(selectedItems)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-zinc-500"
              onClick={onClearSelection}
            >
              <X className="h-3.5 w-3.5" />
              Effacer
            </Button>
          </>
        ) : (
          children
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1">
        <Button
          type="button"
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => onViewModeChange("list")}
          aria-pressed={viewMode === "list"}
        >
          <List className="h-4 w-4" />
          Liste
        </Button>
        <Button
          type="button"
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => onViewModeChange("grid")}
          aria-pressed={viewMode === "grid"}
        >
          <SquaresFour className="h-4 w-4" />
          Grille
        </Button>
      </div>
    </div>
  );
}
