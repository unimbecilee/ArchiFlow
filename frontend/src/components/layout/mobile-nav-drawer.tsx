"use client";

import { List, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArchiFlowSidebarNav } from "./archiflow-sidebar-nav";
import { SidebarProfileCard } from "./sidebar-profile-card";

export function MobileNavMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0 md:hidden"
      aria-label="Ouvrir le menu"
      onClick={onClick}
    >
      <List className="h-5 w-5" />
    </Button>
  );
}

type MobileNavMenuPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileNavMenuPanel({ open, onOpenChange }: MobileNavMenuPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-[min(100vw,20rem)] max-w-[20rem] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-r border-zinc-800 bg-zinc-950 p-0 text-zinc-300 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:rounded-none">
        <DialogTitle className="sr-only">Menu ArchiFlow</DialogTitle>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-sm font-semibold text-emerald-400">
              AF
            </span>
            <span className="font-semibold text-white">
              Archi<span className="text-emerald-400">Flow</span>
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <ArchiFlowSidebarNav onNavigate={() => onOpenChange(false)} />
        </div>
        <div className="border-t border-white/10 px-4 py-4">
          <SidebarProfileCard onNavigate={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Bouton + panneau (legacy export). */
export function MobileNavDrawer(props: MobileNavMenuPanelProps) {
  return (
    <>
      <MobileNavMenuButton onClick={() => props.onOpenChange(true)} />
      <MobileNavMenuPanel {...props} />
    </>
  );
}
