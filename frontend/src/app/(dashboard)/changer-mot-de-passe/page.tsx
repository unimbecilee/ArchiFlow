"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Key, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/layout/error-banner";
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
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Echec mise a jour";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <div className="surface-card w-full max-w-md p-8">
        <span className="inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
          <Key className="h-6 w-6" weight="duotone" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900">
          Definissez votre mot de passe
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Premiere connexion pour <span className="font-medium text-zinc-900">{user?.email}</span>.
          Ce mot de passe sera utilise sur ArchiFlow et ArchiFlow +.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && <ErrorBanner message={error} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <p className="text-xs text-zinc-500">8 caracteres minimum.</p>
          </div>

          <div className="flex flex-col gap-2">
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
          className="mt-6 w-full text-center text-sm text-zinc-500 hover:text-zinc-700"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
