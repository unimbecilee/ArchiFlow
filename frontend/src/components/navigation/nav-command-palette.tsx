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
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-zinc-100 bg-white px-5 pb-3 pt-5 text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <MagnifyingGlass className="h-4 w-4" weight="duotone" />
            </span>
            <DialogTitle className="text-[15px] font-semibold">Rechercher</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Navigation et documents ArchiFlow
          </DialogDescription>
          <p className="mt-1 text-xs text-zinc-500">Pages, documents et actions — 2+ caractères pour les documents</p>
        </DialogHeader>
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-3 py-3">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" weight="bold" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Pages, documents (2+ caractères)… tapez / ou Ctrl K"
              className="h-10 rounded-xl border-zinc-200 bg-white pl-10 shadow-sm placeholder:text-zinc-400 focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
            />
          </div>
        </div>
        <ul className="max-h-[min(56vh,380px)] overflow-y-auto bg-white px-2 py-2" role="listbox">
          {rows.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center">
              <p className="text-sm font-medium text-zinc-700">Aucun résultat</p>
              <p className="mt-1 text-xs text-zinc-500">Essayez un autre mot-clé</p>
            </li>
          ) : (
            rows.map((row, index) => {
              if (row.kind === "doc-loading") {
                return (
                  <li key="doc-loading" className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-sm text-zinc-500">Recherche de documents…</span>
                  </li>
                );
              }
              if (row.kind === "doc-empty") {
                return (
                  <li key="doc-empty" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    Aucun document pour cette requête
                  </li>
                );
              }

              if (row.kind === "nav") {
                selectableCursor += 1;
                const isActive = selectableCursor === activeIndex;
                return (
                  <li key={`nav-${row.entry.path}`} role="option" aria-selected={isActive}>
                    {index === 0 && (
                      <p className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        Pages
                      </p>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                        isActive
                          ? "bg-emerald-50 text-zinc-900 shadow-sm ring-1 ring-emerald-200"
                          : "hover:bg-zinc-50"
                      )}
                      onMouseEnter={() => setActiveIndex(selectableCursor)}
                      onClick={() => activate(row)}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                          isActive ? "bg-white text-emerald-700 ring-emerald-200" : "bg-zinc-50 text-zinc-500 ring-zinc-200"
                        )}
                      >
                        <MagnifyingGlass className="h-3.5 w-3.5" weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-tight">{row.entry.title}</span>
                        <span className="block truncate text-xs leading-tight text-zinc-500">
                          {row.entry.section} · {row.entry.path}
                        </span>
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
                      <p className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        Documents
                      </p>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                        isActive
                          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                          : "hover:bg-zinc-50"
                      )}
                      onMouseEnter={() => setActiveIndex(selectableCursor)}
                      onClick={() => activate(row)}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                        <FileText className="h-4 w-4" weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-tight">{row.doc.titre}</span>
                        <span className="block truncate text-xs leading-tight text-zinc-500">
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
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
          <p className="text-[11px] leading-none text-zinc-500">
            <span className="hidden sm:inline">Flèches</span>
            <span className="sm:hidden">↑↓</span> · Entrée · Esc
          </p>
          <p className="hidden text-[11px] leading-none text-zinc-400 sm:block">
            {SEARCH_MIN}+ caractères pour les documents
          </p>
          <kbd className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-[10px] font-medium leading-none text-zinc-500 shadow-sm">
            ⌘K
          </kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}
