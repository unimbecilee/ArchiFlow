"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKey, UserPlus } from "@phosphor-icons/react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [allowRegister, setAllowRegister] = useState(true);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await register(formData);
      router.push("/");
    } catch {
      // Error is handled by the store
    }
  };

  useEffect(() => {
    api
      .get<{ success: boolean; data: { allow_public_register?: boolean } }>("/api/auth/config")
      .then((res) => setAllowRegister(res.data.data?.allow_public_register !== false))
      .catch(() => setAllowRegister(process.env.NEXT_PUBLIC_AUTH_ALLOW_PUBLIC_REGISTER !== "false"))
      .finally(() => setCheckingConfig(false));
  }, []);

  return (
    <AuthSplitLayout
      title="Creer un compte"
      subtitle="Rejoignez votre espace GED securise."
      heroTitle="Onboarding documentaire en quelques minutes."
      heroCopy="Creez votre acces, importez vos premiers fichiers et activez les workflows d'approbation des la connexion."
      features={[
        {
          icon: UserPlus,
          title: "Compte dedie",
          copy: "Profil utilisateur avec droits et historique d'activite.",
        },
        {
          icon: LockKey,
          title: "Securite integree",
          copy: "Authentification JWT et controle d'acces par role.",
        },
      ]}
      footer={
        <>
          Deja un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-700 transition-colors hover:text-emerald-800"
          >
            Se connecter
          </Link>
        </>
      }
    >
      {checkingConfig ? (
        <div className="space-y-3">
          <div className="h-10 animate-shimmer rounded-xl" />
          <div className="h-10 animate-shimmer rounded-xl" />
          <div className="h-10 animate-shimmer rounded-xl" />
        </div>
      ) : !allowRegister ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Creation compte desactivee. Contactez administrateur ou connectez-vous avec compte existant.
          </div>
          <Button asChild className="h-11 w-full gap-2">
            <Link href="/login">
              Se connecter
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </Button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">Prenom</Label>
            <Input
              id="firstName"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input
              id="lastName"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="prenom.nom@votre-organisation.fr"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
          />
          <p className="text-xs text-zinc-500">Minimum 8 caracteres recommande.</p>
        </div>
        <Button type="submit" className="h-11 w-full gap-2" disabled={isLoading}>
          {isLoading ? "Creation..." : "Creer un compte"}
          {!isLoading && <ArrowRight className="h-4 w-4" weight="bold" />}
        </Button>
      </form>
      )}
    </AuthSplitLayout>
  );
}
