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

function absoluteServerUrl(raw: string | undefined): string | null {
  const s = (raw || "").trim().replace(/\/$/, "");
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return null;
}

export function DocumentOfficeEditor({ doc, onSaved }: DocumentOfficeEditorProps) {
  const { user } = useAuthStore();
  const containerId = `office-editor-${doc.id}`;
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("view");
  const [provider, setProvider] = useState<"collabora" | "onlyoffice" | null>(null);
  const [collaboraUrl, setCollaboraUrl] = useState<string | null>(null);

  const gate = canEditOfficeDocument({
    ...doc,
    capabilities: user?.capabilities,
  });

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (!src.startsWith("http://") && !src.startsWith("https://")) {
        reject(new Error("URL Document Server invalide (absolue requise)"));
        return;
      }
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Impossible de charger le Document Server"));
      document.body.appendChild(s);
    });

  const mount = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    setCollaboraUrl(null);
    setProvider(null);
    try {
      const cfg = await getOfficeEditorConfig(doc.id);
      if (!cfg.enabled || !cfg.config) {
        setHint(
          cfg.reason ||
            "Editeur inactif. Activez COLLABORA_ENABLED=true et demarrez : docker compose --profile office up -d collabora"
        );
        return;
      }
      setMode(cfg.mode || "view");
      const cfgProvider = cfg.config.provider;

      if (cfgProvider === "collabora" && typeof cfg.config.editor_url === "string") {
        const url = cfg.config.editor_url;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          setError("URL Collabora invalide renvoyee par l'API");
          return;
        }
        setProvider("collabora");
        setCollaboraUrl(url);
        return;
      }

      setProvider("onlyoffice");
      const server = absoluteServerUrl(
        cfg.document_server || process.env.NEXT_PUBLIC_ONLYOFFICE_URL
      );
      if (!server) {
        setHint(
          "URL OnlyOffice manquante. Preferer Collabora (COLLABORA_ENABLED) ou definir NEXT_PUBLIC_ONLYOFFICE_URL=http://localhost:9980"
        );
        return;
      }
      await loadScript(`${server}/web-apps/apps/api/documents/api.js`);
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

  const label =
    provider === "collabora"
      ? "Collabora Online"
      : provider === "onlyoffice"
        ? "OnlyOffice"
        : "Editeur bureautique";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <FileDoc className="h-4 w-4 text-emerald-700" weight="duotone" />
        <span>
          {label} (Word / Excel / PowerPoint)
          {mode === "view" && " — lecture seule"}
        </span>
      </div>
      {/* 5A : message seulement si pas de droit d'ecriture effectif */}
      {!gate.ok && doc.can_write === false && (
        <p className="rounded-xl border border-slate-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {gate.reason} Mode lecture seule.
        </p>
      )}
      {error && <ErrorBanner message={error} />}
      {hint && (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {hint}
        </p>
      )}
      {loading && !hint ? <ListSkeleton rows={4} /> : null}
      {provider === "collabora" && collaboraUrl ? (
        <iframe
          title={`Collabora — ${doc.titre}`}
          src={collaboraUrl}
          className="min-h-[32rem] w-full rounded-xl border border-slate-200 bg-white"
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div
          id={containerId}
          className="min-h-[32rem] w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
        />
      )}
    </div>
  );
}
