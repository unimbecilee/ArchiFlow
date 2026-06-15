"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      className={cn(
        "grid gap-6 lg:grid-cols-[1.35fr_auto] lg:items-end",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <motion.div className="space-y-3 lg:pr-8">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {icon && (
            <span className="inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
              {icon}
            </span>
          )}
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-900 md:text-4xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="max-w-[65ch] text-base leading-relaxed text-zinc-600">
            {description}
          </p>
        )}
      </motion.div>
      {actions && (
        <motion.div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}
