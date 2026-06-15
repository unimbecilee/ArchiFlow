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
      <motion.div
        key={item.label}
        className="flex min-w-[148px] flex-col gap-1 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.12)]"
      >
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          {item.label}
        </span>
        <span className="font-mono text-lg font-semibold tracking-tight text-zinc-900">
          {item.value}
        </span>
      </motion.div>
    ))}
  </>
  );
}

export const DashboardMetricStream = memo(function DashboardMetricStream() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-zinc-50 p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
    >
      <div className="mb-4 flex items-center justify-end">
        <motion.span
          className="inline-flex h-2 w-2 rounded-full bg-emerald-500"
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
