"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LockKey, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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
      await login({
        email: formData.email,
        password: formData.password,
      });
      router.push("/");
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="grid min-h-[100dvh] bg-[#f9fafb] lg:grid-cols-2">
      <motion.section
        className="relative hidden overflow-hidden bg-zinc-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 90, damping: 22 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.22),transparent_38%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.06),transparent_32%)]" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
            ArchiFlow v3
          </p>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold tracking-tighter md:text-5xl">
            Votre coffre documentaire, structure pour durer.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400">
            Centralisez vos dossiers, pilotez les workflows d&apos;approbation et
            ouvrez ArchiFlow + en un clic pour la collaboration equipe.
          </p>
        </div>

        <motion.div
          className="relative mt-12 grid gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {[
            {
              icon: ShieldCheck,
              title: "Controle d'acces granulaire",
              copy: "Roles, partages et audit des actions sensibles.",
            },
            {
              icon: LockKey,
              title: "Archivage MinIO",
              copy: "Conservation longue duree via l'API ArchiFlow.",
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
            >
              <item.icon className="h-6 w-6 text-emerald-400" weight="duotone" />
              <p className="mt-4 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{item.copy}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="flex items-center justify-center px-4 py-10 sm:px-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.05 }}
      >
        <div className="w-full max-w-md">
          <motion.div
            className="mb-8 lg:hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
              ArchiFlow
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              Connexion
            </h1>
          </motion.div>

          <motion.div
            className="surface-bento p-8 sm:p-10"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <motion.div className="mb-8 hidden lg:block">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Connexion
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Accedez a votre espace GED securise.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </motion.div>
              )}

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
                  className="h-11 rounded-xl border-slate-200 bg-white"
                  required
                />
                <p className="text-xs text-zinc-500">
                  Utilisez l&apos;adresse associee a votre compte ArchiFlow.
                </p>
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
                  className="h-11 rounded-xl border-slate-200 bg-white"
                  required
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
                {!isLoading && <ArrowRight className="h-4 w-4" weight="bold" />}
              </Button>
            </form>

            {allowRegister && (
              <p className="mt-6 text-center text-sm text-zinc-600">
                Pas encore de compte ?{" "}
                <Link
                  href="/register"
                  className="font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                >
                  Creer un compte
                </Link>
              </p>
            )}
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
