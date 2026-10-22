"use client";

import Link from "next/link";
import type { Document } from "@/types/documents";
import { Badge } from "@/components/ui/badge";
import { IntegrityHash } from "./integrity-hash";

export function DocumentInspector({ doc }: { doc: Document | null }) {
  if (!doc) {
    return (
      <p className="text-sm text-muted-foreground">
        Sélectionnez un document pour afficher ses métadonnées.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium">{doc.titre}</p>
        <p className="text-xs text-muted-foreground">
          {doc.file_name || doc.mime_type}
        </p>
      </div>
      {doc.classification && <Badge>{doc.classification}</Badge>}
      {doc.on_hold && (
        <Badge className="border-warning/40 bg-warning-soft text-warning-soft-foreground">
          Conservation
        </Badge>
      )}
      <dl className="space-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Taille</dt>
          <dd>{doc.taille_formatee || `${doc.taille} o`}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Empreinte</dt>
          <dd>
            <IntegrityHash hash={doc.content_sha256} />
          </dd>
        </div>
        {doc.department && (
          <div>
            <dt className="text-muted-foreground">Département</dt>
            <dd>{doc.department}</dd>
          </div>
        )}
      </dl>
      <Link
        href={`/documents/${doc.id}`}
        className="inline-block text-sm text-primary"
      >
        Ouvrir la fiche
      </Link>
    </div>
  );
}
