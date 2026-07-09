"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { subscribeRealtime } from "@/lib/realtime-socket";
import {
  formatUploadError,
  uploadFileResumable,
  type ResumableProgress,
  type ResumableUploadMeta,
} from "@/services/resumable-upload.service";
import type { Document } from "@/types/documents";

export type ResumableUploaderProps = {
  file: File;
  meta: ResumableUploadMeta;
  onComplete: (doc: Document) => void;
  onError: (message: string) => void;
  autoStart?: boolean;
};

function formatSpeed(bps: number): string {
  if (bps < 1024) return `${Math.round(bps)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
}

function formatEta(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m} min ${s} s`;
}

export function ResumableUploader({
  file,
  meta,
  onComplete,
  onError,
  autoStart = true,
}: ResumableUploaderProps) {
  const [progress, setProgress] = useState<ResumableProgress | null>(null);
  const [paused, setPaused] = useState(!autoStart);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsub = subscribeRealtime((env) => {
      if (env.type === "documents" && env.payload?.event === "upload_completed") {
        /* parent handles navigation; hook for future UI toast */
      }
    });
    return unsub;
  }, []);

  const start = async () => {
    if (running) return;
    setPaused(false);
    setRunning(true);
    abortRef.current = new AbortController();
    try {
      const doc = await uploadFileResumable(
        file,
        meta,
        setProgress,
        abortRef.current.signal
      );
      onComplete(doc);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError(formatUploadError(err));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    if (autoStart && !paused) {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct =
    progress && progress.bytesTotal > 0
      ? Math.min(100, Math.round((progress.bytesUploaded / progress.bytesTotal) * 100))
      : 0;

  return (
    <div className="space-y-2 rounded-2xl border border-sky-200/80 bg-sky-50/40 px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-700">
        <span className="truncate">{file.name}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-sky-600 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {progress && (
        <p className="text-xs text-zinc-600">
          {formatSpeed(progress.speedBps)} · ETA {formatEta(progress.etaSeconds)} · parts{" "}
          {progress.partsDone}/{progress.partsTotal}
        </p>
      )}
      <div className="flex gap-2">
        {!running && paused && (
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void start()}>
            <Play className="h-3.5 w-3.5" />
            Reprendre
          </Button>
        )}
        {running && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              setPaused(true);
              abortRef.current?.abort();
              setRunning(false);
            }}
          >
            <Pause className="h-3.5 w-3.5" />
            Pause
          </Button>
        )}
        {!running && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1 text-zinc-500"
            onClick={() => onError("annule")}
          >
            <X className="h-3.5 w-3.5" />
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
