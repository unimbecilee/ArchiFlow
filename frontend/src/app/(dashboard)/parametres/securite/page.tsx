"use client";

import Link from "next/link";
import { Key, SignOut, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PagePanel } from "@/components/layout/page-panel";
import { useAuthStore } from "@/store/auth-store";

export default function ParametresSecuritePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-6">
      {user?.must_change_password && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
          <p>Un changement de mot de passe est requis.</p>
        </div>
      )}

      <PagePanel title="Securite">
        <div className="divide-y divide-slate-100">
          <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Mot de passe</p>
              <p className="mt-0.5 text-sm text-zinc-500">Minimum 8 caracteres</p>
            </div>
            <Link href="/changer-mot-de-passe">
              <Button className="gap-1.5">
                <Key className="h-4 w-4" weight="duotone" />
                Modifier
              </Button>
            </Link>
          </div>
          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Deconnexion</p>
              <p className="mt-0.5 text-sm text-zinc-500">Terminer la session sur cet appareil</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => void logout()}
            >
              <SignOut className="h-4 w-4" weight="bold" />
              Se deconnecter
            </Button>
          </div>
        </div>
      </PagePanel>
    </div>
  );
}
