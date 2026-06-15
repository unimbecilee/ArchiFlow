"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PagePanelProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

/** Libelle de section lisible (au-dessus du panneau). */
function PanelCaption({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;
  return (
    <div className="px-1 pb-3">
      {title && (
        <p className="text-sm font-semibold tracking-tight text-zinc-800">{title}</p>
      )}
      {subtitle && (
        <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{subtitle}</p>
      )}
    </div>
  );
}

export function PagePanel({
  title,
  subtitle,
  children,
  className,
  delay = 0.05,
}: PagePanelProps) {
  return (
    <motion.section
      className={cn("space-y-0", className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay }}
    >
      <PanelCaption title={title} subtitle={subtitle} />
      <div className="surface-bento p-6 md:p-8">{children}</div>
    </motion.section>
  );
}
