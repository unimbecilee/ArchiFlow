"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentList } from "@/components/documents/document-list";
import { useDocumentOpenAction } from "@/lib/document-crud-actions";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import type { Document } from "@/types/documents";
import { searchDocuments } from "@/services/documents.service";

export default function RecherchePage() {
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const openAction = useDocumentOpenAction();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) {
      setError("Saisissez au moins 2 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      setDocs(await searchDocuments(q.trim()));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur recherche");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Documents"
        title="Recherche"
        description="Titre, description, nom de fichier, categorie et texte OCR indexe."
        icon={<MagnifyingGlass className="h-6 w-6" weight="duotone" />}
      />

      <PagePanel title="Requete" subtitle="Minimum 2 caracteres">
        <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search">Mot-cle</Label>
            <Input
              id="search"
              placeholder="Contrat, facture, onboarding..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <p className="text-xs text-zinc-500">Utilise le mode full-text si disponible cote API.</p>
          </div>
          <Button type="submit" disabled={loading} className="h-10 md:mb-6">
            {loading ? "Recherche..." : "Chercher"}
          </Button>
        </form>
      </PagePanel>

      {error && <ErrorBanner message={error} />}

      <PagePanel
        title="Resultats"
        subtitle={searched ? `${docs.length} resultat(s)` : "En attente de recherche"}
      >
        {!searched ? (
          <p className="text-sm text-zinc-600">Lancez une recherche pour afficher les documents correspondants.</p>
        ) : loading ? (
          <ListSkeleton />
        ) : (
          <DocumentList
            documents={docs}
            emptyMessage="Aucun document trouve"
            rowActions={[openAction]}
            storageKey="archiflow-search-view"
          />
        )}
      </PagePanel>
    </PageFrame>
  );
}
