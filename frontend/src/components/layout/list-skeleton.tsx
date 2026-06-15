"use client";

import { motion } from "framer-motion";

type ListSkeletonProps = {
  rows?: number;
};

export function ListSkeleton({ rows = 4 }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <motion.div
          key={index}
          className="h-16 animate-shimmer rounded-2xl border border-slate-200/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
        />
      ))}
    </div>
  );
}
