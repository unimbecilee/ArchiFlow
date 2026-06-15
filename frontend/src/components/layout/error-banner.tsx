"use client";

import { motion } from "framer-motion";
import { WarningCircle } from "@phosphor-icons/react";

type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <motion.div
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
      <span>{message}</span>
    </motion.div>
  );
}
