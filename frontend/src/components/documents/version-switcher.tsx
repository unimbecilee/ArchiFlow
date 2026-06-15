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
import { getAccessToken } from "@/lib/session-tokens";

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
  const sorted = [...versions].sort((a, b) => b.version_number - a.version_number);
  const isCurrentSelected = selection.kind === "current";

  const handleDownload = async () => {
    const token = getAccessToken();
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
    const res = await fetch(`${base}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
          onClick={() => onSelect({ kind: "current", versionNumber: currentVersionNumber })}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            isCurrentSelected
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
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
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              v{v.version_number}
              {isRejected && (
                <span className={`ml-1.5 text-xs ${selected ? "opacity-90" : "text-red-600"}`}>
                  rejetee
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
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

  useEffect(() => {
    const token = getAccessToken();
    const base = api.defaults.baseURL || "";
    fetch(`${base}${versionPreviewUrl(docId, versionId)}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => setSrc(URL.createObjectURL(blob)))
      .catch(() => setSrc(null));
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, versionId]);

  if (!src) {
    return <p className="text-sm text-zinc-500">Chargement apercu version...</p>;
  }
  if (mime?.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={title} className="mx-auto max-h-[40vh] max-w-full rounded-lg" />
    );
  }
  if (mime === "application/pdf") {
    return <iframe src={src} title={title} className="h-[40vh] w-full rounded-lg border-0" />;
  }
  return (
    <p className="text-sm text-zinc-600">
      Apercu indisponible pour ce type. Utilisez telecharger.
    </p>
  );
}
