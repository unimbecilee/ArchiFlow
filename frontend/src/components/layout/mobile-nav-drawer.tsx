"use client";

import { Archive, List, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArchiFlowSidebarNav } from "./archiflow-sidebar-nav";
import { SidebarProfileCard } from "./sidebar-profile-card";

export function MobileNavMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
      aria-label="Ouvrir le menu"
      onClick={onClick}
    >
      <List className="h-5 w-5" />
    </button>
  );
}

type MobileNavMenuPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileNavMenuPanel({ open, onOpenChange }: MobileNavMenuPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute -right-11 top-3 rounded-lg bg-sidebar p-2 text-sidebar-foreground"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5 px-5 py-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-brand text-sidebar-active-foreground shadow-e1">
                <Archive className="h-5 w-5" weight="bold" />
              </div>
              <span className="text-sm font-semibold text-sidebar-foreground">ArchiFlow</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <ArchiFlowSidebarNav indicatorId="mobile" onNavigate={() => onOpenChange(false)} />
            </div>
            <div className="border-t border-sidebar-border p-3">
              <SidebarProfileCard onNavigate={() => onOpenChange(false)} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function MobileNavDrawer(props: MobileNavMenuPanelProps) {
  return (
    <>
      <MobileNavMenuButton onClick={() => props.onOpenChange(true)} />
      <MobileNavMenuPanel {...props} />
    </>
  );
}