"use client";

import Link from "next/link";
import { Key, SignOut, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PagePanel } from "@/components/layout/page-panel";
import { MfaSettings } from "@/components/settings/mfa-settings";
import { useAuthStore } from "@/store/auth-store";

export default function ParametresSecuritePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-6">
      {user?.must_change_password && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
          <p>Un changement de mot de passe est requis.</p>
        </div>
      )}

      <PagePanel title="Sécurité">
        <div className="divide-y divide-border">
          <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Mot de passe</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Minimum 8 caractères
              </p>
            </div>
            <Link href="/changer-mot-de-passe">
              <Button className="gap-1.5">
                <Key className="h-4 w-4" weight="duotone" />
                Modifier
              </Button>
            </Link>
          </div>
          <div className="py-6">
            <MfaSettings />
          </div>
          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Déconnexion</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Terminer la session sur cet appareil
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => void logout()}
            >
              <SignOut className="h-4 w-4" weight="bold" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </PagePanel>
    </div>
  );
}
