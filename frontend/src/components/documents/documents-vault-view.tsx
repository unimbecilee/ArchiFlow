"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const docsQuery = useInfiniteQuery({
    queryKey: ["vault-docs", folderId],
    queryFn: ({ pageParam }) => getMyDocuments(folderId, false, pageParam ?? null),
    initialPageParam: null as { cursor_id: number; cursor_created_at: string } | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  });
  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
    staleTime: 60_000,
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
  const documents = React.useMemo(
    () => docsQuery.data?.pages.flatMap((p) => p.documents) ?? [],
    [docsQuery.data]
  );

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

  const hasMoreDocs = Boolean(docsQuery.hasNextPage);

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
      <div className="rounded-lg border border-border bg-card/88 px-5 py-5 shadow-e1 backdrop-blur-[6px] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Espace documentaire
            </p>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-e1">
                <Folder className="h-5 w-5" weight="fill" />
              </span>
              <h1 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[26px]">Mes documents</h1>
            </div>
          {folderId != null && folderCrumbs.length > 0 ? (
            <nav
              className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
              aria-label="Dossier"
            >
              <button
                type="button"
                onClick={() => navigateFolder(null)}
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
              >
                Racine
              </button>
              {folderCrumbs.map((crumb) => (
                <span key={crumb.id} className="flex items-center gap-1.5">
                  <span className="text-subtle-foreground">/</span>
                  <button
                    type="button"
                    onClick={() => navigateFolder(crumb.id)}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 transition-colors",
                      crumb.id === folderId
                        ? "bg-card font-medium text-foreground shadow-e1 ring-1 ring-border"
                        : "hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>
          ) : (
            <p className="mt-1.5 max-w-[60ch] text-sm font-medium leading-relaxed text-muted-foreground">
              Dossiers et fichiers de votre espace. Le fond habille les goulottes, vos cartes restent nettes.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="soft" size="sm" onClick={() => setCreateOpen(true)} className="h-9">
            <FolderPlus /> Nouveau dossier
          </Button>
          <Button variant="default" size="sm" onClick={openUploader} className="h-9 shadow-e1">
            <UploadSimple /> Importer
          </Button>
        </div>
      </div>
      </div>

      <div className="mt-4 space-y-3 pb-16">
        {pending > 0 && (
          <Link
            href="/workflows/approbations"
            className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-sm text-warning-soft-foreground hover:bg-warning-soft/80"
          >
            <Warning className="h-4 w-4 shrink-0" weight="duotone" />
            <span className="font-medium">
              {pluralFr(pending, "approbation en attente", "approbations en attente")}
            </span>
            <span className="ml-auto text-xs font-medium text-warning-soft-foreground">Traiter →</span>
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
              <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer par nom…"
                className="h-10 w-full rounded-lg border border-input bg-input-bg pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              />
            </div>

            {filtered.length === 0 ? (
              <EmptySearch query={query} />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label="Tout sélectionner"
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      allChecked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary"
                    )}
                  >
                    {allChecked && <Check className="h-3 w-3" weight="bold" />}
                  </button>
                  <p className="text-xs font-medium text-muted-foreground">
                    {selected.size > 0
                      ? pluralFr(selected.size, "sélectionné")
                      : pluralFr(filtered.length, "élément")}
                  </p>
                </div>

                <motion.ul
                  layout
                  className="divide-y divide-border"
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

                {hasMoreDocs && !query.trim() && (
                  <div className="border-t border-border px-4 py-3">
                    <Button
                      variant="soft"
                      size="sm"
                      className="w-full"
                      disabled={docsQuery.isFetchingNextPage}
                      onClick={() => void docsQuery.fetchNextPage()}
                    >
                      {docsQuery.isFetchingNextPage ? "Chargement…" : "Charger plus de fichiers"}
                    </Button>
                  </div>
                )}

                {dragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pointer-events-none flex items-center justify-center gap-2 border-t-2 border-dashed border-primary/60 bg-accent-soft/40 py-6 text-sm font-medium text-primary-foreground"
                  >
                    <UploadSimple className="h-4 w-4" />
                    Déposez les fichiers pour lancer l'import
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
            className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-pop"
          >
            <span className="px-2.5 text-sm font-medium text-foreground">
              {pluralFr(selected.size, "sélectionné")}
            </span>
            <Button variant="soft" size="sm" onClick={() => router.push("/documents-partages")}>
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
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
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
        "group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50",
        checked && "bg-accent-soft/50"
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
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card opacity-0 group-hover:opacity-100 hover:border-primary"
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
            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
            {row.kind === "file" && row.badge && (
              <Badge tone={row.badge.tone} className="shrink-0">
                {row.badge.tone === "amber" && <Warning />}
                {row.badge.label}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.owner} · {row.updatedAt}
          </p>
        </div>
      </button>

      {row.shared && (
        <span className="hidden shrink-0 text-subtle-foreground sm:block" title="Partagé">
          <ShareNetwork className="h-4 w-4" />
        </span>
      )}

      <span className="tnum hidden w-16 shrink-0 text-right text-xs text-muted-foreground sm:block">
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
              ? "text-warning hover:bg-warning-soft/30"
              : "text-subtle-foreground opacity-0 hover:bg-accent/30 hover:text-warning group-hover:opacity-100"
          )}
        >
          <Star className={cn("h-4 w-4", row.favorite && "fill-warning text-warning")} weight={row.favorite ? "fill" : "regular"} />
        </button>
      )}
    </motion.li>
  );
}