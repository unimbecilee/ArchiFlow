"use client";

import { motion } from "framer-motion";
import { WarningCircle } from "@phosphor-icons/react";
import { getLastCorrelationId } from "@/lib/api";

type ErrorBannerProps = {
  message: string;
  requestId?: string;
};

export function ErrorBanner({ message, requestId }: ErrorBannerProps) {
  const reference = requestId || getLastCorrelationId();

  return (
    <motion.div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
      <div className="min-w-0">
        <span>{message}</span>
        {reference ? (
          <span className="mt-1 block font-mono text-xs text-red-600/80">
            Référence : <span className="select-all">{reference}</span> — à communiquer au support
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
