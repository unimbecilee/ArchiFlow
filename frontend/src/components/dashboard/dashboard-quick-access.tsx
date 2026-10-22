"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  UploadSimple,
  FolderOpen,
  Clock,
  TreeStructure,
  ShareNetwork,
  Star,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

type QuickAction = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords?: string[];
};

export function DashboardQuickAccess() {
  const [query, setQuery] = useState("");

  const actions = useMemo<QuickAction[]>(
    () => [
      {
        id: "import",
        href: "/importer",
        label: "Importer",
        description: "Déposer un ou plusieurs fichiers.",
        icon: <UploadSimple className="h-4 w-4" />,
        keywords: ["upload", "lot", "fichier"],
      },
      {
        id: "search",
        href: "/recherche",
        label: "Rechercher",
        description: "Titres, contenu et texte OCR.",
        icon: <MagnifyingGlass className="h-4 w-4" />,
        keywords: ["mot-clé", "ocr"],
      },
      {
        id: "documents",
        href: "/mes-documents",
        label: "Mes documents",
        description: "Arbre, table et inspecteur.",
        icon: <FolderOpen className="h-4 w-4" />,
        keywords: ["ged", "dossier"],
      },
      {
        id: "recent",
        href: "/documents-recents",
        label: "Récents",
        description: "Fichiers modifiés récemment.",
        icon: <Clock className="h-4 w-4" />,
      },
      {
        id: "workflows",
        href: "/workflows",
        label: "Workflows",
        description: "Circuits de validation.",
        icon: <TreeStructure className="h-4 w-4" />,
      },
      {
        id: "shared",
        href: "/documents-partages",
        label: "Partages",
        description: "Documents reçus.",
        icon: <ShareNetwork className="h-4 w-4" />,
      },
      {
        id: "favorites",
        href: "/favoris",
        label: "Favoris",
        description: "Documents suivis.",
        icon: <Star className="h-4 w-4" />,
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords?.some((k) => k.includes(q)),
    );
  }, [actions, query]);

  return (
    <section className="space-y-3" aria-labelledby="quick-access-heading">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p
            id="quick-access-heading"
            className="text-sm font-semibold text-foreground"
          >
            Accès rapide
          </p>
          <p className="text-sm text-muted-foreground">
            Import, recherche, coffre et workflows.
          </p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <MagnifyingGlass
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            weight="bold"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer les raccourcis…"
            className="pl-8"
            aria-label="Filtrer les accès rapides"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun raccourci pour « {query} ».
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((action) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className="surface-card surface-card-interactive flex gap-3 p-4 active:scale-[0.99]"
              >
                <span className="icon-well">{action.icon}</span>
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {action.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
