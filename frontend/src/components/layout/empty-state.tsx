"use client";

import { FolderOpen } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center shadow-e1",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground ring-1 ring-primary/30">
        {icon ?? <FolderOpen className="h-7 w-7" weight="duotone" />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </motion.div>
  );
}