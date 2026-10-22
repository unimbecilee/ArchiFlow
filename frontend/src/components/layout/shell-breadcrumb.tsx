"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import type { PageCrumb } from "@/lib/page-meta";

type ShellBreadcrumbProps = {
  crumbs: PageCrumb[];
};

export function ShellBreadcrumb({ crumbs }: ShellBreadcrumbProps) {
  if (crumbs.length <= 1) return null;

  return (
    <nav
      className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      aria-label="Fil d'Ariane"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span
            key={`${crumb.label}-${index}`}
            className="inline-flex items-center gap-1"
          >
            {index > 0 && (
              <CaretRight
                className="h-3 w-3 shrink-0 text-muted-foreground"
                weight="bold"
              />
            )}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="rounded-md px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-foreground" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
