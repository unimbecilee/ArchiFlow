"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileDoc } from "@phosphor-icons/react";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { canEditOfficeDocument } from "@/lib/office-document";
import { useAuthStore } from "@/store/auth-store";
import type { Document } from "@/types/documents";
import { getOfficeEditorConfig } from "@/services/office.service";

type DocumentOfficeEditorProps = {
  doc: Document;
  onSaved?: () => void;
};

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        id: string,
        config: Record<string, unknown>
      ) => { destroyEditor?: () => void };
    };
  }
}

export function DocumentOfficeEditor({ doc, onSaved }: DocumentOfficeEditorProps) {
  const { user } = useAuthStore();
  const containerId = `onlyoffice-${doc.id}`;
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("view");

  const gate = canEditOfficeDocument({
    ...doc,
    role: user?.role,
    capabilities: user?.capabilities,
  });

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Impossible de charger OnlyOffice"));
      document.body.appendChild(s);
    });

  const mount = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const cfg = await getOfficeEditorConfig(doc.id);
      if (!cfg.enabled || !cfg.config) {
        setHint(
          cfg.reason ||
            "OnlyOffice non active. Definissez ONLYOFFICE_ENABLED=true et demarrez le service Document Server (profil Docker office)."
        );
        return;
      }
      setMode(cfg.mode || "view");
      const server = cfg.document_server || process.env.NEXT_PUBLIC_ONLYOFFICE_URL || "";
      if (!server) {
        setHint("URL Document Server manquante (NEXT_PUBLIC_ONLYOFFICE_URL).");
        return;
      }
      await loadScript(`${server.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`);
      if (!window.DocsAPI) {
        setError("API OnlyOffice indisponible");
        return;
      }
      editorRef.current?.destroyEditor?.();
      editorRef.current = new window.DocsAPI.DocEditor(containerId, cfg.config);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur chargement editeur");
    } finally {
      setLoading(false);
    }
  }, [doc.id, containerId]);

  useEffect(() => {
    mount();
    return () => {
      editorRef.current?.destroyEditor?.();
    };
  }, [mount]);

  useEffect(() => {
    const onFocus = () => onSaved?.();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [onSaved]);

  if (!doc.office_editable) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <FileDoc className="h-4 w-4 text-emerald-700" weight="duotone" />
        <span>
          Edition bureautique (Word / Excel / PowerPoint)
          {mode === "view" && " — lecture seule"}
        </span>
      </div>
      {!gate.ok && <ErrorBanner message={gate.reason || "Edition indisponible"} />}
      {error && <ErrorBanner message={error} />}
      {hint && (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {hint}
        </p>
      )}
      {loading && !hint ? <ListSkeleton rows={4} /> : null}
      <div
        id={containerId}
        className="min-h-[32rem] w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
      />
    </div>
  );
}
