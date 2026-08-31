"use client";

import { Suspense } from "react";
import { DocumentsVaultView } from "@/components/documents/documents-vault-view";
import { SkeletonDocuments, SkeletonStats } from "@/components/states";

function VaultFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <SkeletonStats />
      <SkeletonDocuments rows={8} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<VaultFallback />}>
      <DocumentsVaultView />
    </Suspense>
  );
}
