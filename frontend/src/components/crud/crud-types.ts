import type { ReactNode } from "react";

export type CrudViewMode = "list" | "grid";

export type CrudRowAction<T> = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  destructive?: boolean;
  hidden?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
};

export type CrudBulkAction<T> = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: (items: T[]) => void | Promise<void>;
  destructive?: boolean;
  disabled?: (items: T[]) => boolean;
};

export type CrudColumn<T> = {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
  /** Hide column below `sm` breakpoint */
  hideOnMobile?: boolean;
};
