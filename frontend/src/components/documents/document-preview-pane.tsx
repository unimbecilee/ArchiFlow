"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, FileText, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Document } from "@/types/documents";
import { downloadDocumentFile, previewUrl } from "@/services/documents.service";
import { fetchAuthenticated, readFetchError } from "@/lib/fetch-auth";
import { resolvePreviewKind, type PreviewKind } from "@/lib/preview-kind";

type Props = {
  doc: Pick<
    Document,
    | "id"
    | "titre"
    | "mime_type"
    | "file_name"
    | "previewable"
    | "office_editable"
  >;
  className?: string;
  maxHeightClass?: string;
  expanded?: boolean;
  /** Rendu alternatif pour les docs office (Collabora / OnlyOffice). */
  officeSlot?: React.ReactNode;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; src: string; blobType: string; text?: string }
  | { status: "error"; message: string; storageMissing?: boolean };

function isStorageMissingMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("stockage") ||
    m.includes("introuvable") ||
    m.includes("nosuchkey") ||
    m.includes("not found")
  );
}

export function DocumentPreviewPane({
  doc,
  className = "",
  maxHeightClass = "max-h-[min(52vh,520px)]",
  expanded = false,
  officeSlot,
}: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const kind = resolvePreviewKind(doc.mime_type, doc.file_name);
  const isOffice = kind === "office";

  useEffect(() => {
    if (isOffice && officeSlot) {
      setState({ status: "ready", src: "", blobType: doc.mime_type || "" });
      return;
    }

    // Office sans editeur : message dedie, pas de fetch binaire inutile.
    if (isOffice && !officeSlot) {
      setState({
        status: "error",
        message:
          "Document bureautique — activez Collabora / OnlyOffice pour l'apercu en ligne, ou telechargez le fichier.",
      });
      return;
    }

    const ac = new AbortController();
    let objectUrl: string | null = null;
    setState({ status: "loading" });

    void (async () => {
      try {
        const r = await fetchAuthenticated(previewUrl(doc.id), {
          signal: ac.signal,
        });
        if (!r.ok) {
          const message = await readFetchError(r);
          if (ac.signal.aborted) return;
          setState({
            status: "error",
            message,
            storageMissing:
              r.status === 404 || isStorageMissingMessage(message),
          });
          return;
        }
        const blob = await r.blob();
        if (ac.signal.aborted) return;
        const blobType = blob.type || doc.mime_type || "";
        const resolved = resolvePreviewKind(blobType, doc.file_name);

        if (
          resolved === "text" ||
          blobType.startsWith("text/") ||
          blobType === "application/json" ||
          blobType === "application/xml" ||
          blobType === "application/javascript"
        ) {
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
      } catch (err: unknown) {
        if (ac.signal.aborted) return;
        setState({
          status: "error",
          message:
            err instanceof Error ? err.message : "Impossible de charger l'apercu",
        });
      }
    })();

    return () => {
      ac.abort();
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
        className={`animate-pulse rounded-2xl border border-border bg-muted ${maxHeightClass} min-h-[200px] w-full ${className}`}
        aria-hidden
      />
    );
  }

  if (state.status === "error") {
    return (
      <FallbackDownload
        doc={doc}
        className={className}
        storageMissing={state.storageMissing}
        hint={
          state.storageMissing
            ? "Fichier absent du stockage (MinIO). Reimportez le document pour restaurer l'apercu."
            : state.message ||
              "Impossible de charger l'apercu. Telechargez le fichier."
        }
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
        className={`flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/30 ${shell} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.src}
          alt={doc.titre}
          className="max-h-full max-w-full object-contain"
        />
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
        className={`block w-full rounded-xl border border-border bg-card ${pdfFrame} ${className}`}
      />
    );
  }

  if (effectiveKind === "text" && state.text != null) {
    return (
      <pre
        className={`overflow-auto rounded-2xl border border-border bg-card p-4 text-left text-xs leading-relaxed text-foreground ${shell} ${className}`}
      >
        {state.text}
      </pre>
    );
  }

  if (effectiveKind === "audio" && state.src) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-border bg-muted px-6 py-10 ${className}`}
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
        className={`flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-background ${shell} ${className}`}
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
        className={`block w-full rounded-xl border border-border bg-card ${shell} min-h-[280px] ${className}`}
      />
    );
  }

  return (
    <FallbackDownload
      doc={doc}
      className={className}
      hint="Apercu navigateur limite pour ce format. Telechargez le fichier."
    />
  );
}

function FallbackDownload({
  doc,
  className,
  hint,
  storageMissing,
}: {
  doc: Pick<Document, "id" | "titre" | "file_name">;
  className?: string;
  hint: string;
  storageMissing?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/60 px-6 py-10 text-center ${className}`}
    >
      {storageMissing ? (
        <WarningCircle
          className="h-10 w-10 text-destructive"
          weight="duotone"
        />
      ) : (
        <FileText className="h-10 w-10 text-muted-foreground" weight="duotone" />
      )}
      <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
      {!storageMissing && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          type="button"
          onClick={() =>
            void downloadDocumentFile(doc.id, doc.file_name || doc.titre)
          }
        >
          <DownloadSimple className="h-4 w-4" />
          Telecharger
        </Button>
      )}
    </div>
  );
}

export function isInlinePreviewable(mime?: string, fileName?: string) {
  return isBrowserPreviewableCompat(mime, fileName);
}

function isBrowserPreviewableCompat(mime?: string, fileName?: string) {
  const k = resolvePreviewKind(mime, fileName);
  return (
    k === "image" ||
    k === "pdf" ||
    k === "text" ||
    k === "audio" ||
    k === "video"
  );
}
