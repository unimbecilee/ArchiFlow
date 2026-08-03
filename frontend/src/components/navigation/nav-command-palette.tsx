"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, MagnifyingGlass } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import {
  buildMenuAccessContext,
  filterNavMenuEntries,
  listNavMenuEntries,
  type NavMenuEntry,
} from "@/lib/menu-access";
import { searchDocuments } from "@/services/documents.service";
import type { Document } from "@/types/documents";
import { cn } from "@/lib/utils";

type NavCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PaletteRow =
  | { kind: "nav"; entry: NavMenuEntry }
  | { kind: "doc"; doc: Document }
  | { kind: "doc-loading" }
  | { kind: "doc-empty" };

export function useNavCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}

const SEARCH_MIN = 2;
const DOC_LIMIT = 8;

export function NavCommandPalette({ open, onOpenChange }: NavCommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [docHits, setDocHits] = useState<Document[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchGen = useRef(0);

  const navEntries = useMemo(() => {
    const ctx = buildMenuAccessContext(user);
    return filterNavMenuEntries(listNavMenuEntries(ctx), query);
  }, [user, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setDocHits([]);
      setDocLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < SEARCH_MIN) {
      setDocHits([]);
      setDocLoading(false);
      return;
    }

    const gen = ++searchGen.current;
    setDocLoading(true);
    const timer = setTimeout(() => {
      void searchDocuments(q, true)
        .then((docs) => {
          if (gen !== searchGen.current) return;
          setDocHits(docs.slice(0, DOC_LIMIT));
        })
        .catch(() => {
          if (gen !== searchGen.current) return;
          setDocHits([]);
        })
        .finally(() => {
          if (gen === searchGen.current) setDocLoading(false);
        });
    }, 280);

    return () => clearTimeout(timer);
  }, [query, open]);

  const rows: PaletteRow[] = useMemo(() => {
    const out: PaletteRow[] = navEntries.map((entry) => ({ kind: "nav", entry }));
    const q = query.trim();
    if (q.length < SEARCH_MIN) return out;

    if (docLoading) {
      out.push({ kind: "doc-loading" });
      return out;
    }
    if (docHits.length === 0) {
      out.push({ kind: "doc-empty" });
      return out;
    }
    for (const doc of docHits) {
      out.push({ kind: "doc", doc });
    }
    return out;
  }, [navEntries, query, docHits, docLoading]);

  const selectableRows = useMemo(
    () => rows.filter((r) => r.kind === "nav" || r.kind === "doc"),
    [rows]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, docLoading, docHits.length, navEntries.length]);

  const activate = useCallback(
    (row: PaletteRow) => {
      if (row.kind === "nav") {
        onOpenChange(false);
        router.push(row.entry.path);
      } else if (row.kind === "doc") {
        onOpenChange(false);
        router.push(`/documents/${row.doc.id}`);
      }
    },
    [onOpenChange, router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, selectableRows.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectableRows[activeIndex]) {
      e.preventDefault();
      activate(selectableRows[activeIndex]);
    }
  };

  let selectableCursor = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-slate-200/80 px-4 py-3 text-left">
          <DialogTitle className="text-base">Rechercher</DialogTitle>
          <DialogDescription className="sr-only">
            Navigation et documents ArchiFlow
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-slate-200/80 px-3 py-2">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Pages, documents (2+ caracteres)..."
              className="border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <ul className="max-h-[min(52vh,360px)] overflow-y-auto py-2" role="listbox">
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">Aucun resultat</li>
          ) : (
            rows.map((row, index) => {
              if (row.kind === "doc-loading") {
                return (
                  <li key="doc-loading" className="px-4 py-3 text-sm text-zinc-500">
                    Recherche de documents...
                  </li>
                );
              }
              if (row.kind === "doc-empty") {
                return (
                  <li key="doc-empty" className="px-4 py-3 text-sm text-zinc-500">
                    Aucun document pour cette requete
                  </li>
                );
              }

              if (row.kind === "nav") {
                selectableCursor += 1;
                const isActive = selectableCursor === activeIndex;
                return (
                  <li key={`nav-${row.entry.path}`} role="option" aria-selected={isActive}>
                    {index === 0 && (
                      <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Pages
                      </p>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors",
                        isActive ? "bg-emerald-50 text-zinc-900" : "hover:bg-zinc-50"
                      )}
                      onMouseEnter={() => setActiveIndex(selectableCursor)}
                      onClick={() => activate(row)}
                    >
                      <span className="text-sm font-medium">{row.entry.title}</span>
                      <span className="text-xs text-zinc-500">
                        {row.entry.section} · {row.entry.path}
                      </span>
                    </button>
                  </li>
                );
              }

              if (row.kind === "doc") {
                const showDocHeading =
                  index === 0 || rows[index - 1]?.kind === "nav" || rows[index - 1]?.kind === "doc-loading";
                selectableCursor += 1;
                const isActive = selectableCursor === activeIndex;
                return (
                  <li key={`doc-${row.doc.id}`} role="option" aria-selected={isActive}>
                    {showDocHeading && (
                      <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Documents
                      </p>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                        isActive ? "bg-emerald-50 text-zinc-900" : "hover:bg-zinc-50"
                      )}
                      onMouseEnter={() => setActiveIndex(selectableCursor)}
                      onClick={() => activate(row)}
                    >
                      <span className="mt-0.5 rounded-lg bg-zinc-100 p-1.5 text-zinc-600">
                        <FileText className="h-4 w-4" weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{row.doc.titre}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {row.doc.file_name || row.doc.mime_type || "Document"} · /documents/{row.doc.id}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }

              return null;
            })
          )}
        </ul>
        <p className="border-t border-slate-200/80 px-4 py-2 text-[11px] text-zinc-500">
          Fleches · Entree · {SEARCH_MIN}+ caracteres pour les documents
        </p>
      </DialogContent>
    </Dialog>
  );
}
