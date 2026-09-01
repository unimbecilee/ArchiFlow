"use client";

import { Suspense } from "react";
import { DocumentsVaultView } from "@/components/documents/documents-vault-view";
import { SkeletonDocuments } from "@/components/states";

function VaultFallback() {
  return (
    <div className="mx-auto max-w-6xl">
      <SkeletonDocuments rows={8} />
    </div>
  );
}

export default function MesDocumentsPage() {
  return (
    <Suspense fallback={<VaultFallback />}>
      <DocumentsVaultView />
    </Suspense>
  );
}
