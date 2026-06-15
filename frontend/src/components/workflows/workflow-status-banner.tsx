"use client";

import { motion } from "framer-motion";
import { Warning, UploadSimple, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { ValidationContext } from "@/types/workflows";

type WorkflowStatusBannerProps = {
  context: ValidationContext;
  onScrollToVersions?: () => void;
  onRestart?: () => void;
  restarting?: boolean;
};

export function WorkflowStatusBanner({
  context,
  onScrollToVersions,
  onRestart,
  restarting,
}: WorkflowStatusBannerProps) {
  const showBanner =
    context.status === "REJETE" ||
    (context.rejected_at_version != null && context.can_restart_validation);
  if (!showBanner) {
    return null;
  }

  const needsNewVersion = !context.can_restart_validation;

  return (
    <motion.div
      className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="rounded-xl bg-amber-500/15 p-2 text-amber-800">
            <Warning className="h-5 w-5" weight="duotone" />
          </span>
          <div>
            <p className="font-semibold text-amber-950">
              {needsNewVersion ? "Validation rejetee" : "Correction prete a renvoyer"}
            </p>
            {context.rejection_comment ? (
              <p className="mt-1 text-sm text-amber-900/90">
                Motif : {context.rejection_comment}
              </p>
            ) : (
              <p className="mt-1 text-sm text-amber-900/80">
                Le validateur a refuse cette version du document.
              </p>
            )}
            {context.rejected_by_email && (
              <p className="mt-1 text-xs text-amber-800/70">
                Par {context.rejected_by_email}
                {context.rejection_date &&
                  ` · ${new Date(context.rejection_date).toLocaleString("fr-FR")}`}
              </p>
            )}
            {context.rejected_at_version != null && (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Version refusee : v{context.rejected_at_version}
                {context.current_version_number > 0 &&
                  ` · Version courante : v${context.current_version_number}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {needsNewVersion ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-amber-300 bg-white"
              onClick={onScrollToVersions}
            >
              <UploadSimple className="h-4 w-4" />
              Importer correction
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={onRestart}
              disabled={restarting}
            >
              <ArrowsClockwise className="h-4 w-4" />
              {restarting ? "Envoi..." : "Relancer validation"}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
