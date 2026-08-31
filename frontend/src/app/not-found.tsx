"use client";

import Link from "next/link";
import { EmptyState } from "@/components/states";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9] px-4">
      <div className="w-full max-w-lg">
        <EmptyState
          icon={MagnifyingGlass}
          title="Ce document n’existe pas ou a été déplacé"
          description="Vérifiez le lien, ou retournez à votre coffre. Vos données ne sont pas affectées."
          actionLabel="Retour au coffre"
          onAction={() => {
            window.location.href = "/mes-documents";
          }}
        />
        <div className="mt-3 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Vue d’ensemble</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
