"use client";

import Link from "next/link";
import { ErrorState } from "@/components/states";
import { getLastCorrelationId } from "@/lib/api";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9] px-4">
      <div className="w-full max-w-lg">
        <ErrorState
          title="Une erreur est survenue"
          description="Vos données ne sont pas affectées. Réessayez, ou communiquez la référence au support."
          correlationId={getLastCorrelationId()}
          onRetry={reset}
        />
        <div className="mt-4 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
