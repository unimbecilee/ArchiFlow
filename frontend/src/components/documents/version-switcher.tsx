"use client";

import { useEffect, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { DocumentVersion } from "@/types/collaboration";
import {
  versionDownloadUrl,
  versionPreviewUrl,
} from "@/services/collaboration.service";
import api from "@/lib/api";
import { fetchAuthenticated, readFetchError } from "@/lib/fetch-auth";
import { resolvePreviewKind } from "@/lib/preview-kind";

export type VersionSelection =
  | { kind: "current"; versionNumber: number }
  | { kind: "archive"; version: DocumentVersion };

type VersionSwitcherProps = {
  docId: number;
  currentVersionNumber: number;
  rejectedAtVersion?: number | null;
  versions: DocumentVersion[];
  selection: VersionSelection;
  onSelect: (sel: VersionSelection) => void;
};

export function VersionSwitcher({
  docId,
  currentVersionNumber,
  rejectedAtVersion,
  versions,
  selection,
  onSelect,
}: VersionSwitcherProps) {
  const sorted = [...versions].sort(
    (a, b) => b.version_number - a.version_number,
  );
  const isCurrentSelected = selection.kind === "current";

  const handleDownload = async () => {
    let path: string;
    let name: string;
    if (selection.kind === "current") {
      path = `/api/documents/${docId}/download`;
      name = `document-v${currentVersionNumber}`;
    } else {
      path = versionDownloadUrl(docId, selection.version.id);
      name = selection.version.file_name;
    }
    const base = api.defaults.baseURL || "";
    const res = await fetchAuthenticated(`${base}${path}`);
    if (!res.ok) throw new Error(await readFetchError(res));
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onSelect({ kind: "current", versionNumber: currentVersionNumber })
          }
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            isCurrentSelected
              ? "bg-primary text-white"
              : "bg-muted text-foreground hover:bg-muted"
          }`}
        >
          v{currentVersionNumber} (courante)
          {rejectedAtVersion === currentVersionNumber && (
            <span className="ml-1.5 text-xs opacity-90">rejetee</span>
          )}
        </button>
        {sorted.map((v) => {
          const selected =
            selection.kind === "archive" && selection.version.id === v.id;
          const isRejected = rejectedAtVersion === v.version_number;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect({ kind: "archive", version: v })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-primary text-white"
                  : "bg-muted text-foreground hover:bg-muted"
              }`}
            >
              v{v.version_number}
              {isRejected && (
                <span
                  className={`ml-1.5 text-xs ${selected ? "opacity-90" : "text-destructive"}`}
                >
                  rejetee
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={handleDownload}
      >
        <DownloadSimple className="h-4 w-4" />
        Telecharger cette version
      </Button>
    </div>
  );
}

export function VersionPreviewPane({
  docId,
  docMime,
  selection,
}: {
  docId: number;
  docMime?: string;
  selection: VersionSelection;
}) {
  if (selection.kind === "current") {
    return null;
  }
  return (
    <ArchivedVersionPreview
      docId={docId}
      versionId={selection.version.id}
      mime={selection.version.mime_type || docMime}
      title={selection.version.file_name}
    />
  );
}

function ArchivedVersionPreview({
  docId,
  versionId,
  mime,
  title,
}: {
  docId: number;
  versionId: number;
  mime?: string;
  title: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let objectUrl: string | null = null;
    setSrc(null);
    setText(null);
    setFailed(false);

    const base = api.defaults.baseURL || "";
    void fetchAuthenticated(`${base}${versionPreviewUrl(docId, versionId)}`, {
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await readFetchError(r));
        const blob = await r.blob();
        const type = blob.type || mime || "";
        const kind = resolvePreviewKind(type, title);
        if (
          kind === "text" ||
          type.startsWith("text/") ||
          type === "application/json"
        ) {
          const t = await blob.text();
          if (!ac.signal.aborted) setText(t);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        if (ac.signal.aborted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!ac.signal.aborted) setFailed(true);
      });

    return () => {
      ac.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, versionId, mime, title]);

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground">
        Apercu indisponible pour ce type. Utilisez telecharger.
      </p>
    );
  }
  if (text != null) {
    return (
      <pre className="max-h-[40vh] overflow-auto rounded-lg border border-border bg-card p-3 text-xs text-foreground">
        {text}
      </pre>
    );
  }
  if (!src) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement apercu version...
      </p>
    );
  }
  if (
    mime?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(title)
  ) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        className="mx-auto max-h-[40vh] max-w-full rounded-lg"
      />
    );
  }
  if (mime === "application/pdf" || title.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        src={src}
        title={title}
        className="h-[40vh] w-full rounded-lg border-0"
      />
    );
  }
  if (mime?.startsWith("audio/")) {
    return <audio controls src={src} className="w-full" />;
  }
  if (mime?.startsWith("video/")) {
    return (
      <video
        controls
        src={src}
        className="mx-auto max-h-[40vh] max-w-full rounded-lg"
      />
    );
  }
  return (
    <iframe
      src={src}
      title={title}
      className="h-[40vh] w-full rounded-lg border border-border"
    />
  );
}
