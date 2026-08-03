"use client";

import { motion } from "framer-motion";
import { ArchiFlowSidebarNav } from "./archiflow-sidebar-nav";
import { SidebarProfileCard } from "./sidebar-profile-card";

export function ArchiFlowSidebar() {
  return (
    <aside className="relative hidden w-[17.5rem] shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950 text-zinc-300 md:flex">
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(16,185,129,0.18), transparent 42%), radial-gradient(circle at 80% 100%, rgba(255,255,255,0.04), transparent 35%)",
        }}
      />

      <motion.div
        className="relative border-b border-white/10 px-6 py-7"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="flex items-center gap-3">
          <motion.div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
            AF
          </motion.div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Archi<span className="text-emerald-400">Flow</span>
            </h1>
            <p className="text-xs text-zinc-500">GED &amp; workflows</p>
          </div>
        </div>
      </motion.div>

      <div className="relative flex-1 overflow-y-auto px-4 py-6">
        <ArchiFlowSidebarNav />
      </div>

      <div className="relative border-t border-white/10 px-6 py-5">
        <SidebarProfileCard />
        <p className="mt-4 text-center text-[11px] text-zinc-600">ArchiFlow v3</p>
      </div>
    </aside>
  );
}
