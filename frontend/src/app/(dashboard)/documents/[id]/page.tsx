"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  DownloadSimple,
  ShareNetwork,
  PaperPlaneTilt,
  Trash,
  Star,
  Lock,
  LockOpen,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import type { Document } from "@/types/documents";
import type { DocumentComment, DocumentVersion, Tag as DocTag } from "@/types/collaboration";
import type { ValidationContext } from "@/types/workflows";
import { getAccessToken } from "@/lib/session-tokens";
import { WorkflowStatusBanner } from "@/components/workflows/workflow-status-banner";
import {
  VersionPreviewPane,
  VersionSwitcher,
  type VersionSelection,
} from "@/components/documents/version-switcher";
import { DocumentTextEditor } from "@/components/documents/document-text-editor";
import { DocumentOfficeEditor } from "@/components/documents/document-office-editor";
import { isOfficeDocument } from "@/lib/office-document";
import {
  addComment,
  addDocumentTag,
  deleteComment,
  getDocument,
  getDocumentTags,
  listComments,
  listVersions,
  removeDocumentTag,
  shareDocument,
  uploadVersion,
} from "@/services/collaboration.service";
import {
  downloadUrl,
  lockDocument,
  previewUrl,
  unlockDocument,
} from "@/services/documents.service";
import {
  addFavorite,
  getFavoriteStatus,
  removeFavorite,
} from "@/services/favorites.service";
import {
  getValidationContext,
  restartValidation,
} from "@/services/workflows.service";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = Number(params.id);
  const versionsRef = useRef<HTMLDivElement>(null);

  const [doc, setDoc] = useState<Document | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [tags, setTags] = useState<DocTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [tagName, setTagName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionComment, setVersionComment] = useState("");
  const [favorited, setFavorited] = useState(false);
  const [validationCtx, setValidationCtx] = useState<ValidationContext | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [versionSelection, setVersionSelection] = useState<VersionSelection>({
    kind: "current",
    versionNumber: 1,
  });

  const load = useCallback(async () => {
    if (!docId || Number.isNaN(docId)) return;
    setLoading(true);
    setError(null);
    try {
      const [d, c, v, t, vctx] = await Promise.all([
        getDocument(docId),
        listComments(docId),
        listVersions(docId),
        getDocumentTags(docId),
        getValidationContext(docId).catch(() => null),
      ]);
      setDoc(d);
      setComments(c);
      setVersions(v);
      setTags(t);
      setValidationCtx(vctx);
      const curVer = d.current_version_number ?? vctx?.current_version_number ?? 1;
      setVersionSelection({ kind: "current", versionNumber: curVer });
      setFavorited(await getFavoriteStatus(docId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Document inaccessible");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async () => {
    if (!doc) return;
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

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addComment(docId, commentText.trim());
    setCommentText("");
    load();
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) return;
    setShareError(null);
    try {
      await shareDocument(docId, {
        email: shareEmail.trim(),
        message: shareMessage,
        permissions: ["lecture", "download", "commentaire"],
      });
      setShareEmail("");
      setShareMessage("");
      setShowShare(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setShareError(
        err.response?.data?.error ??
          "Partage impossible. Vérifiez que le destinataire a un compte ArchiFlow."
      );
    }
  };

  const handleAddTag = async () => {
    if (!tagName.trim()) return;
    await addDocumentTag(docId, tagName.trim());
    setTagName("");
    load();
  };

  const handleUploadVersion = async () => {
    if (!versionFile) return;
    await uploadVersion(docId, versionFile, versionComment);
    setVersionFile(null);
    setVersionComment("");
    load();
  };

  const handleRestartValidation = async () => {
    setRestarting(true);
    try {
      await restartValidation(docId, "Relance apres correction");
      router.push("/workflows/en-cours");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Impossible de relancer");
    } finally {
      setRestarting(false);
    }
  };

  const scrollToVersions = () => {
    versionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const currentVersionNumber =
    doc?.current_version_number ?? validationCtx?.current_version_number ?? 1;
  const rejectedAtVersion =
    doc?.rejected_at_version ?? validationCtx?.rejected_at_version ?? null;
  const showCurrentPreview =
    versionSelection.kind === "current" && (doc?.previewable ?? false);

  if (loading) {
    return (
      <PageFrame>
        <ListSkeleton rows={4} />
      </PageFrame>
    );
  }

  if (error || !doc) {
    return (
      <PageFrame>
        <Link
          href="/mes-documents"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Mes documents
        </Link>
        <ErrorBanner message={error || "Document introuvable"} />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Link
        href="/mes-documents"
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Mes documents
      </Link>

      <PageHeader
        eyebrow="Fiche document"
        title={doc.titre}
        description={`${doc.taille_formatee || doc.taille} · ${doc.mime_type}${doc.status ? ` · ${doc.status}` : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <DownloadSimple className="h-4 w-4" />
              Telecharger
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                if (favorited) {
                  await removeFavorite(docId);
                  setFavorited(false);
                } else {
                  await addFavorite(docId);
                  setFavorited(true);
                }
              }}
            >
              <Star className={`h-4 w-4 ${favorited ? "text-amber-500" : ""}`} weight={favorited ? "fill" : "regular"} />
              {favorited ? "Retirer favori" : "Favori"}
            </Button>
            {doc.is_locked ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  await unlockDocument(docId);
                  load();
                }}
              >
                <LockOpen className="h-4 w-4" />
                Deverrouiller
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  await lockDocument(docId);
                  load();
                }}
              >
                <Lock className="h-4 w-4" />
                Verrouiller
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowShare(!showShare)} className="gap-1.5">
              <ShareNetwork className="h-4 w-4" />
              Partager
            </Button>
          </>
        }
      />

      {validationCtx && (
        <WorkflowStatusBanner
          context={validationCtx}
          onScrollToVersions={scrollToVersions}
          onRestart={handleRestartValidation}
          restarting={restarting}
        />
      )}

      {showShare && (
        <PagePanel title="Partage" subtitle="Le destinataire doit déjà avoir un compte ArchiFlow">
          <div className="space-y-4">
            {shareError && <ErrorBanner message={shareError} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="shareEmail">E-mail du destinataire</Label>
              <Input
                id="shareEmail"
                placeholder="manager@archiflow.local"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shareMessage">Message</Label>
              <Input
                id="shareMessage"
                placeholder="Message optionnel"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>
            <Button onClick={handleShare}>Envoyer le partage</Button>
          </div>
        </PagePanel>
      )}

      {doc.office_editable &&
        isOfficeDocument(doc.mime_type, doc.file_name) &&
        versionSelection.kind === "current" && (
          <PagePanel
            title="Edition bureautique"
            subtitle="Word, Excel, PowerPoint — sauvegarde = nouvelle version"
          >
            <DocumentOfficeEditor doc={doc} onSaved={load} />
          </PagePanel>
        )}

      {doc.editable &&
        versionSelection.kind === "current" &&
        !isOfficeDocument(doc.mime_type, doc.file_name) && (
          <PagePanel title="Edition" subtitle="Texte, markdown, JSON — sauvegarde = nouvelle version">
            <DocumentTextEditor doc={doc} validationCtx={validationCtx} onSaved={load} />
          </PagePanel>
        )}

      {(showCurrentPreview || versionSelection.kind === "archive") && (
        <PagePanel
          title="Apercu"
          subtitle={
            versionSelection.kind === "current"
              ? `Version courante v${currentVersionNumber}`
              : `Version archivee v${versionSelection.version.version_number}`
          }
        >
          {versionSelection.kind === "current" && doc ? (
            <DocumentPreview doc={doc} />
          ) : (
            <VersionPreviewPane
              docId={docId}
              docMime={doc.mime_type}
              selection={versionSelection}
            />
          )}
        </PagePanel>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <PagePanel title="Commentaires" subtitle={`${comments.length} message(s)`}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un commentaire..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <Button size="sm" onClick={handleAddComment}>
                <PaperPlaneTilt className="h-4 w-4" weight="bold" />
              </Button>
            </div>
            <ul className="max-h-64 space-y-3 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucun commentaire.</p>
              ) : (
                comments.map((c) => (
                  <li key={c.id} className="rounded-2xl border border-slate-200/70 bg-zinc-50/80 p-3 text-sm">
                    <p className="text-zinc-800">{c.content}</p>
                    <p className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        {c.author?.email || `Utilisateur #${c.author_id}`} ·{" "}
                        {new Date(c.created_at).toLocaleString("fr-FR")}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => deleteComment(docId, c.id).then(load)}>
                        <Trash className="h-3 w-3" />
                      </Button>
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </PagePanel>

        <PagePanel title="Etiquettes" subtitle="Classification libre">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: t.color || "#059669" }}
                >
                  {t.name}
                  <button
                    type="button"
                    className="opacity-80 hover:opacity-100"
                    onClick={() => removeDocumentTag(docId, t.id).then(load)}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nouvelle etiquette"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
              />
              <Button size="sm" onClick={handleAddTag}>
                Ajouter
              </Button>
            </div>
          </div>
        </PagePanel>
      </section>

      <PagePanel
        title="Versions"
        subtitle={`${versions.length} revision(s) en historique`}
      >
        <div ref={versionsRef} className="space-y-4">
          <VersionSwitcher
            docId={docId}
            currentVersionNumber={currentVersionNumber}
            rejectedAtVersion={rejectedAtVersion}
            versions={versions}
            selection={versionSelection}
            onSelect={setVersionSelection}
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="versionFile">Fichier</Label>
              <Input id="versionFile" type="file" onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="versionComment">Commentaire</Label>
              <Input
                id="versionComment"
                placeholder="Commentaire version"
                value={versionComment}
                onChange={(e) => setVersionComment(e.target.value)}
              />
            </div>
            <Button onClick={handleUploadVersion} disabled={!versionFile} className="sm:mb-0.5">
              Nouvelle version
            </Button>
          </div>
          {versions.length === 0 ? (
            <p className="text-sm text-zinc-500">Pas encore d&apos;historique.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex justify-between gap-2 py-3">
                  <span className="text-zinc-700">
                    v{v.version_number} — {v.file_name}
                    {v.comment && ` (${v.comment})`}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-zinc-500">
                    {new Date(v.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PagePanel>
    </PageFrame>
  );
}

function DocumentPreview({ doc }: { doc: Document }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    fetch(previewUrl(doc.id), {
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
      <img src={src} alt={doc.titre} className="mx-auto max-h-[50vh] max-w-full" />
    );
  }
  if (doc.mime_type === "application/pdf") {
    return <iframe src={src} title={doc.titre} className="h-[50vh] w-full border-0" />;
  }
  return <p className="text-sm text-zinc-600">Apercu non disponible.</p>;
}
