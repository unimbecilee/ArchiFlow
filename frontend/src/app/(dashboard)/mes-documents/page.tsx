"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FolderOpen,
  FileText,
  UploadSimple,
  FolderPlus,
  ArrowsClockwise,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { DocumentList } from "@/components/documents/document-list";
import { FolderBreadcrumb } from "@/components/documents/folder-breadcrumb";
import { FolderCard } from "@/components/documents/folder-card";
import { FolderEditDialog, mapFolderError } from "@/components/documents/folder-edit-dialog";
import type { Document, Folder, FolderBreadcrumbItem } from "@/types/documents";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  downloadUrl,
  getFolder,
  getFolderBreadcrumb,
  getFolders,
  getFoldersFlat,
  getMyDocuments,
  moveDocument,
  previewUrl,
  updateFolder,
} from "@/services/documents.service";
import { startValidation } from "@/services/workflows.service";
import { getAccessToken } from "@/lib/session-tokens";
import { getApiErrorMessage } from "@/lib/api-error";
import { buildMesDocumentsActions } from "@/lib/document-crud-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { EmptyState } from "@/components/layout/empty-state";

function parseFolderParam(raw: string | null): number | null {
  if (!raw || raw === "null" || raw === "0") return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function MesDocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = parseFolderParam(searchParams.get("folder"));

  const [breadcrumb, setBreadcrumb] = useState<FolderBreadcrumbItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allFoldersFlat, setAllFoldersFlat] = useState<{ id: number; path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [moveDocId, setMoveDocId] = useState<number | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);

  const navigateFolder = (id: number | null) => {
    if (id == null) {
      router.push("/mes-documents");
    } else {
      router.push(`/mes-documents?folder=${id}`);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, d, flat] = await Promise.all([
        getFolders(folderId),
        getMyDocuments(folderId),
        getFoldersFlat(),
      ]);
      setFolders(f);
      setDocuments(d.documents ?? []);
      setAllFoldersFlat(flat.map((x) => ({ id: x.id, path: x.path })));
      if (folderId != null) {
        const [crumb, folder] = await Promise.all([
          getFolderBreadcrumb(folderId),
          getFolder(folderId),
        ]);
        setBreadcrumb(crumb);
        setCurrentFolder(folder);
      } else {
        setBreadcrumb([]);
        setCurrentFolder(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder({ name: newFolderName.trim(), parent_id: folderId });
      setNewFolderName("");
      load();
    } catch (e: unknown) {
      setError(mapFolderError(getApiErrorMessage(e, "Creation impossible")));
    }
  };

  const openEditFolder = (folder: Folder) => {
    setEditFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderDesc(folder.description ?? "");
  };

  const closeEditFolder = () => {
    setEditFolder(null);
    setEditFolderName("");
    setEditFolderDesc("");
  };

  const handleSaveFolder = async () => {
    if (!editFolder || !editFolderName.trim()) return;
    setFolderSaving(true);
    setError(null);
    try {
      await updateFolder(editFolder.id, {
        name: editFolderName.trim(),
        description: editFolderDesc.trim(),
      });
      closeEditFolder();
      load();
    } catch (e: unknown) {
      setError(mapFolderError(getApiErrorMessage(e, "Modification impossible")));
    } finally {
      setFolderSaving(false);
    }
  };

  const folderChildCounts = (folder: Folder) => {
    const docs = folder.documents_count ?? (folder.id === folderId ? documents.length : 0);
    const subs = folder.subfolders_count ?? (folder.id === folderId ? folders.length : 0);
    return { docs, subs };
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const { docs, subs } = folderChildCounts(folder);
    const recursive = docs > 0 || subs > 0;
    const message = recursive
      ? `Supprimer « ${folder.name} » et tout son contenu (${subs} sous-dossier(s), ${docs} fichier(s)) ?\n\nLes fichiers seront envoyés à la corbeille.`
      : `Supprimer le dossier « ${folder.name} » ?`;
    if (!confirm(message)) return;
    setError(null);
    try {
      await deleteFolder(folder.id, recursive);
      if (folderId === folder.id) {
        const parentId =
          breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2].id : null;
        navigateFolder(parentId);
        return;
      }
      load();
    } catch (e: unknown) {
      setError(mapFolderError(getApiErrorMessage(e, "Suppression impossible")));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce document ?")) return;
    await deleteDocument(id);
    load();
  };

  const handleBulkDelete = async (items: Document[]) => {
    if (!confirm(`Supprimer ${items.length} document(s) ?`)) return;
    await Promise.all(items.map((d) => deleteDocument(d.id)));
    load();
  };

  const handleMove = async () => {
    if (moveDocId == null) return;
    const target = moveTarget === "" ? null : Number(moveTarget);
    await moveDocument(moveDocId, target);
    setMoveDocId(null);
    setMoveTarget("");
    load();
  };

  const handleStartValidation = async (docId: number) => {
    try {
      await startValidation(docId);
      alert("Document soumis a validation");
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur workflow");
    }
  };

  const handleDownload = async (doc: Document) => {
    const token = getAccessToken();
    const res = await fetch(downloadUrl(doc.id), {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = doc.file_name || doc.titre;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const documentActions = useMemo(
    () =>
      buildMesDocumentsActions({
        onPreview: setPreviewDoc,
        onDownload: handleDownload,
        onMove: (doc) => {
          setMoveDocId(doc.id);
          setMoveTarget(folderId != null ? String(folderId) : "");
        },
        onDelete: handleDelete,
        onBulkDelete: handleBulkDelete,
        onStartValidation: handleStartValidation,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folderId]
  );

  const importHref =
    folderId != null ? `/importer?folder_id=${folderId}` : "/importer";

  const folderTitle =
    breadcrumb.length > 0
      ? breadcrumb[breadcrumb.length - 1].name
      : folderId
        ? `Dossier #${folderId}`
        : "Racine";

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Documents"
        title="Mes documents"
        description={folderTitle}
        icon={<FolderOpen className="h-6 w-6" weight="duotone" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <ArrowsClockwise className="h-4 w-4" />
              Actualiser
            </Button>
            <Link href={importHref}>
              <Button size="sm" className="gap-1.5">
                <UploadSimple className="h-4 w-4" />
                Importer ici
              </Button>
            </Link>
          </>
        }
      />

      <FolderBreadcrumb items={breadcrumb} currentFolderId={folderId} />

      {currentFolder && (
        <PagePanel
          title="Dossier actuel"
          subtitle={currentFolder.description || "Modifier ou supprimer ce dossier"}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => openEditFolder(currentFolder)}
            >
              <PencilSimple className="h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => handleDeleteFolder(currentFolder)}
            >
              <Trash className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </PagePanel>
      )}

      <PagePanel title="Organisation" subtitle="Creer un sous-dossier dans ce niveau">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="folderName">Nom du dossier</Label>
            <Input
              id="folderName"
              placeholder="Ex: Contrats 2026"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateFolder} className="gap-1.5 md:mb-0.5">
            <FolderPlus className="h-4 w-4" />
            Creer
          </Button>
        </div>
      </PagePanel>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <>
          {folders.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((f, index) => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  index={index}
                  onOpen={() => navigateFolder(f.id)}
                  onEdit={() => openEditFolder(f)}
                  onDelete={() => handleDeleteFolder(f)}
                />
              ))}
            </section>
          )}

          <PagePanel title="Fichiers" subtitle={`${documents.length} document(s) dans ce dossier`}>
            {documents.length === 0 ? (
              <EmptyState
                title="Aucun document ici"
                description="Importez un fichier dans ce dossier pour le voir apparaitre ici."
                icon={<FileText className="h-6 w-6" weight="duotone" />}
                action={
                  <Link href={importHref}>
                    <Button size="sm">Importer dans ce dossier</Button>
                  </Link>
                }
              />
            ) : (
              <DocumentList
                documents={documents}
                rowActions={documentActions.rowActions}
                bulkActions={documentActions.bulkActions}
                storageKey="archiflow-mes-documents-view"
              />
            )}
          </PagePanel>
        </>
      )}

      {editFolder && (
        <FolderEditDialog
          open
          title={`Modifier « ${editFolder.name} »`}
          name={editFolderName}
          description={editFolderDesc}
          saving={folderSaving}
          onNameChange={setEditFolderName}
          onDescriptionChange={setEditFolderDesc}
          onClose={closeEditFolder}
          onSave={handleSaveFolder}
        />
      )}

      {moveDocId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
          <div className="surface-bento w-full max-w-md p-6">
            <h3 className="font-semibold text-zinc-900">Deplacer le document</h3>
            <p className="mt-1 text-sm text-zinc-600">Choisir le dossier de destination.</p>
            <select
              className="mt-4 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
            >
              <option value="">Racine</option>
              {allFoldersFlat.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.path}
                </option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMoveDocId(null)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleMove}>
                Deplacer
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
          <div className="surface-bento flex max-h-[90vh] w-full max-w-4xl flex-col">
            <div className="flex items-center justify-between border-b border-slate-200/70 p-4">
              <h3 className="truncate font-semibold text-zinc-900">{previewDoc.titre}</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(null)}>
                Fermer
              </Button>
            </div>
            <div className="min-h-[300px] flex-1 overflow-auto p-4">
              <DocumentPreview doc={previewDoc} />
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export default function MesDocumentsPage() {
  return (
    <Suspense fallback={<PageFrame><ListSkeleton rows={5} /></PageFrame>}>
      <MesDocumentsContent />
    </Suspense>
  );
}

function DocumentPreview({ doc }: { doc: Document }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const url = previewUrl(doc.id);
    fetch(url, {
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
  }, [doc.id]);

  if (!src) {
    return <p className="text-sm text-zinc-500">Chargement apercu...</p>;
  }

  if (doc.mime_type?.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={doc.titre} className="mx-auto max-w-full" />
    );
  }
  if (doc.mime_type === "application/pdf") {
    return <iframe src={src} title={doc.titre} className="h-[70vh] w-full border-0" />;
  }
  return <p className="text-sm text-zinc-600">Apercu non disponible. Utilisez telecharger.</p>;
}
