"use client";

import { memo } from "react";
import { motion } from "framer-motion";

const STREAM = [
  { label: "Archives MinIO", value: "847 Go" },
  { label: "Flux OCR", value: "12.4k pages" },
  { label: "ArchiFlow + actifs", value: "38 espaces" },
  { label: "Partages", value: "214 liens" },
  { label: "Workflows", value: "47.2% SLA" },
];

function StreamRow() {
  return (
    <>
      {STREAM.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[148px] flex-col gap-1 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-[var(--shadow-card)]"
        >
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {item.label}
          </span>
          <span className="font-mono text-lg font-semibold tracking-tight">
            {item.value}
          </span>
        </div>
      ))}
    </>
  );
}

export const DashboardMetricStream = memo(function DashboardMetricStream() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-muted/40 p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.12 }}
    >
      <div className="mb-4 flex items-center justify-end">
        <motion.span
          className="inline-flex h-2 w-2 rounded-full bg-primary"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          aria-label="Flux actif"
        />
      </div>
      <motion.div
        className="flex gap-3"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, ease: "linear", repeat: Infinity }}
      >
        <StreamRow />
        <StreamRow />
      </motion.div>
    </motion.div>
  );
});
