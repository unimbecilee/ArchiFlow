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
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="skeleton h-4 w-4" />
        <div className="skeleton h-3.5 w-32" />
        <div className="skeleton ml-auto h-3.5 w-24" />
      </div>
      <ul className="divide-y divide-zinc-100">
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
        <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
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
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white/60 px-6 py-16 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <Icon className="h-7 w-7" weight="duotone" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-5">
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
      title="Votre coffre est vide"
      description="Importez votre premier document ou créez un dossier pour commencer. Vos fichiers seront analysés automatiquement."
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
      description="Vérifiez l’orthographe, essayez un terme plus court, ou élargissez la recherche aux contenus OCR et aux documents partagés."
    />
  );
}

export function EmptyInbox({ title, description }: { title: string; description: string }) {
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
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 px-6 py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
        <CloudSlash className="h-7 w-7" weight="duotone" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      <p className="tnum mt-3 rounded-md bg-white px-2.5 py-1 font-mono text-[11px] text-zinc-400 ring-1 ring-zinc-200">
        Référence : {correlationId || "af-inconnu"}
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry} className="mt-5">
        Réessayer
      </Button>
    </motion.div>
  );
}
