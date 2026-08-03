"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowsOut,
  ArrowSquareOut,
  CheckCircle,
  DownloadSimple,
  Eye,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { DocumentPreviewPane, isInlinePreviewable } from "@/components/documents/document-preview-pane";
import { ErrorBanner } from "@/components/layout/error-banner";
import { getDocument } from "@/services/collaboration.service";
import { downloadDocumentFile } from "@/services/documents.service";
import { approveInstance, rejectInstance } from "@/services/workflows.service";
import { getApiErrorMessage } from "@/lib/api-error";
import type { Document } from "@/types/documents";
import type { WorkflowInstance } from "@/types/workflows";

type Props = {
  item: WorkflowInstance;
  onRefresh: () => void;
};

function statusBadge() {
  return (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
      En cours
    </span>
  );
}

export function WorkflowApprovalCard({ item, onRefresh }: Props) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [verified, setVerified] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setLoadingDoc(true);
    setLoadError(null);
    setVerified(false);
    setDownloaded(false);
    getDocument(item.document_id)
      .then(setDoc)
      .catch(() => setLoadError("Impossible de charger le document pour verification."))
      .finally(() => setLoadingDoc(false));
  }, [item.document_id, item.id]);

  const needsDownloadAck =
    doc != null && !isInlinePreviewable(doc.mime_type) && doc.previewable !== true;
  const canDecide =
    verified && (!needsDownloadAck || downloaded) && !acting && !loadingDoc && doc != null;

  const act = async (fn: (id: number, c?: string) => Promise<void>) => {
    setActing(true);
    setActionError(null);
    try {
      await fn(item.id, comment.trim() || undefined);
      onRefresh();
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Action impossible"));
    } finally {
      setActing(false);
    }
  };

  return (
    <motion.article
      layout
      className="overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white shadow-[0_12px_32px_-20px_rgba(15,23,42,0.12)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-200/70">
        <div className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="truncate text-lg font-semibold tracking-tight text-zinc-900">
                {item.document_titre || `Document #${item.document_id}`}
              </h3>
              <p className="text-sm text-zinc-600">
                {item.workflow_nom} · {item.etape_courante_nom || "—"}
              </p>
              <p className="text-xs text-zinc-400">
                Instance #{item.id}
                {item.date_debut &&
                  ` · Demande du ${new Date(item.date_debut).toLocaleString("fr-FR")}`}
              </p>
            </div>
            {statusBadge()}
          </div>

          {item.commentaire?.trim() && (
            <div className="rounded-2xl border border-slate-200/60 bg-zinc-50/90 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Commentaire du demandeur
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700">{item.commentaire}</p>
            </div>
          )}

          {doc && !loadingDoc && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Format</dt>
                <dd className="font-medium text-zinc-800">{doc.mime_type || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Taille</dt>
                <dd className="font-medium text-zinc-800">
                  {doc.taille_formatee || `${doc.taille} o`}
                </dd>
              </div>
              {doc.current_version_number != null && (
                <div>
                  <dt className="text-xs text-zinc-500">Version</dt>
                  <dd className="font-mono text-sm font-medium text-zinc-800">
                    v{doc.current_version_number}
                  </dd>
                </div>
              )}
              {doc.status && (
                <div>
                  <dt className="text-xs text-zinc-500">Statut document</dt>
                  <dd className="font-medium text-zinc-800">{doc.status}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-auto space-y-4 border-t border-slate-200/60 pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <Eye className="h-4 w-4 text-emerald-700" weight="duotone" />
              Verification avant decision
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/70 bg-zinc-50/50 px-4 py-3 transition-colors hover:bg-zinc-50">
              <Checkbox
                checked={verified}
                onCheckedChange={(v) => setVerified(!!v)}
                className="mt-0.5"
                aria-describedby={`verify-hint-${item.id}`}
              />
              <span className="text-sm leading-snug text-zinc-700">
                J&apos;ai consulte le document et je confirme pouvoir approuver ou rejeter en
                connaissance de cause.
              </span>
            </label>
            <p id={`verify-hint-${item.id}`} className="text-xs text-zinc-500">
              Les boutons Approuver et Rejeter restent inactifs tant que cette case n&apos;est pas
              cochee.
            </p>

            {needsDownloadAck && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
                <Checkbox
                  checked={downloaded}
                  onCheckedChange={(v) => setDownloaded(!!v)}
                  className="mt-0.5"
                />
                <span className="text-sm text-amber-950">
                  J&apos;ai telecharge et ouvert le fichier (apercu non disponible dans le
                  navigateur).
                </span>
              </label>
            )}

            <div className="space-y-2">
              <Label htmlFor={`comment-${item.id}`} className="text-zinc-700">
                Commentaire (optionnel)
              </Label>
              <Input
                id={`comment-${item.id}`}
                placeholder="Motif ou remarque pour l'historique..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {loadError && <ErrorBanner message={loadError} />}
            {actionError && <ErrorBanner message={actionError} />}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                size="sm"
                disabled={!canDecide}
                onClick={() => act(approveInstance)}
                className="gap-1.5 active:scale-[0.98]"
              >
                <CheckCircle className="h-4 w-4" weight="bold" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!canDecide}
                onClick={() => act(rejectInstance)}
                className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 active:scale-[0.98]"
              >
                <XCircle className="h-4 w-4" weight="bold" />
                Rejeter
              </Button>
              <Button variant="ghost" size="sm" asChild className="gap-1.5">
                <Link href={`/documents/${item.document_id}`} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOut className="h-4 w-4" />
                  Fiche complete
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-zinc-50/40 p-5 md:p-6 lg:min-h-[420px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-800">Apercu du fichier</p>
            {doc && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                >
                  <ArrowsOut className="h-4 w-4" />
                  Agrandir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  type="button"
                  onClick={() => {
                    setDownloaded(true);
                    void downloadDocumentFile(doc.id, doc.file_name || doc.titre);
                  }}
                >
                  <DownloadSimple className="h-4 w-4" />
                  Telecharger
                </Button>
              </div>
            )}
          </div>
          {loadingDoc && (
            <div className="min-h-[280px] flex-1 animate-pulse rounded-2xl bg-zinc-200/40" />
          )}
          {!loadingDoc && doc && (
            <>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="group relative flex-1 overflow-hidden rounded-2xl text-left ring-offset-2 transition-shadow hover:ring-2 hover:ring-emerald-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                aria-label="Ouvrir l'apercu en plein ecran"
              >
                <DocumentPreviewPane doc={doc} className="pointer-events-none w-full" />
                <span className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-zinc-950/50 to-transparent px-4 py-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm">
                    <ArrowsOut className="h-3.5 w-3.5" />
                    Ouvrir en grand
                  </span>
                </span>
              </button>
              <DocumentPreviewModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                doc={doc}
              />
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}
