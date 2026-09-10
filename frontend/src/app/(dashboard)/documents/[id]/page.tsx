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
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { IntegrityHash } from "@/components/documents/integrity-hash";
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
  getDocumentHold,
  lockDocument,
  placeDocumentHold,
  releaseDocumentHold,
  unlockDocument,
  updateDocumentClassification,
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
  const [classification, setClassification] = useState("INTERNE");
  const [department, setDepartment] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [tab, setTab] = useState("apercu");
  const [onHold, setOnHold] = useState(false);
  const [holdId, setHoldId] = useState<number | null>(null);
  const [holdReason, setHoldReason] = useState("");

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
      setClassification(d.classification || "INTERNE");
      setDepartment(d.department || "");
      const curVer = d.current_version_number ?? vctx?.current_version_number ?? 1;
      setVersionSelection({ kind: "current", versionNumber: curVer });
      setFavorited(await getFavoriteStatus(docId));
      const hold = await getDocumentHold(docId).catch(() => ({
        on_hold: false,
        hold: undefined as { id: number; reason?: string } | undefined,
      }));
      setOnHold(hold.on_hold);
      setHoldId(hold.hold?.id ?? null);
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

  const handleSaveClassification = async () => {
    setSavingMeta(true);
    try {
      const updated = await updateDocumentClassification(docId, {
        classification,
        department: department.trim(),
      });
      setDoc(updated);
      toast.success("Classement enregistré");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSavingMeta(false);
    }
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
      await restartValidation(docId, "Relance après correction");
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
  const showCurrentPreview = versionSelection.kind === "current";
  const showOfficeEditor =
    doc?.office_editable &&
    isOfficeDocument(doc.mime_type, doc.file_name) &&
    versionSelection.kind === "current";
  const showTextEditor =
    doc?.editable &&
    versionSelection.kind === "current" &&
    !isOfficeDocument(doc.mime_type, doc.file_name);
  const showArchivePreview = versionSelection.kind === "archive";
  const showPreviewPanel =
    (showCurrentPreview && !showOfficeEditor && !showTextEditor) || showArchivePreview;
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
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
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
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Mes documents
      </Link>

      <div className="overflow-hidden rounded-lg border border-border bg-card p-5 shadow-e1 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Fiche document
            </p>
            <div className="mt-1.5 flex flex-wrap items-start gap-3">
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground ring-1 ring-primary/30 sm:flex">
                <FileArchive className="h-5 w-5" weight="duotone" />
              </span>
              <h1 className="min-w-0 flex-1 break-words text-[20px] font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]">
                {doc.titre}
              </h1>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {doc.taille_formatee || doc.taille} · {doc.mime_type}
                {doc.status ? ` · ${doc.status}` : " · BROUILLON"}
              </span>
              {onHold && <Badge tone="warning">Conservation</Badge>}
            </p>
            <div className="mt-2">
              <IntegrityHash hash={doc.content_sha256} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end">
            <IconTooltipButton label="Télécharger" onClick={handleDownload} className="h-9 w-9 rounded-lg">
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
              className="h-9 w-9 rounded-lg"
            >
              <Star
                className={`h-4 w-4 ${favorited ? "text-warning" : ""}`}
                weight={favorited ? "fill" : "regular"}
              />
            </IconTooltipButton>
            {doc.is_locked ? (
              <IconTooltipButton
                label="Déverrouiller"
                onClick={async () => {
                  await unlockDocument(docId);
                  load();
                }}
                className="h-9 w-9 rounded-lg"
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
                className="h-9 w-9 rounded-lg"
              >
                <Lock className="h-4 w-4" />
              </IconTooltipButton>
            )}
            <IconTooltipButton
              label="Partager"
              onClick={() => setShowShare(!showShare)}
              className={`h-9 w-9 rounded-lg ${showShare ? "border-primary/30 bg-accent-soft text-accent-soft-foreground" : ""}`}
            >
              <ShareNetwork className="h-4 w-4" />
            </IconTooltipButton>
          </div>
        </div>
      </div>

      {validationCtx && tab === "workflow" && (
        <WorkflowStatusBanner
          context={validationCtx}
          onScrollToVersions={scrollToVersions}
          onRestart={handleRestartValidation}
          restarting={restarting}
        />
      )}

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="bg-card border border-border shadow-e1"
        tabs={[
          { id: "apercu", label: "Aperçu" },
          { id: "versions", label: "Versions" },
          { id: "workflow", label: "Workflow" },
          { id: "partage", label: "Partage" },
          { id: "activite", label: "Activité" },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,320px)] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {showOfficeEditor && (
            <PagePanel
              title="Édition bureautique"
              subtitle="Collabora / OnlyOffice — sauvegarde = nouvelle version"
              delay={0.08}
            >
              <DocumentOfficeEditor doc={doc} onSaved={load} />
            </PagePanel>
          )}

          {showTextEditor && (
            <PagePanel
              title="Édition"
              subtitle="Texte, markdown, JSON — sauvegarde = nouvelle version"
              delay={0.08}
            >
              <DocumentTextEditor doc={doc} validationCtx={validationCtx} onSaved={load} />
            </PagePanel>
          )}

          {showPreviewPanel && (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-e1">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-[13px] font-semibold tracking-tight text-foreground">Aperçu</p>
                  <p className="text-xs text-muted-foreground">
                    {versionSelection.kind === "current"
                      ? `Version courante · v${currentVersionNumber}`
                      : `Version archivée · v${versionSelection.version.version_number}`}
                  </p>
                </div>
                <span className="hidden rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border sm:inline-flex">
                  {doc.mime_type}
                </span>
              </div>
              <div className="p-2 sm:p-3">
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
              </div>
            </div>
          )}

          {!hasMainWorkspace && (
            <PagePanel
              title="Fichier"
              subtitle={`${doc.file_name || doc.titre} — pas d'aperçu inline pour ce format`}
              delay={0.08}
            >
              <div className="flex min-h-[min(52dvh,520px)] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/50 bg-muted/40 px-6 py-12 text-center">
                <span className="rounded-2xl bg-primary/10 p-4 text-primary">
                  <FileArchive className="h-10 w-10" weight="duotone" />
                </span>
                <div className="max-w-md space-y-1">
                  <p className="text-sm font-medium text-foreground">{doc.mime_type || "Type inconnu"}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Utilisez le panneau de droite pour commenter, étiqueter et gérer les versions. Téléchargez le
                    fichier pour l'ouvrir localement.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                  <DownloadSimple className="h-4 w-4" />
                  Télécharger
                </Button>
              </div>
            </PagePanel>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[68px] lg:max-h-[calc(100dvh-4.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          {(tab === "partage" || showShare) && (
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

          {tab === "activite" && (
            <>
              <PagePanel compact title="Commentaires" subtitle={`${comments.length} message(s)`}>
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
                      <p className="text-sm text-muted-foreground">Aucun commentaire.</p>
                    ) : (
                      comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-lg border border-border/50 bg-muted/40 p-2.5 text-sm"
                        >
                          <p className="text-foreground">{c.content}</p>
                          <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
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

              <PagePanel compact title="Étiquettes" subtitle="Classification libre" delay={0.14}>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune étiquette.</p>
                    ) : (
                      tags.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-primary-foreground"
                          style={{ backgroundColor: t.color || "var(--primary)" }}
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
                      placeholder="Nouvelle étiquette"
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
              </>
          )}

          {doc.can_classify && (
            <PagePanel
              compact
              title="Classement MAC"
              subtitle="Classification et département"
              delay={0.15}
            >
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="docClassification">Classification</Label>
                  <Select
                    id="docClassification"
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="INTERNE">INTERNE</option>
                    <option value="CONFIDENTIEL">CONFIDENTIEL</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="docDepartment">Département</Label>
                  <Input
                    id="docDepartment"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ex: Juridique"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={savingMeta}
                  onClick={() => void handleSaveClassification()}
                >
                  Enregistrer le classement
                </Button>
              </div>
            </PagePanel>
          )}

          {(
            <PagePanel compact title="Conservation" subtitle="Legal hold — bloque suppression et purge">
              {onHold ? (
                <div className="space-y-2">
                  <Badge tone="warning">En conservation</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!holdId}
                    onClick={async () => {
                      if (!holdId) return;
                      await releaseDocumentHold(docId, holdId);
                      setOnHold(false);
                      setHoldId(null);
                      toast.success("Conservation levée");
                    }}
                  >
                    Lever le hold
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="holdReason">Motif</Label>
                  <Input
                    id="holdReason"
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Litige, contrôle, enquête…"
                  />
                  <Button
                    size="sm"
                    disabled={holdReason.trim().length < 3}
                    onClick={async () => {
                      await placeDocumentHold(docId, holdReason.trim());
                      const hold = await getDocumentHold(docId);
                      setOnHold(hold.on_hold);
                      setHoldId(hold.hold?.id ?? null);
                      setHoldReason("");
                      toast.success("Document placé en conservation");
                    }}
                  >
                    Placer un hold
                  </Button>
                </div>
              )}
            </PagePanel>
          )}

          {tab === "versions" && (
            <PagePanel
              compact
              title="Versions"
              subtitle={`${versions.length} révision(s)`}
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
                <div className="space-y-2 border-t border-border pt-3">
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
                    Déposer la version
                  </Button>
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Pas encore d'historique.</p>
                  ) : (
                    <ul className="max-h-40 divide-y divide-border overflow-y-auto text-xs">
                      {versions.map((v) => (
                        <li key={v.id} className="flex flex-col gap-0.5 py-2">
                          <span className="font-medium text-foreground">
                            v{v.version_number} — {v.file_name}
                          </span>
                          {v.comment && <span className="text-muted-foreground">{v.comment}</span>}
                          <span className="font-mono text-muted-foreground">
                            {new Date(v.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </PagePanel>
          )}

          {tab === "workflow" && !validationCtx && (
            <PagePanel compact title="Workflow" subtitle="Aucun circuit actif">
              <p className="text-sm text-muted-foreground">
                Ce document n'est pas dans un workflow d'approbation.
              </p>
            </PagePanel>
          )}
        </aside>
      </div>
    </PageFrame>
  );
}