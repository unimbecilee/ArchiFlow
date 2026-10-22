"use client";

import { CloudArrowUp, HardDrives, Path } from "@phosphor-icons/react";
import {
  summarizeUploadQueue,
  uploadRouteDetail,
  uploadRouteHeadline,
} from "@/lib/upload-route-hint";

type UploadRouteBannerProps = {
  files: File[];
};

function formatBytes(size: number): string {
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} Go`;
  const mb = size / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} Mo`;
  return `${Math.round(size / 1024)} Ko`;
}

export function UploadRouteBanner({ files }: UploadRouteBannerProps) {
  if (files.length === 0) return null;

  const stats = summarizeUploadQueue(files);
  const headline = uploadRouteHeadline(stats);
  const detail = uploadRouteDetail(stats);

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-soft-foreground">
            {stats.sftpGoEnabled ? (
              <Path className="h-5 w-5" weight="duotone" />
            ) : stats.mpuCount > 0 ? (
              <CloudArrowUp className="h-5 w-5" weight="duotone" />
            ) : (
              <HardDrives className="h-5 w-5" weight="duotone" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {headline}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {detail}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
          {files.length} fichier(s) · {formatBytes(stats.totalBytes)}
        </p>
      </div>
    </div>
  );
}
