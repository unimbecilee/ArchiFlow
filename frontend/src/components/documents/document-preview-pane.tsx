"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, FileText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Document } from "@/types/documents";
import { downloadDocumentFile, previewUrl } from "@/services/documents.service";
import { getAccessToken } from "@/lib/session-tokens";

type Props = {
  doc: Pick<Document, "id" | "titre" | "mime_type" | "file_name" | "previewable">;
  className?: string;
  maxHeightClass?: string;
  /** Modal plein ecran : PDF/image utilisent toute la zone utile */
  expanded?: boolean;
};

export function DocumentPreviewPane({
  doc,
  className = "",
  maxHeightClass = "max-h-[min(52vh,520px)]",
  expanded = false,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    setFailed(false);
    setSrc(null);

    const token = getAccessToken();
    fetch(previewUrl(doc.id), {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error("preview failed");
        return r.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setFailed(true));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id]);

  const mime = doc.mime_type ?? "";
  const canInline = mime.startsWith("image/") || mime === "application/pdf";

  if (failed || doc.previewable === false) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-zinc-50/80 px-6 py-10 text-center ${className}`}
      >
        <FileText className="h-10 w-10 text-zinc-400" weight="duotone" />
        <p className="text-sm text-zinc-600">
          Apercu indisponible pour ce format. Telechargez le fichier pour le verifier avant validation.
        </p>
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

  if (!src) {
    return (
      <div
        className={`animate-pulse rounded-2xl border border-slate-200/70 bg-zinc-100/80 ${maxHeightClass} min-h-[200px] w-full ${className}`}
        aria-hidden
      />
    );
  }

  if (mime.startsWith("image/")) {
    const imageShell = expanded
      ? "min-h-[min(78dvh,780px)] max-h-[min(82dvh,820px)]"
      : maxHeightClass;
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200/70 bg-zinc-950/5 ${imageShell} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={doc.titre}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (mime === "application/pdf") {
    const pdfFrame = expanded
      ? "h-[min(82dvh,820px)] min-h-[min(70dvh,640px)]"
      : `${maxHeightClass} min-h-[280px]`;
    return (
      <iframe
        src={src}
        title={doc.titre}
        className={`block w-full rounded-xl border border-slate-200/70 bg-zinc-900 ${pdfFrame} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-zinc-50/80 px-6 py-8 text-center ${className}`}
    >
      <p className="text-sm text-zinc-600">
        Type non previsualisable ({mime || "inconnu"}). Telechargez pour verifier le contenu.
      </p>
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

export function isInlinePreviewable(mime?: string) {
  return !!mime && (mime.startsWith("image/") || mime === "application/pdf");
}
