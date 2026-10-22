"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  CloudSlash,
  FileArrowUp,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SkeletonDocuments({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="skeleton h-4 w-4" />
        <div className="skeleton h-3.5 w-32" />
        <div className="skeleton ml-auto h-3.5 w-24" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="skeleton h-4 w-4" />
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div
                className="skeleton h-3.5"
                style={{ width: `${[72, 58, 64, 40, 80, 52, 68, 46][i % 8]}%` }}
              />
              <div className="skeleton mt-2 h-2.5 w-24" />
            </div>
            <div className="skeleton hidden h-5 w-20 rounded-full sm:block" />
            <div className="skeleton hidden h-3.5 w-16 sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="skeleton h-3.5 w-24" />
          <div className="skeleton mt-3 h-7 w-16" />
          <div className="skeleton mt-2 h-2.5 w-28" />
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  icon: Icon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border bg-muted/40 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground ring-1 ring-primary/30">
        <Icon className="h-6 w-6" weight="duotone" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
      {actionLabel && onAction && (
        <Button variant="default" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </motion.div>
  );
}

export function EmptyDocs({ onImport }: { onImport: () => void }) {
  return (
    <EmptyState
      icon={FileArrowUp}
      title="Aucun document pour le moment"
      description="Importez un fichier ou créez un dossier pour commencer."
      actionLabel="Importer un document"
      onAction={onImport}
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={MagnifyingGlass}
      title={`Aucun résultat pour « ${query} »`}
      description="Essayez un autre nom, ou un terme plus court."
    />
  );
}

export function EmptyInbox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      icon={MagnifyingGlass}
      title={title}
      description={description}
    />
  );
}

type ErrorStateProps = {
  title?: string;
  description?: string;
  correlationId: string;
  onRetry: () => void;
};

export function ErrorState({
  title = "Impossible de charger vos documents",
  description = "Le service est momentanément injoignable. Vos données ne sont pas affectées — vous pouvez réessayer.",
  correlationId,
  onRetry,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/25 bg-destructive-soft/40 px-6 py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
        <CloudSlash className="h-7 w-7" weight="duotone" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <p className="tnum mt-3 rounded bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground ring-1 ring-border">
        Référence : {correlationId || "af-inconnu"}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-5">
        Réessayer
      </Button>
    </motion.div>
  );
}
