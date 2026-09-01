"use client";

import { Archive } from "@phosphor-icons/react";
import { ArchiFlowSidebarNav } from "./archiflow-sidebar-nav";
import { SidebarProfileCard } from "./sidebar-profile-card";

export function ArchiFlowSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 flex-col bg-zinc-950 text-zinc-400 lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20">
          <Archive className="h-5 w-5" weight="bold" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-white">ArchiFlow</p>
          <p className="text-[11px] text-zinc-500">Espace documentaire</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <ArchiFlowSidebarNav indicatorId="desktop" />
      </div>

      <div className="border-t border-zinc-800/80 p-3">
        <SidebarProfileCard />
      </div>
    </aside>
  );
}
