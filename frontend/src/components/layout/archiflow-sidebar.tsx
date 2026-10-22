"use client";

import { Archive } from "@phosphor-icons/react";
import { ArchiFlowSidebarNav } from "./archiflow-sidebar-nav";
import { SidebarProfileCard } from "./sidebar-profile-card";

export function ArchiFlowSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-brand text-sidebar-active-foreground shadow-e1">
          <Archive className="h-5 w-5" weight="bold" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            ArchiFlow
          </p>
          <p className="text-[11px] text-sidebar-muted">Espace documentaire</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <ArchiFlowSidebarNav indicatorId="desktop" />
      </div>

      <div className="border-t border-sidebar-border p-3">
        <SidebarProfileCard />
      </div>
    </aside>
  );
}
