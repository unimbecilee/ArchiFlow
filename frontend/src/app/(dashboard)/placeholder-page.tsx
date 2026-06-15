"use client";

import { Wrench } from "@phosphor-icons/react";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";

export function PlaceholderPage({
  title,
  phase = "Phase B",
}: {
  title: string;
  phase?: string;
}) {
  return (
    <PageFrame>
      <PageHeader
        eyebrow="ArchiFlow"
        title={title}
        description="Ecran prevu — logique metier a porter depuis esag_ged."
        icon={<Wrench className="h-6 w-6" weight="duotone" />}
      />
      <PagePanel title={phase} subtitle="Implementation a venir">
        <p className="text-sm leading-relaxed text-zinc-600">
          Cette section sera connectee aux services backend dans une prochaine iteration.
        </p>
      </PagePanel>
    </PageFrame>
  );
}
