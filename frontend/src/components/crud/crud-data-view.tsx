"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { CrudToolbar } from "./crud-toolbar";
import { RowActionsMenu } from "./row-actions-menu";
import type { CrudBulkAction, CrudColumn, CrudRowAction, CrudViewMode } from "./crud-types";
import { useCrudSelection } from "./use-crud-selection";
import { useCrudViewMode } from "./use-crud-view-mode";

export type CrudDataViewProps<T> = {
  items: T[];
  getItemId: (item: T) => string | number;
  columns: CrudColumn<T>[];
  renderGridCard: (item: T) => React.ReactNode;
  rowActions: CrudRowAction<T>[];
  bulkActions?: CrudBulkAction<T>[];
  selectable?: boolean;
  viewMode?: CrudViewMode;
  onViewModeChange?: (mode: CrudViewMode) => void;
  defaultViewMode?: CrudViewMode;
  storageKey?: string;
  toolbarSlot?: React.ReactNode;
  onRowClick?: (item: T) => void;
  gridClassName?: string;
};

export function CrudDataView<T>({
  items,
  getItemId,
  columns,
  renderGridCard,
  rowActions,
  bulkActions,
  selectable = true,
  viewMode: controlledViewMode,
  onViewModeChange,
  defaultViewMode = "list",
  storageKey,
  toolbarSlot,
  onRowClick,
  gridClassName,
}: CrudDataViewProps<T>) {
  const [internalViewMode, setInternalViewMode] = useCrudViewMode(storageKey, defaultViewMode);
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  const selection = useCrudSelection(items, getItemId);
  const showSelect = selectable && (bulkActions?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <CrudToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={showSelect ? selection.count : 0}
        selectedItems={selection.selectedItems}
        bulkActions={showSelect ? bulkActions : []}
        onClearSelection={selection.clear}
      >
        {toolbarSlot}
      </CrudToolbar>

      {viewMode === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,0.12)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {showSelect && (
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected}
                        onCheckedChange={() => selection.toggleAll()}
                        aria-label="Tout selectionner"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className={cn(
                        "px-4 py-3 font-medium",
                        col.hideOnMobile && "hidden sm:table-cell",
                        col.className
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                  {rowActions.length > 0 && (
                    <th className="w-14 px-2 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, rowIndex) => {
                  const id = getItemId(item);
                  const selected = selection.isSelected(id);
                  return (
                    <motion.tr
                      key={String(id)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 22,
                        delay: Math.min(rowIndex, 14) * 0.04,
                      }}
                      className={cn(
                        "text-zinc-700 transition-colors hover:bg-slate-50/80",
                        selected && "bg-emerald-50/40",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {showSelect && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => selection.toggle(id)}
                            aria-label="Selectionner la ligne"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            "px-4 py-3.5",
                            col.hideOnMobile && "hidden sm:table-cell",
                            col.className
                          )}
                        >
                          {col.cell(item)}
                        </td>
                      ))}
                      {rowActions.length > 0 && (
                        <td
                          className="px-2 py-2 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RowActionsMenu item={item} actions={rowActions} />
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <motion.ul
          className={cn(
            "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
            gridClassName
          )}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {items.map((item) => {
            const id = getItemId(item);
            const selected = selection.isSelected(id);
            return (
              <motion.li
                key={String(id)}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                className={cn(
                  "surface-card surface-card-interactive relative flex flex-col p-4",
                  selected && "ring-2 ring-emerald-500/40",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(item)}
              >
                <div
                  className="mb-3 flex items-start justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {showSelect ? (
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => selection.toggle(id)}
                      aria-label="Selectionner"
                    />
                  ) : (
                    <span />
                  )}
                  {rowActions.length > 0 && (
                    <RowActionsMenu item={item} actions={rowActions} />
                  )}
                </div>
                <div className="min-w-0 flex-1">{renderGridCard(item)}</div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
