"use client";

import { useCallback, useEffect, useState } from "react";
import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/layout/error-banner";
import { canEditDocument } from "@/lib/editable-document";
import { useAuthStore } from "@/store/auth-store";
import type { Document } from "@/types/documents";
import type { ValidationContext } from "@/types/workflows";
import {
  getDocumentEditableContent,
  saveDocumentEdit,
} from "@/services/collaboration.service";

type DocumentTextEditorProps = {
  doc: Document;
  validationCtx?: ValidationContext | null;
  onSaved: () => void;
};

export function DocumentTextEditor({ doc, validationCtx, onSaved }: DocumentTextEditorProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [initial, setInitial] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editable, setEditable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDocumentEditableContent(doc.id);
      setEditable(res.editable);
      if (!res.editable) {
        setError(res.reason || "Edition indisponible pour ce fichier.");
        return;
      }
      setContent(res.content ?? "");
      setInitial(res.content ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impossible de charger le contenu");
    } finally {
      setLoading(false);
    }
  }, [doc.id]);

  useEffect(() => {
    load();
  }, [load]);

  const editGate = canEditDocument({
    ...doc,
    capabilities: user?.capabilities,
  });
  const dirty = content !== initial;

  const handleSave = async () => {
    if (!editGate.ok) return;
    setSaving(true);
    setError(null);
    try {
      const ver = await saveDocumentEdit(doc.id, content, comment);
      toast.success(`Version v${ver.version_number} enregistree`);
      setInitial(content);
      setComment("");
      onSaved();
      if (
        validationCtx?.rejected_at_version != null &&
        (ver.version_number > validationCtx.rejected_at_version ||
          validationCtx.can_restart_validation)
      ) {
        toast.message("Correction enregistree", {
          description: "Vous pouvez relancer la validation depuis le bandeau ci-dessus.",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Echec enregistrement";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!doc.editable && !loading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <PencilSimple className="h-4 w-4 text-emerald-700" weight="duotone" />
        <span>Edition en ligne — enregistrer cree une nouvelle version automatiquement.</span>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Chargement du contenu...</p>
      ) : !editable ? (
        error && <ErrorBanner message={error} />
      ) : (
        <>
          {!editGate.ok && <ErrorBanner message={editGate.reason || "Edition bloquee"} />}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!editGate.ok || saving}
            className="min-h-[280px] w-full resize-y rounded-2xl border border-slate-200 bg-zinc-50/50 p-4 font-mono text-sm leading-relaxed text-zinc-800 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            spellCheck={false}
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="editComment">Commentaire de version (optionnel)</Label>
              <Input
                id="editComment"
                placeholder="Ex: correction paragraphe 2"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={!editGate.ok || saving}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!editGate.ok || saving || !dirty}
              className="gap-1.5 sm:mb-0.5"
            >
              <FloppyDisk className="h-4 w-4" weight="bold" />
              {saving ? "Enregistrement..." : "Enregistrer nouvelle version"}
            </Button>
          </div>
          {error && editGate.ok && <ErrorBanner message={error} />}
        </>
      )}
    </div>
  );
}
