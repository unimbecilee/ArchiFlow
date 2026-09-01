"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  FileArchive,
  FileImage,
  FileText,
  FileXls,
  Folder,
  FolderPlus,
  MagnifyingGlass,
  ShareNetwork,
  Star,
  Trash,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyDocs,
  EmptySearch,
  ErrorState,
  SkeletonDocuments,
} from "@/components/states";
import { getDashboardStats } from "@/services/dashboard.service";
import {
  createFolder,
  deleteDocument,
  getFolderBreadcrumb,
  getFolders,
  getMyDocuments,
  restoreDocument,
} from "@/services/documents.service";
import { pluralFr } from "@/lib/fr";
import { addFavorite, getFavorites, removeFavorite } from "@/services/favorites.service";
import { getLastCorrelationId } from "@/lib/api";
import { documentBadge } from "@/lib/document-badge";
import { FILE_KIND_STYLE, kindFromName, type FileKind } from "@/lib/file-kind";
import { formatBytes, formatRelativeFr } from "@/lib/format-bytes";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { Document, Folder as FolderType } from "@/types/documents";

const KIND_ICON: Record<FileKind, typeof FileText> = {
  folder: Folder,
  pdf: FileText,
  doc: FileText,
  sheet: FileXls,
  image: FileImage,
  archive: FileArchive,
};

type VaultRow =
  | {
      key: string;
      kind: "folder";
      folder: FolderType;
      name: string;
      owner: string;
      updatedAt: string;
      size: number;
      favorite: boolean;
      shared: boolean;
    }
  | {
      key: string;
      kind: "file";
      doc: Document;
      fileKind: FileKind;
      name: string;
      owner: string;
      updatedAt: string;
      size: number;
      favorite: boolean;
      shared: boolean;
      badge?: { label: string; tone: "amber" | "sky" | "emerald" };
    };

function parseFolderParam(raw: string | null): number | null {
  if (!raw || raw === "null" || raw === "0") return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function DocumentsVaultView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = parseFolderParam(searchParams.get("folder"));
  const queryClient = useQueryClient();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [dragging, setDragging] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [favoriteIds, setFavoriteIds] = React.useState<Set<number>>(new Set());

  const foldersQuery = useQuery({
    queryKey: ["vault-folders", folderId],
    queryFn: () => getFolders(folderId),
  });
  const docsQuery = useQuery({
    queryKey: ["vault-docs", folderId],
    queryFn: () => getMyDocuments(folderId),
  });
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });
  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
  });
  const crumbQuery = useQuery({
    queryKey: ["vault-breadcrumb", folderId],
    queryFn: () => getFolderBreadcrumb(folderId!),
    enabled: folderId != null,
  });

  React.useEffect(() => {
    if (favoritesQuery.data) {
      setFavoriteIds(new Set(favoritesQuery.data.map((d) => d.id)));
    }
  }, [favoritesQuery.data]);

  const loading = foldersQuery.isPending || docsQuery.isPending;
  const error = foldersQuery.isError || docsQuery.isError;
  const folders = foldersQuery.data ?? [];
  const documents = docsQuery.data?.documents ?? [];

  const rows = React.useMemo<VaultRow[]>(() => {
    const folderRows: VaultRow[] = folders.map((folder) => ({
      key: `folder-${folder.id}`,
      kind: "folder",
      folder,
      name: folder.name,
      owner: "Dossier",
      updatedAt: formatRelativeFr(folder.created_at),
      size: 0,
      favorite: false,
      shared: false,
    }));
    const fileRows: VaultRow[] = documents.map((doc) => ({
      key: `doc-${doc.id}`,
      kind: "file",
      doc,
      fileKind: kindFromName(doc.file_name || doc.titre, doc.mime_type),
      name: doc.titre,
      owner: "Vous",
      updatedAt: formatRelativeFr(doc.derniere_modification || doc.date_creation),
      size: doc.taille ?? 0,
      favorite: favoriteIds.has(doc.id),
      shared: false,
      badge: documentBadge(doc),
    }));
    return [...folderRows, ...fileRows];
  }, [folders, documents, favoriteIds]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q) ||
        (row.kind === "file" && row.badge?.label.toLowerCase().includes(q))
    );
  }, [rows, query]);

  const pending = statsQuery.data?.workflows_pending ?? 0;
  const folderCrumbs = crumbQuery.data ?? [];
  const isEmpty = !loading && !error && rows.length === 0 && !query;

  function navigateFolder(id: number | null) {
    router.push(id == null ? "/mes-documents" : `/mes-documents?folder=${id}`);
  }

  function openUploader() {
    window.dispatchEvent(new CustomEvent("archiflow:open-uploader"));
  }

  function refetchAll() {
    void foldersQuery.refetch();
    void docsQuery.refetch();
    void statsQuery.refetch();
    void favoritesQuery.refetch();
  }

  async function toggleFav(docId: number) {
    const was = favoriteIds.has(docId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (was) next.delete(docId);
      else next.add(docId);
      return next;
    });
    try {
      if (was) await removeFavorite(docId);
      else await addFavorite(docId);
      toast.success(was ? "Retiré des favoris" : "Ajouté aux favoris", {
        action: {
          label: "Annuler",
          onClick: () => {
            void (was ? addFavorite(docId) : removeFavorite(docId));
            setFavoriteIds((prev) => {
              const next = new Set(prev);
              if (was) next.add(docId);
              else next.delete(docId);
              return next;
            });
          },
        },
      });
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (was) next.add(docId);
        else next.delete(docId);
        return next;
      });
      toast.error("Impossible de mettre à jour le favori");
    }
  }

  async function removeSelected() {
    const ids = [...selected]
      .filter((key) => key.startsWith("doc-"))
      .map((key) => Number(key.replace("doc-", "")));
    if (!ids.length) return;
    const snapshot = documents;
    queryClient.setQueryData(["vault-docs", folderId], (prev: { documents: Document[] } | undefined) =>
      prev ? { ...prev, documents: prev.documents.filter((d) => !ids.includes(d.id)) } : prev
    );
    setSelected(new Set());
    try {
      await Promise.all(ids.map((id) => deleteDocument(id)));
      toast.success(
        `${ids.length} élément${ids.length > 1 ? "s" : ""} déplacé${ids.length > 1 ? "s" : ""} vers la corbeille`,
        {
          description: "Restauration possible 30 jours",
          action: {
            label: "Annuler",
            onClick: () => {
              void Promise.all(ids.map((id) => restoreDocument(id))).then(() => refetchAll());
            },
          },
        }
      );
    } catch {
      queryClient.setQueryData(["vault-docs", folderId], { documents: snapshot });
      toast.error("Suppression impossible");
    }
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const fileRows = filtered.filter((row) => row.kind === "file");
  const allChecked = fileRows.length > 0 && fileRows.every((row) => selected.has(row.key));

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === fileRows.length ? new Set() : new Set(fileRows.map((row) => row.key))
    );
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) return;
    setCreating(true);
    try {
      await createFolder({ name: folderName.trim(), parent_id: folderId });
      setFolderName("");
      setCreateOpen(false);
      toast.success("Dossier créé", { description: folderName.trim() });
      refetchAll();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Création impossible"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/88 px-5 py-5 shadow-sm backdrop-blur-[6px] dark:border-zinc-800 dark:bg-zinc-900/88 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
              Espace documentaire
            </p>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
                <Folder className="h-5 w-5" weight="fill" />
              </span>
              <h1 className="text-[24px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-[26px]">Mes documents</h1>
            </div>
          {folderId != null && folderCrumbs.length > 0 ? (
            <nav
              className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500"
              aria-label="Dossier"
            >
              <button
                type="button"
                onClick={() => navigateFolder(null)}
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-white hover:text-zinc-900 hover:shadow-sm"
              >
                Racine
              </button>
              {folderCrumbs.map((crumb) => (
                <span key={crumb.id} className="flex items-center gap-1.5">
                  <span className="text-zinc-300">/</span>
                  <button
                    type="button"
                    onClick={() => navigateFolder(crumb.id)}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 transition-colors",
                      crumb.id === folderId
                        ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                        : "hover:bg-white hover:text-zinc-900 hover:shadow-sm"
                    )}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>
          ) : (
            <p className="mt-1.5 max-w-[60ch] text-sm font-medium leading-relaxed text-zinc-600">
              Dossiers et fichiers de votre espace. Le fond habille les goulottes, vos cartes restent nettes.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)} className="h-9">
            <FolderPlus /> Nouveau dossier
          </Button>
          <Button variant="primary" size="sm" onClick={openUploader} className="h-9 shadow-sm shadow-emerald-600/20">
            <UploadSimple /> Importer
          </Button>
        </div>
      </div>
      </div>

      <div className="mt-4 space-y-3 pb-16">
        {pending > 0 && (
          <Link
            href="/workflows/approbations"
            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 hover:bg-amber-100/80"
          >
            <Warning className="h-4 w-4 shrink-0" weight="duotone" />
            <span className="font-medium">
              {pluralFr(pending, "approbation en attente", "approbations en attente")}
            </span>
            <span className="ml-auto text-xs font-medium text-amber-800">Traiter →</span>
          </Link>
        )}

        {loading && <SkeletonDocuments rows={8} />}

        {error && (
          <ErrorState
            correlationId={getLastCorrelationId()}
            onRetry={refetchAll}
          />
        )}

        {isEmpty && <EmptyDocs onImport={openUploader} />}

        {!loading && !error && !isEmpty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer par nom…"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {filtered.length === 0 ? (
              <EmptySearch query={query} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label="Tout sélectionner"
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      allChecked
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-zinc-300 bg-white hover:border-emerald-500"
                    )}
                  >
                    {allChecked && <Check className="h-3 w-3" weight="bold" />}
                  </button>
                  <p className="text-xs font-medium text-zinc-500">
                    {selected.size > 0
                      ? pluralFr(selected.size, "sélectionné")
                      : pluralFr(filtered.length, "élément")}
                  </p>
                </div>

                <motion.ul
                  layout
                  className="divide-y divide-zinc-100"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    openUploader();
                  }}
                >
                  <AnimatePresence initial={false}>
                    {filtered.map((row, i) => (
                      <VaultRowItem
                        key={row.key}
                        row={row}
                        index={i}
                        checked={selected.has(row.key)}
                        onToggle={() => row.kind === "file" && toggleSelect(row.key)}
                        onOpen={() => {
                          if (row.kind === "folder") navigateFolder(row.folder.id);
                          else router.push(`/documents/${row.doc.id}`);
                        }}
                        onToggleFav={() => row.kind === "file" && void toggleFav(row.doc.id)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.ul>

                {dragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pointer-events-none flex items-center justify-center gap-2 border-t-2 border-dashed border-emerald-400 bg-emerald-50/60 py-6 text-sm font-medium text-emerald-700"
                  >
                    <UploadSimple className="h-4 w-4" />
                    Déposez les fichiers pour lancer l’import
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10"
          >
            <span className="px-2.5 text-sm font-medium text-zinc-700">
              {pluralFr(selected.size, "sélectionné")}
            </span>
            <Button variant="ghost" size="sm" onClick={() => router.push("/documents-partages")}>
              <ShareNetwork /> Partager
            </Button>
            <Button variant="danger" size="sm" onClick={() => void removeSelected()}>
              <Trash /> Supprimer
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelected(new Set())}
              aria-label="Annuler la sélection"
            >
              <X />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="vaultFolderName">Nom du dossier</Label>
            <Input
              id="vaultFolderName"
              placeholder="Ex. Contrats 2026"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFolder();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreateFolder()} disabled={creating || !folderName.trim()}>
              <FolderPlus /> Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VaultRowItem({
  row,
  index,
  checked,
  onToggle,
  onOpen,
  onToggleFav,
}: {
  row: VaultRow;
  index: number;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onToggleFav: () => void;
}) {
  const fileKind = row.kind === "folder" ? "folder" : row.fileKind;
  const Icon = KIND_ICON[fileKind];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3), ease: "easeOut" }}
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50",
        checked && "bg-emerald-50/50"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={checked ? "Désélectionner" : "Sélectionner"}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          row.kind === "folder" && "invisible",
          checked
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-zinc-300 bg-white opacity-0 group-hover:opacity-100 hover:border-emerald-500"
        )}
      >
        {checked && <Check className="h-3 w-3" weight="bold" />}
      </button>

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
            FILE_KIND_STYLE[fileKind]
          )}
        >
          <Icon className="h-4 w-4" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-zinc-900">{row.name}</p>
            {row.kind === "file" && row.badge && (
              <Badge tone={row.badge.tone} className="shrink-0">
                {row.badge.tone === "amber" && <Warning />}
                {row.badge.label}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-400">
            {row.owner} · {row.updatedAt}
          </p>
        </div>
      </button>

      {row.shared && (
        <span className="hidden shrink-0 text-zinc-300 sm:block" title="Partagé">
          <ShareNetwork className="h-4 w-4" />
        </span>
      )}

      <span className="tnum hidden w-16 shrink-0 text-right text-xs text-zinc-400 sm:block">
        {formatBytes(row.size)}
      </span>

      {row.kind === "file" && (
        <button
          type="button"
          onClick={onToggleFav}
          aria-label={row.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={cn(
            "shrink-0 rounded-md p-1.5 transition-colors",
            row.favorite
              ? "text-amber-500 hover:bg-amber-50"
              : "text-zinc-300 opacity-0 hover:bg-zinc-100 hover:text-amber-500 group-hover:opacity-100"
          )}
        >
          <Star className={cn("h-4 w-4", row.favorite && "fill-amber-400 text-amber-400")} weight={row.favorite ? "fill" : "regular"} />
        </button>
      )}
    </motion.li>
  );
}
