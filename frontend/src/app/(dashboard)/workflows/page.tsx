"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle,
  GitBranch,
  ListBullets,
  Archive,
  ArrowRight,
} from "@phosphor-icons/react";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { listWorkflows } from "@/services/workflows.service";
import type { WorkflowDefinition } from "@/types/workflows";

const NAV_ITEMS = [
  {
    href: "/workflows/approbations",
    title: "Approbations",
    copy: "Fichiers en attente de votre validation",
    icon: CheckCircle,
    span: "md:col-span-2",
  },
  {
    href: "/workflows/en-cours",
    title: "En cours",
    copy: "Vos demandes actives",
    icon: ListBullets,
    span: "",
  },
  {
    href: "/workflows/termines",
    title: "Termines",
    copy: "Filtres, historique decisions, mes validations",
    icon: Archive,
    span: "",
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);

  useEffect(() => {
    listWorkflows().then(setWorkflows);
  }, []);

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Workflows"
        title="Vue d'ensemble"
        description="Pilotez les circuits de validation documentaire et consultez les definitions actives."
        icon={<GitBranch className="h-6 w-6" weight="duotone" />}
      />

      <section className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        {NAV_ITEMS.map((item, index) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: index * 0.06 }}
            className={item.span}
          >
            <Link
              href={item.href}
              className="group surface-bento flex h-full flex-col justify-between p-8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <item.icon className="h-6 w-6 text-emerald-700" weight="duotone" />
              <div className="mt-8 space-y-2">
                <p className="text-lg font-semibold tracking-tight text-zinc-900">{item.title}</p>
                <p className="text-sm text-zinc-600">{item.copy}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  Ouvrir
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      <PagePanel title="Definitions" subtitle={`${workflows.length} workflow(s) disponible(s)`}>
        {workflows.length === 0 ? (
          <p className="text-sm text-zinc-600">Aucun workflow configure.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {workflows.map((w) => (
              <li key={w.id} className="py-4 first:pt-0 last:pb-0">
                <p className="font-medium text-zinc-900">{w.name}</p>
                <p className="mt-1 text-sm text-zinc-600">{w.description}</p>
                <p className="mt-2 font-mono text-xs text-zinc-400">
                  {w.steps?.length ?? 0} etape(s)
                </p>
              </li>
            ))}
          </ul>
        )}
      </PagePanel>
    </PageFrame>
  );
}
