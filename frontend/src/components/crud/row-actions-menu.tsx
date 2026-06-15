"use client";

import { DotsThreeVertical } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CrudRowAction } from "./crud-types";

type RowActionsMenuProps<T> = {
  item: T;
  actions: CrudRowAction<T>[];
  align?: "start" | "end";
};

export function RowActionsMenu<T>({ item, actions, align = "end" }: RowActionsMenuProps<T>) {
  const visible = actions.filter((a) => !a.hidden?.(item));
  if (visible.length === 0) return null;

  const regular = visible.filter((a) => !a.destructive);
  const destructive = visible.filter((a) => a.destructive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-zinc-500 hover:text-zinc-800"
          aria-label="Actions"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeVertical className="h-5 w-5" weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {regular.map((action) => (
          <DropdownMenuItem
            key={action.id}
            disabled={action.disabled?.(item)}
            onClick={() => action.onClick(item)}
            className="gap-2"
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
        {regular.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((action) => (
          <DropdownMenuItem
            key={action.id}
            destructive
            disabled={action.disabled?.(item)}
            onClick={() => action.onClick(item)}
            className="gap-2"
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
