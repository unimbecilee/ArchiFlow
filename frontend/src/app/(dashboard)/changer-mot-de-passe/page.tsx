"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Key, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppDecor, PanelDecor } from "@/components/backgrounds";
import { ErrorBanner } from "@/components/layout/error-banner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function ChangerMotDePassePage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Minimum 8 caracteres");
      return;
    }
    if (newPassword !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.put("/api/auth/change-password", {
        new_password: newPassword,
      });
      await checkAuth();
      router.replace("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Echec mise a jour";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <AppDecor />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <PanelDecor />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto inline-flex rounded-2xl bg-accent-soft p-3 text-accent-soft-foreground">
              <Key className="h-6 w-6" weight="duotone" />
            </div>
            <CardTitle className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Definissez votre mot de passe
            </CardTitle>
            <CardDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Premiere connexion pour{" "}
              <span className="font-medium text-foreground">{user?.email}</span>
              . Ce mot de passe sera utilise sur ArchiFlow et ArchiFlow +.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorBanner message={error} />}

              <div className="space-y-2">
                <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
                <Input
                  id="new-pwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  8 caracteres minimum.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pwd">Confirmation</Label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <ShieldCheck className="h-4 w-4" weight="bold" />
                {loading ? "Enregistrement..." : "Enregistrer et continuer"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Se déconnecter
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
