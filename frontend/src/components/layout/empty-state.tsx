"use client";

import { motion } from "framer-motion";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-start gap-4 rounded-[1.75rem] border border-dashed border-slate-200 bg-zinc-50/80 px-6 py-10 md:px-8"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
    >
      {icon && (
        <span className="rounded-2xl bg-white p-3 text-zinc-500 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.12)]">
          {icon}
        </span>
      )}
      <div className="space-y-2">
        <p className="text-base font-medium text-zinc-900">{title}</p>
        <p className="max-w-md text-sm leading-relaxed text-zinc-600">{description}</p>
      </div>
      {action}
    </motion.div>
  );
}
