"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DownloadSimple, FileDoc } from "@phosphor-icons/react";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { Button } from "@/components/ui/button";
import { canEditOfficeDocument } from "@/lib/office-document";
import { useAuthStore } from "@/store/auth-store";
import type { Document } from "@/types/documents";
import { getOfficeEditorConfig } from "@/services/office.service";
import { downloadDocumentFile } from "@/services/documents.service";

type DocumentOfficeEditorProps = {
  doc: Document;
  onSaved?: () => void;
};

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        id: string,
        config: Record<string, unknown>,
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

export function DocumentOfficeEditor({
  doc,
  onSaved,
}: DocumentOfficeEditorProps) {
  const { user } = useAuthStore();
  const containerId = `office-editor-${doc.id}`;
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null);
  const mountGen = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("view");
  const [provider, setProvider] = useState<"collabora" | "onlyoffice" | null>(
    null,
  );
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
      s.onerror = () =>
        reject(new Error("Impossible de charger le Document Server"));
      document.body.appendChild(s);
    });

  const mount = useCallback(async () => {
    const gen = ++mountGen.current;
    setLoading(true);
    setError(null);
    setHint(null);
    setCollaboraUrl(null);
    setProvider(null);
    try {
      const cfg = await getOfficeEditorConfig(doc.id);
      if (gen !== mountGen.current) return;
      if (!cfg.enabled || !cfg.config) {
        setHint(
          cfg.reason ||
            "Editeur inactif. Activez COLLABORA_ENABLED=true et demarrez : docker compose --profile office up -d collabora",
        );
        return;
      }
      setMode(cfg.mode || "view");
      const cfgProvider = cfg.config.provider;

      if (
        cfgProvider === "collabora" &&
        typeof cfg.config.editor_url === "string"
      ) {
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
        cfg.document_server || process.env.NEXT_PUBLIC_ONLYOFFICE_URL,
      );
      if (!server) {
        setHint(
          "URL OnlyOffice manquante. Preferer Collabora (COLLABORA_ENABLED) ou definir NEXT_PUBLIC_ONLYOFFICE_URL=http://localhost:9980",
        );
        return;
      }
      await loadScript(`${server}/web-apps/apps/api/documents/api.js`);
      if (gen !== mountGen.current) return;
      if (!window.DocsAPI) {
        setError("API OnlyOffice indisponible");
        return;
      }
      editorRef.current?.destroyEditor?.();
      editorRef.current = new window.DocsAPI.DocEditor(containerId, cfg.config);
    } catch (e: unknown) {
      if (gen !== mountGen.current) return;
      setError(e instanceof Error ? e.message : "Erreur chargement editeur");
    } finally {
      if (gen === mountGen.current) setLoading(false);
    }
  }, [doc.id, containerId]);

  useEffect(() => {
    void mount();
    return () => {
      mountGen.current += 1;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileDoc
          className="h-4 w-4 text-accent-soft-foreground"
          weight="duotone"
        />
        <span>
          {label} (Word / Excel / PowerPoint)
          {mode === "view" && " — lecture seule"}
        </span>
      </div>
      {!gate.ok && (
        <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {gate.reason} Mode lecture seule.
        </p>
      )}
      {error && <ErrorBanner message={error} />}
      {hint && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-muted px-4 py-4">
          <p className="text-sm text-muted-foreground">{hint}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              void downloadDocumentFile(doc.id, doc.file_name || doc.titre)
            }
          >
            <DownloadSimple className="h-4 w-4" />
            Telecharger le fichier
          </Button>
        </div>
      )}
      {loading && !hint ? <ListSkeleton rows={4} /> : null}
      {!hint && provider === "collabora" && collaboraUrl ? (
        <iframe
          title={`Collabora — ${doc.titre}`}
          src={collaboraUrl}
          className="min-h-[32rem] w-full rounded-xl border border-border bg-card"
          allow="clipboard-read; clipboard-write"
        />
      ) : null}
      {!hint && provider === "onlyoffice" ? (
        <div
          id={containerId}
          className="min-h-[32rem] w-full overflow-hidden rounded-xl border border-border bg-card"
        />
      ) : null}
    </div>
  );
}
