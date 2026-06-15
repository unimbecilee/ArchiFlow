"use client";

import { memo } from "react";
import { motion } from "framer-motion";

const ACTIVITY = [
  { label: "Contrat fournisseur Q2", status: "En revue", tone: "amber" },
  { label: "Note de frais Mars", status: "Valide", tone: "emerald" },
  { label: "PV reunion direction", status: "Archive", tone: "zinc" },
  { label: "Dossier RH onboarding", status: "En attente", tone: "amber" },
];

function toneClass(tone: string) {
  if (tone === "emerald") return "bg-emerald-500/15 text-emerald-700";
  if (tone === "amber") return "bg-amber-500/15 text-amber-700";
  return "bg-zinc-500/10 text-zinc-600";
}

export const DashboardLiveStatus = memo(function DashboardLiveStatus() {
  return (
    <div className="space-y-3">
      {ACTIVITY.map((item, index) => (
        <motion.div
          key={item.label}
          layout
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: index * 0.08,
          }}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-zinc-50/80 px-4 py-3"
        >
          <motion.span
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.25, 1], opacity: [1, 0.55, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.3 }}
          />
          <span className="flex-1 truncate text-sm text-zinc-700">{item.label}</span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${toneClass(item.tone)}`}
          >
            {item.status}
          </span>
        </motion.div>
      ))}
    </div>
  );
});
