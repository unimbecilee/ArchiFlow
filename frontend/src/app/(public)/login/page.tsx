"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockKey, ShieldCheck } from "@phosphor-icons/react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyMfa, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [mfaCode, setMfaCode] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [allowRegister, setAllowRegister] = useState(true);

  useEffect(() => {
    api
      .get<{ success: boolean; data: { allow_public_register?: boolean } }>("/api/auth/config")
      .then((res) => setAllowRegister(res.data.data?.allow_public_register !== false))
      .catch(() => setAllowRegister(process.env.NEXT_PUBLIC_AUTH_ALLOW_PUBLIC_REGISTER !== "false"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (mfaStep) {
        await verifyMfa(formData.email, mfaCode);
        router.push("/");
        return;
      }
      const result = await login({
        email: formData.email,
        password: formData.password,
      });
      if (result.mfaRequired) {
        setMfaStep(true);
        return;
      }
      router.push("/");
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <AuthSplitLayout
      title={mfaStep ? "Vérification en deux étapes" : "Connexion"}
      subtitle={
        mfaStep
          ? "Saisissez le code à 6 chiffres de votre application d’authentification."
          : "Accédez à votre espace documentaire."
      }
      heroTitle="Vos documents, classés et trouvables."
      heroCopy="GED auto-hébergée pour ETI et administrations : métadonnées, recherche, workflows d’approbation et partage, sans complexité inutile."
      features={[
        {
          icon: ShieldCheck,
          title: "Contrôle d’accès granulaire",
          copy: "Rôles, partages et journal d’audit des actions sensibles.",
        },
        {
          icon: LockKey,
          title: "Intégrité et conservation",
          copy: "Empreinte SHA-256, conservation et legal hold sur la fiche document.",
        },
      ]}
      footer={
        allowRegister ? (
          <>
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Créer un compte
            </Link>
          </>
        ) : (
          <span>Accès sur invitation de votre administrateur.</span>
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!mfaStep ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="prenom.nom@votre-organisation.fr"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mfaCode">Code TOTP</Label>
            <Input
              id="mfaCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ""))}
              required
              maxLength={16}
            />
            <button
              type="button"
              className="self-start text-xs text-muted-foreground underline"
              onClick={() => {
                setMfaStep(false);
                setMfaCode("");
                clearError();
              }}
            >
              Revenir à la connexion
            </button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Vérification…" : mfaStep ? "Valider le code" : "Se connecter"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
