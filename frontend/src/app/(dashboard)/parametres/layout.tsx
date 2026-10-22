"use client";

import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function ParametresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageFrame className="max-w-[min(1100px,100%)]">
      <PageHeader
        title="Paramètres"
        description="Compte, sécurité et options de votre espace."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="lg:sticky lg:top-28">
          <SettingsNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </PageFrame>
  );
}
