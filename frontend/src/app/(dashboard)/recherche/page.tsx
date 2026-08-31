"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentQuickPreview } from "@/components/documents/document-quick-preview";
import { useDocumentOpenAction } from "@/lib/document-crud-actions";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import type { Document } from "@/types/documents";
import { searchDocumentsDetailed } from "@/services/documents.service";

export default function RecherchePage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [classification, setClassification] = useState("");
  const [category, setCategory] = useState("");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const openAction = useDocumentOpenAction();

  const { data, isFetching, isError, error, isFetched } = useQuery({
    queryKey: ["search", submitted, classification, category],
    queryFn: () =>
      searchDocumentsDetailed(submitted, {
        classification: classification || undefined,
        category: category || undefined,
      }),
    enabled: submitted.trim().length >= 2,
  });

  const docs = data?.documents ?? [];
  const facets = data?.facets;

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setSubmitted(q.trim());
  };

  return (
    <PageFrame>
      <PageHeader
        title="Recherche"
        hideTitle
        description="Titre, description, nom de fichier, catégorie et texte OCR indexé — documents possédés et partagés."
        icon={<MagnifyingGlass className="h-6 w-6" weight="duotone" />}
      />

      <PagePanel title="Requête" subtitle="Minimum 2 caractères">
        <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="search">Mot-clé</Label>
            <Input
              id="search"
              placeholder="Contrat, facture, onboarding…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isFetching} className="h-10">
            {isFetching ? "Recherche…" : "Chercher"}
          </Button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facetClass">Classification</Label>
            <Select
              id="facetClass"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
            >
              <option value="">Toutes</option>
              {Object.keys(facets?.classification ?? {}).map((k) => (
                <option key={k} value={k}>
                  {k} ({facets?.classification?.[k]})
                </option>
              ))}
              {["PUBLIC", "INTERNE", "CONFIDENTIEL"]
                .filter((k) => !facets?.classification?.[k])
                .map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facetCat">Type / catégorie</Label>
            <Select id="facetCat" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Tous</option>
              {Object.keys(facets?.category ?? {}).map((k) => (
                <option key={k} value={k}>
                  {k} ({facets?.category?.[k]})
                </option>
              ))}
            </Select>
          </div>
        </div>
        {facets && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(facets.classification ?? {}).map(([k, n]) => (
              <Badge key={k}>
                {k} · {n}
              </Badge>
            ))}
          </div>
        )}
      </PagePanel>

      {isError && <ErrorBanner message={error instanceof Error ? error.message : "Erreur recherche"} />}

      <PagePanel
        title="Résultats"
        subtitle={isFetched ? `${data?.total ?? docs.length} résultat(s)` : "En attente de recherche"}
      >
        {!submitted ? (
          <p className="text-sm text-muted-foreground">
            Lancez une recherche pour afficher les documents correspondants.
          </p>
        ) : isFetching ? (
          <ListSkeleton />
        ) : (
          <DocumentList
            documents={docs}
            emptyMessage="Aucun document trouvé"
            rowActions={[openAction]}
            storageKey="archiflow-search-view"
            onQuickPreview={setPreviewDoc}
          />
        )}
      </PagePanel>
      <DocumentQuickPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </PageFrame>
  );
}
