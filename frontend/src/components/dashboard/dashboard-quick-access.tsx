"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlass,
  UploadSimple,
  FolderOpen,
  Clock,
  TreeStructure,
  ShareNetwork,
  Star,
  ArrowSquareOut,
  ArrowRight,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { ARCHIFLOW_PLUS } from "@/lib/branding";
import { cn } from "@/lib/utils";

type QuickAction = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  external?: boolean;
  accent?: "emerald" | "zinc" | "sky";
  keywords?: string[];
};

const ACCENT_STYLES = {
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-700",
    hover: "hover:border-emerald-200/80 hover:bg-emerald-50/50",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-700",
    hover: "hover:border-sky-200/80 hover:bg-sky-50/50",
  },
  zinc: {
    icon: "bg-zinc-500/10 text-zinc-700",
    hover: "hover:border-zinc-300 hover:bg-zinc-50/80",
  },
} as const;

function QuickActionCard({ action, index }: { action: QuickAction; index: number }) {
  const styles = ACCENT_STYLES[action.accent ?? "emerald"];
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("rounded-2xl p-3", styles.icon)}>{action.icon}</span>
        {action.external ? (
          <ArrowSquareOut className="h-4 w-4 shrink-0 text-zinc-400" weight="bold" />
        ) : (
          <ArrowRight
            className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"
            weight="bold"
          />
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col justify-end space-y-1">
        <p className="line-clamp-2 font-medium leading-snug text-zinc-900">{action.label}</p>
        <p className="line-clamp-2 text-sm leading-snug text-zinc-500">{action.description}</p>
      </div>
    </>
  );

  const className = cn(
    "group surface-bento flex h-full min-h-[8.5rem] flex-col p-5 text-left transition-all duration-300",
    "hover:-translate-y-0.5 active:scale-[0.99]",
    styles.hover
  );

  return (
    <motion.li
      layout
      className="h-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: index * 0.04 }}
    >
      {action.external ? (
        <a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
          {inner}
        </a>
      ) : (
        <Link href={action.href} className={className}>
          {inner}
        </Link>
      )}
    </motion.li>
  );
}

export function DashboardQuickAccess() {
  const [query, setQuery] = useState("");

  const actions = useMemo<QuickAction[]>(
    () => [
      {
        id: "import",
        href: "/importer",
        label: "Importer",
        description: "Deposer un ou plusieurs fichiers dans votre coffre.",
        icon: <UploadSimple className="h-6 w-6" weight="duotone" />,
        accent: "emerald",
        keywords: ["upload", "lot", "fichier"],
      },
      {
        id: "search",
        href: "/recherche",
        label: "Rechercher",
        description: "Full-text sur titres, contenu et OCR indexe.",
        icon: <MagnifyingGlass className="h-6 w-6" weight="duotone" />,
        accent: "emerald",
        keywords: ["mot-cle", "ocr"],
      },
      {
        id: "documents",
        href: "/mes-documents",
        label: "Mes documents",
        description: "Parcourir dossiers et fichiers de votre espace.",
        icon: <FolderOpen className="h-6 w-6" weight="duotone" />,
        accent: "emerald",
        keywords: ["ged", "dossier"],
      },
      {
        id: "recent",
        href: "/documents-recents",
        label: "Recents",
        description: "Fichiers modifies recemment.",
        icon: <Clock className="h-6 w-6" weight="duotone" />,
        accent: "zinc",
        keywords: ["historique", "activite"],
      },
      {
        id: "workflows",
        href: "/workflows",
        label: "Workflows",
        description: "Lancer ou suivre les circuits de validation.",
        icon: <TreeStructure className="h-6 w-6" weight="duotone" />,
        accent: "zinc",
        keywords: ["validation", "approbation"],
      },
      {
        id: "shared",
        href: "/documents-partages",
        label: "Partages",
        description: "Documents recus de vos collegues.",
        icon: <ShareNetwork className="h-6 w-6" weight="duotone" />,
        accent: "sky",
        keywords: ["collaboration"],
      },
      {
        id: "favorites",
        href: "/favoris",
        label: "Favoris",
        description: "Acces direct a vos documents suivis.",
        icon: <Star className="h-6 w-6" weight="duotone" />,
        accent: "sky",
        keywords: ["etoile"],
      },
      {
        id: "collaboration",
        href: "/ged/cells",
        label: ARCHIFLOW_PLUS,
        description: "Collaboration avancee — workspaces et partage d'equipe.",
        icon: <ShareNetwork className="h-6 w-6" weight="duotone" />,
        accent: "sky",
        keywords: ["collaboration", "collaboration avancee", "workspace", "equipe", "plus", "archiflow"],
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords?.some((k) => k.includes(q))
    );
  }, [actions, query]);

  return (
    <motion.section
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.08 }}
      aria-labelledby="quick-access-heading"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1 px-1">
          <p
            id="quick-access-heading"
            className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700"
          >
            Acces rapide
          </p>
          <p className="max-w-xl text-base text-zinc-600">
            Raccourcis vers les actions les plus frequentes — import, recherche, coffre et
            collaboration.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            weight="bold"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer les raccourcis..."
            className="h-11 rounded-2xl border-slate-200/80 bg-white pl-10 shadow-sm"
            aria-label="Filtrer les acces rapides"
          />
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-zinc-500"
          >
            Aucun raccourci pour « {query} ». Essayez import, recherche ou workflows.
          </motion.p>
        ) : (
          <motion.ul
            key="grid"
            layout
            className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
          >
            {filtered.map((action, index) => (
              <QuickActionCard key={action.id} action={action} index={index} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
