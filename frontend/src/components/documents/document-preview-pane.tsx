"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, FileText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Document } from "@/types/documents";
import { downloadDocumentFile, previewUrl } from "@/services/documents.service";
import { getAccessToken } from "@/lib/session-tokens";
import { resolvePreviewKind, type PreviewKind } from "@/lib/preview-kind";
import { isOfficeDocument } from "@/lib/office-document";

type Props = {
  doc: Pick<Document, "id" | "titre" | "mime_type" | "file_name" | "previewable" | "office_editable">;
  className?: string;
  maxHeightClass?: string;
  expanded?: boolean;
  /** Rendu alternatif pour les docs office (Collabora / OnlyOffice). */
  officeSlot?: React.ReactNode;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; src: string; blobType: string; text?: string }
  | { status: "error"; message?: string };

export function DocumentPreviewPane({
  doc,
  className = "",
  maxHeightClass = "max-h-[min(52vh,520px)]",
  expanded = false,
  officeSlot,
}: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const kind = resolvePreviewKind(doc.mime_type, doc.file_name);
  const isOffice =
    kind === "office" || isOfficeDocument(doc.mime_type, doc.file_name);

  useEffect(() => {
    if (isOffice && officeSlot) {
      setState({ status: "ready", src: "", blobType: doc.mime_type || "" });
      return;
    }

    const ac = new AbortController();
    let objectUrl: string | null = null;
    setState({ status: "loading" });

    const token = getAccessToken();
    fetch(previewUrl(doc.id), {
      credentials: "include",
      signal: ac.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`preview ${r.status}`);
        const blob = await r.blob();
        const blobType = blob.type || doc.mime_type || "";
        const resolved = resolvePreviewKind(blobType, doc.file_name);

        if (resolved === "text" || blobType.startsWith("text/") || blobType === "application/json") {
          const text = await blob.text();
          if (ac.signal.aborted) return;
          setState({ status: "ready", src: "", blobType, text });
          return;
        }

        const url = URL.createObjectURL(blob);
        if (ac.signal.aborted) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setState({ status: "ready", src: url, blobType });
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "preview failed",
        });
      });

    return () => {
      ac.abort();
      // Drop UI off the blob URL before revoking (avoids broken-image flash).
      setState({ status: "loading" });
      const toRevoke = objectUrl;
      if (toRevoke) {
        queueMicrotask(() => URL.revokeObjectURL(toRevoke));
      }
    };
  }, [doc.id, doc.mime_type, doc.file_name, isOffice, officeSlot]);

  if (isOffice && officeSlot) {
    return <div className={className}>{officeSlot}</div>;
  }

  if (state.status === "loading") {
    return (
      <div
        className={`animate-pulse rounded-2xl border border-slate-200/70 bg-zinc-100/80 ${maxHeightClass} min-h-[200px] w-full ${className}`}
        aria-hidden
      />
    );
  }

  if (state.status === "error") {
    return (
      <FallbackDownload
        doc={doc}
        className={className}
        hint="Impossible de charger l'apercu. Telechargez le fichier."
      />
    );
  }

  const effectiveKind: PreviewKind =
    resolvePreviewKind(state.blobType || doc.mime_type, doc.file_name) || kind;
  const shell = expanded
    ? "min-h-[min(78dvh,780px)] max-h-[min(82dvh,820px)]"
    : maxHeightClass;

  if (effectiveKind === "image" && state.src) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200/70 bg-zinc-950/5 ${shell} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.src} alt={doc.titre} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (effectiveKind === "pdf" && state.src) {
    const pdfFrame = expanded
      ? "h-[min(82dvh,820px)] min-h-[min(70dvh,640px)]"
      : `${maxHeightClass} min-h-[280px]`;
    return (
      <iframe
        src={state.src}
        title={doc.titre}
        className={`block w-full rounded-xl border border-slate-200/70 bg-zinc-900 ${pdfFrame} ${className}`}
      />
    );
  }

  if (effectiveKind === "text" && state.text != null) {
    return (
      <pre
        className={`overflow-auto rounded-2xl border border-slate-200/70 bg-white p-4 text-left text-xs leading-relaxed text-zinc-800 ${shell} ${className}`}
      >
        {state.text}
      </pre>
    );
  }

  if (effectiveKind === "audio" && state.src) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-slate-200/70 bg-zinc-50 px-6 py-10 ${className}`}
      >
        <audio controls src={state.src} className="w-full max-w-lg">
          Lecteur audio non supporte.
        </audio>
      </div>
    );
  }

  if (effectiveKind === "video" && state.src) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200/70 bg-zinc-950 ${shell} ${className}`}
      >
        <video controls src={state.src} className="max-h-full max-w-full">
          Lecteur video non supporte.
        </video>
      </div>
    );
  }

  if (state.src) {
    return (
      <iframe
        src={state.src}
        title={doc.titre}
        className={`block w-full rounded-xl border border-slate-200/70 bg-white ${shell} min-h-[280px] ${className}`}
      />
    );
  }

  return (
    <FallbackDownload
      doc={doc}
      className={className}
      hint={
        isOffice
          ? "Document bureautique — ouvrez l'editeur Collabora / OnlyOffice pour visualiser et modifier."
          : "Apercu navigateur limite pour ce format. Telechargez le fichier."
      }
    />
  );
}

function FallbackDownload({
  doc,
  className,
  hint,
}: {
  doc: Pick<Document, "id" | "titre" | "file_name">;
  className?: string;
  hint: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-zinc-50/80 px-6 py-10 text-center ${className}`}
    >
      <FileText className="h-10 w-10 text-zinc-400" weight="duotone" />
      <p className="max-w-sm text-sm text-zinc-600">{hint}</p>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        type="button"
        onClick={() => void downloadDocumentFile(doc.id, doc.file_name || doc.titre)}
      >
        <DownloadSimple className="h-4 w-4" />
        Telecharger
      </Button>
    </div>
  );
}

export function isInlinePreviewable(mime?: string, fileName?: string) {
  return isBrowserPreviewableCompat(mime, fileName);
}

function isBrowserPreviewableCompat(mime?: string, fileName?: string) {
  const k = resolvePreviewKind(mime, fileName);
  return k === "image" || k === "pdf" || k === "text" || k === "audio" || k === "video";
}
