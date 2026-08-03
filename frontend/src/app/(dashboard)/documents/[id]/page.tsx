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
  FileArchive,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IconTooltipButton } from "@/components/ui/icon-tooltip-button";
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
import { DocumentPreviewPane } from "@/components/documents/document-preview-pane";
import {
  VersionPreviewPane,
  VersionSwitcher,
  type VersionSelection,
} from "@/components/documents/version-switcher";
import { DocumentTextEditor } from "@/components/documents/document-text-editor";
import { DocumentOfficeEditor } from "@/components/documents/document-office-editor";
import { isOfficeDocument } from "@/lib/office-document";
import { toast } from "sonner";
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
      toast.error(e instanceof Error ? e.message : "Impossible de relancer");
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
  const showOfficeEditor =
    doc?.office_editable &&
    isOfficeDocument(doc.mime_type, doc.file_name) &&
    versionSelection.kind === "current";
  const showTextEditor =
    doc?.editable &&
    versionSelection.kind === "current" &&
    !isOfficeDocument(doc.mime_type, doc.file_name);
  const showArchivePreview = versionSelection.kind === "archive";
  const showPreviewPanel = showCurrentPreview || showArchivePreview;
  const hasMainWorkspace = showOfficeEditor || showTextEditor || showPreviewPanel;

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
    <PageFrame className="max-w-[min(1680px,100%)]">
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <IconTooltipButton label="Telecharger" onClick={handleDownload}>
              <DownloadSimple className="h-4 w-4" />
            </IconTooltipButton>
            <IconTooltipButton
              label={favorited ? "Retirer favori" : "Ajouter aux favoris"}
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
              <Star
                className={`h-4 w-4 ${favorited ? "text-amber-500" : ""}`}
                weight={favorited ? "fill" : "regular"}
              />
            </IconTooltipButton>
            {doc.is_locked ? (
              <IconTooltipButton
                label="Deverrouiller"
                onClick={async () => {
                  await unlockDocument(docId);
                  load();
                }}
              >
                <LockOpen className="h-4 w-4" />
              </IconTooltipButton>
            ) : (
              <IconTooltipButton
                label="Verrouiller"
                onClick={async () => {
                  await lockDocument(docId);
                  load();
                }}
              >
                <Lock className="h-4 w-4" />
              </IconTooltipButton>
            )}
            <IconTooltipButton label="Partager" onClick={() => setShowShare(!showShare)}>
              <ShareNetwork className="h-4 w-4" />
            </IconTooltipButton>
          </div>
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,320px)] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {showOfficeEditor && (
            <PagePanel
              title="Edition bureautique"
              subtitle="Word, Excel, PowerPoint — sauvegarde = nouvelle version"
              delay={0.08}
            >
              <DocumentOfficeEditor doc={doc} onSaved={load} />
            </PagePanel>
          )}

          {showTextEditor && (
            <PagePanel
              title="Edition"
              subtitle="Texte, markdown, JSON — sauvegarde = nouvelle version"
              delay={0.08}
            >
              <DocumentTextEditor doc={doc} validationCtx={validationCtx} onSaved={load} />
            </PagePanel>
          )}

          {showPreviewPanel && (
            <PagePanel
              title="Apercu"
              subtitle={
                versionSelection.kind === "current"
                  ? `Version courante v${currentVersionNumber}`
                  : `Version archivee v${versionSelection.version.version_number}`
              }
              delay={0.1}
              className="min-h-0 flex-1"
            >
              {versionSelection.kind === "current" ? (
                <DocumentPreviewPane
                  doc={doc}
                  expanded
                  maxHeightClass="min-h-[min(72dvh,720px)] max-h-[min(78dvh,780px)]"
                />
              ) : (
                <VersionPreviewPane
                  docId={docId}
                  docMime={doc.mime_type}
                  selection={versionSelection}
                />
              )}
            </PagePanel>
          )}

          {!hasMainWorkspace && (
            <PagePanel
              title="Fichier"
              subtitle={`${doc.file_name || doc.titre} — pas d'apercu inline pour ce format`}
              delay={0.08}
            >
              <div className="flex min-h-[min(52dvh,520px)] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200/80 bg-zinc-50/60 px-6 py-12 text-center">
                <span className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-700">
                  <FileArchive className="h-10 w-10" weight="duotone" />
                </span>
                <div className="max-w-md space-y-1">
                  <p className="text-sm font-medium text-zinc-800">{doc.mime_type || "Type inconnu"}</p>
                  <p className="text-sm leading-relaxed text-zinc-600">
                    Utilisez le panneau de droite pour commenter, etiqueter et gerer les versions. Telechargez le
                    fichier pour l&apos;ouvrir localement.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                  <DownloadSimple className="h-4 w-4" />
                  Telecharger
                </Button>
              </div>
            </PagePanel>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-0.5">
          {showShare && (
            <PagePanel compact title="Partage" subtitle="Compte ArchiFlow requis">
              <div className="space-y-3">
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
                <Button size="sm" className="w-full" onClick={handleShare}>
                  Envoyer le partage
                </Button>
              </div>
            </PagePanel>
          )}

          <PagePanel compact title="Commentaires" subtitle={`${comments.length} message(s)`} delay={0.12}>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter un commentaire..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <Button size="sm" onClick={handleAddComment} aria-label="Envoyer">
                  <PaperPlaneTilt className="h-4 w-4" weight="bold" />
                </Button>
              </div>
              <ul className="max-h-48 space-y-2 overflow-y-auto lg:max-h-56">
                {comments.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun commentaire.</p>
                ) : (
                  comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-slate-200/70 bg-zinc-50/80 p-2.5 text-sm"
                    >
                      <p className="text-zinc-800">{c.content}</p>
                      <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-zinc-500">
                        <span className="min-w-0 truncate">
                          {c.author?.email || `#${c.author_id}`} ·{" "}
                          {new Date(c.created_at).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 p-0"
                          onClick={() => deleteComment(docId, c.id).then(load)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </PagePanel>

          <PagePanel compact title="Etiquettes" subtitle="Classification libre" delay={0.14}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aucune etiquette.</p>
                ) : (
                  tags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: t.color || "#059669" }}
                    >
                      {t.name}
                      <button
                        type="button"
                        className="opacity-80 hover:opacity-100"
                        onClick={() => removeDocumentTag(docId, t.id).then(load)}
                        aria-label={`Retirer ${t.name}`}
                      >
                        x
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nouvelle etiquette"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                />
                <Button size="sm" onClick={handleAddTag}>
                  Ajouter
                </Button>
              </div>
            </div>
          </PagePanel>

          <PagePanel
            compact
            title="Versions"
            subtitle={`${versions.length} revision(s)`}
            delay={0.16}
          >
            <div ref={versionsRef} className="space-y-3">
              <VersionSwitcher
                docId={docId}
                currentVersionNumber={currentVersionNumber}
                rejectedAtVersion={rejectedAtVersion}
                versions={versions}
                selection={versionSelection}
                onSelect={setVersionSelection}
              />
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="versionFile">Nouvelle version</Label>
                  <Input
                    id="versionFile"
                    type="file"
                    className="text-xs"
                    onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="versionComment">Commentaire</Label>
                  <Input
                    id="versionComment"
                    placeholder="Optionnel"
                    value={versionComment}
                    onChange={(e) => setVersionComment(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleUploadVersion}
                  disabled={!versionFile}
                >
                  Deposer la version
                </Button>
              </div>
              {versions.length === 0 ? (
                <p className="text-sm text-zinc-500">Pas encore d&apos;historique.</p>
              ) : (
                <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto text-xs">
                  {versions.map((v) => (
                    <li key={v.id} className="flex flex-col gap-0.5 py-2">
                      <span className="font-medium text-zinc-800">
                        v{v.version_number} — {v.file_name}
                      </span>
                      {v.comment && <span className="text-zinc-600">{v.comment}</span>}
                      <span className="font-mono text-zinc-500">
                        {new Date(v.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PagePanel>
        </aside>
      </div>
    </PageFrame>
  );
}
