"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadSimple,
  ArrowLeft,
  FileText,
  FolderOpen,
  X,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { FolderPicker } from "@/components/documents/folder-picker";
import {
  displayPath,
  fileRelativePath,
  MAX_IMPORT_FILES,
  MAX_IMPORT_FILE_MB,
} from "@/lib/upload-accept";
import { filesFromDataTransfer, resolveFolderTargets } from "@/lib/folder-upload";
import { MAX_RESUMABLE_FILE_GB } from "@/lib/upload-limits";
import { getApiErrorMessage } from "@/lib/api-error";
import { uploadDocuments } from "@/services/documents.service";

type QueuedFile = {
  id: string;
  file: File;
  titre: string;
  relativePath: string | null;
};

function formatBytes(size: number): string {
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function queueId(file: File): string {
  const rel = fileRelativePath(file);
  return rel ? `${rel}-${file.size}-${file.lastModified}` : `${file.name}-${file.size}-${file.lastModified}`;
}

function mergeFiles(existing: QueuedFile[], incoming: File[]): QueuedFile[] {
  const map = new Map(existing.map((q) => [q.id, q]));
  for (const file of incoming) {
    const id = queueId(file);
    if (!map.has(id)) {
      const rel = fileRelativePath(file);
      const baseName = file.name.replace(/\.[^.]+$/, "") || file.name;
      map.set(id, {
        id,
        file,
        titre: baseName,
        relativePath: rel,
      });
    }
  }
  return Array.from(map.values()).slice(0, MAX_IMPORT_FILES);
}

function ImporterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFolder = searchParams.get("folder_id") ?? searchParams.get("folder") ?? "";

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [description, setDescription] = useState("");
  const [typeDocument, setTypeDocument] = useState("Document");
  const [folderId, setFolderId] = useState(initialFolder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    name: "",
    bytesUploaded: 0,
    bytesTotal: 0,
  });
  const [lastResults, setLastResults] = useState<
    Array<{ name: string; ok: boolean; error?: string }>
  >([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const totalSize = useMemo(
    () => queue.reduce((sum, q) => sum + q.file.size, 0),
    [queue]
  );

  const backHref =
    folderId && folderId !== "0"
      ? `/mes-documents?folder=${folderId}`
      : "/mes-documents";

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setLastResults([]);
    setQueue((prev) => {
      const merged = mergeFiles(prev, files);
      if (merged.length >= MAX_IMPORT_FILES && prev.length < MAX_IMPORT_FILES) {
        setError(`Maximum ${MAX_IMPORT_FILES} fichiers par import.`);
      }
      return merged;
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const files = await filesFromDataTransfer(e.dataTransfer);
      addFiles(files);
    } catch {
      setError("Impossible de lire le depot.");
    }
  };

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const updateTitre = (id: string, titre: string) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, titre } : q)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queue.length === 0) {
      setError("Ajoutez au moins un fichier");
      return;
    }
    setLoading(true);
    setError(null);
    setLastResults([]);
    setProgress({ done: 0, total: queue.length, name: "", bytesUploaded: 0, bytesTotal: 0 });

    try {
      const baseFolderId = folderId ? Number(folderId) : null;
      const folderMap = await resolveFolderTargets(
        queue.map((q) => q.file),
        baseFolderId
      );

      const results = await uploadDocuments(
        queue.map((q) => ({
          file: q.file,
          titre: q.titre,
          folder_id: folderMap.get(q.file) ?? baseFolderId,
        })),
        {
          description,
          type_document: typeDocument,
          folder_id: folderId ? Number(folderId) : null,
        },
        (p) =>
          setProgress({
            done: p.done,
            total: p.total,
            name: p.currentName,
            bytesUploaded: p.bytesUploaded ?? 0,
            bytesTotal: p.bytesTotal ?? 0,
          })
      );

      const summary = results.map((r) => ({
        name: r.file.name,
        ok: !!r.document,
        error: r.error,
      }));
      setLastResults(summary);

      const failed = summary.filter((s) => !s.ok);
      if (failed.length === 0) {
        router.push(
          folderId && folderId !== "0"
            ? `/mes-documents?folder=${folderId}`
            : "/mes-documents"
        );
        return;
      }
      if (failed.length < summary.length) {
        setError(
          `${summary.length - failed.length} importe(s), ${failed.length} echec(s). Voir liste.`
        );
        setQueue((prev) =>
          prev.filter((q) => failed.some((f) => f.name === q.file.name))
        );
      } else {
        setError("Aucun fichier importe. Verifiez formats et taille.");
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Echec import"));
    } finally {
      setLoading(false);
    }
  };

  const progressPct =
    progress.bytesTotal > 0
      ? Math.round((progress.bytesUploaded / progress.bytesTotal) * 100)
      : progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;

  return (
    <PageFrame className="max-w-4xl">
      <PageHeader
        eyebrow="Documents"
        title="Importer"
        description="Depot de fichiers ou dossiers entiers — tous formats (video, audio, archives…)."
        icon={<UploadSimple className="h-6 w-6" weight="duotone" />}
        actions={
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />

      <PagePanel
        title="Import par lot"
        subtitle={`Jusqu'a ${MAX_IMPORT_FILES} fichiers · tous types · ${MAX_IMPORT_FILE_MB} Mo (HTTP) ou ${MAX_RESUMABLE_FILE_GB} Go (MPU).`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => void handleDrop(e)}
            className={`rounded-3xl border-2 border-dashed p-6 transition-colors ${
              dragOver
                ? "border-emerald-500 bg-emerald-50/70"
                : "border-slate-200 bg-gradient-to-br from-white to-zinc-50"
            }`}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
                <UploadSimple className="h-6 w-6" weight="duotone" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  Glissez fichiers ou dossiers, ou parcourez
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Video, audio, images, archives, Office — structure des dossiers preservee.
                </p>
              </div>
              <input
                ref={inputRef}
                id="files"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
              <input
                ref={folderInputRef}
                id="folders"
                type="file"
                multiple
                className="hidden"
                {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  Choisir fichiers
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FolderOpen className="h-4 w-4" />
                  Choisir dossier
                </Button>
              </div>
            </div>
          </motion.div>

          {loading && progress.total > 0 && (
            <div className="space-y-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
              <div className="flex justify-between text-xs font-medium text-zinc-700">
                <span>
                  Envoi {progress.done}/{progress.total}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <motion.div
                  className="h-full rounded-full bg-emerald-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 22 }}
                />
              </div>
              {progress.name && (
                <p className="truncate text-xs text-zinc-600">
                  {progress.name}
                  {progress.bytesTotal > 0
                    ? ` · ${formatBytes(progress.bytesUploaded)} / ${formatBytes(progress.bytesTotal)}`
                    : ""}
                </p>
              )}
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {queue.length > 0 && (
              <motion.ul
                className="max-h-72 space-y-2 overflow-y-auto pr-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {queue.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="shrink-0 rounded-xl bg-zinc-100 p-2">
                        <FileText className="h-4 w-4 text-zinc-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {displayPath(item.file)}
                        </p>
                        <p className="text-xs text-zinc-500">{formatBytes(item.file.size)}</p>
                      </div>
                    </div>
                    <Input
                      value={item.titre}
                      onChange={(e) => updateTitre(item.id, e.target.value)}
                      placeholder="Titre"
                      className="h-9 sm:max-w-[14rem]"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-zinc-500"
                      disabled={loading}
                      onClick={() => removeFile(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {queue.length > 0 && (
            <p className="text-xs text-zinc-600">
              {queue.length} fichier(s) · {formatBytes(totalSize)} au total
              {queue.length >= MAX_IMPORT_FILES ? ` · limite ${MAX_IMPORT_FILES} atteinte` : ""}
            </p>
          )}

          {lastResults.length > 0 && (
            <ul className="space-y-1 rounded-2xl border border-slate-200 bg-zinc-50 p-3 text-sm">
              {lastResults.map((r) => (
                <li key={r.name} className="flex items-start gap-2">
                  {r.ok ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" weight="fill" />
                  ) : (
                    <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" weight="fill" />
                  )}
                  <span className={r.ok ? "text-zinc-700" : "text-red-700"}>
                    {r.name}
                    {r.error ? ` — ${r.error}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description (commune)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contexte du lot"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Categorie (commune)</Label>
                <Input
                  id="type"
                  value={typeDocument}
                  onChange={(e) => setTypeDocument(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-zinc-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Destination
              </p>
              <FolderPicker value={folderId} onChange={setFolderId} />
            </div>
          </div>

          {error && <ErrorBanner message={error} />}
          <Button type="submit" disabled={loading || queue.length === 0} className="h-11 w-full">
            {loading
              ? `Import ${progress.done}/${progress.total}...`
              : queue.length <= 1
                ? "Importer document"
                : `Importer ${queue.length} fichiers`}
          </Button>
        </form>
      </PagePanel>
    </PageFrame>
  );
}

export default function ImporterPage() {
  return (
    <Suspense
      fallback={
        <PageFrame className="max-w-3xl">
          <p className="text-sm text-zinc-500">Chargement...</p>
        </PageFrame>
      }
    >
      <ImporterForm />
    </Suspense>
  );
}
