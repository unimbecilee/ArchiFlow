"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/layout/error-banner";
import { createUser } from "@/services/admin.service";

import { ASSIGNABLE_ROLES, ROLE_HINTS, ROLE_LABELS } from "@/lib/roles";

const ROLES = ASSIGNABLE_ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
  hint: ROLE_HINTS[value],
}));

type CreateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: CreateUserDialogProps) {
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "user",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = () => {
    setForm({
      email: "",
      first_name: "",
      last_name: "",
      role: "user",
    });
    setError(null);
    setSuccess(null);
    setDone(false);
  };

  const setRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      role,
    }));
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || done) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createUser(form);
      setDone(true);
      setSuccess(
        res.email_sent
          ? `Compte cree. E-mail en cours d'envoi a ${res.user.email}.`
          : `Compte cree. E-mail non envoye (SMTP inactif) — voir logs serveur.`,
      );
      onCreated();
      setTimeout(() => handleClose(), 2200);
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          status?: number;
          data?: { error?: string; message?: string };
        };
      };
      const msg = ax.response?.data?.error || ax.response?.data?.message || "";
      if (msg.includes("deja utilise") || msg.includes("already registered")) {
        setError(
          "Cet e-mail existe deja. Utilisez un autre e-mail ou supprimez l'utilisateur existant.",
        );
      } else if (ax.response?.status != null) {
        setError(msg || "Echec de la creation");
      } else {
        setError(
          "Impossible de joindre l'API (verifiez que le backend tourne sur le port 5010).",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="surface-card w-full max-w-lg p-8"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-soft-foreground">
                  Nouveau compte
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                  Creer un utilisateur
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Provisioning ArchiFlow et ArchiFlow + (collaboration). Mot de
                  passe temporaire par e-mail.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorBanner message={error} />}
              {success && (
                <p className="rounded-xl border border-emerald-200 bg-accent-soft px-4 py-3 text-sm text-accent-soft-foreground">
                  {success}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cu-first">Prenom</Label>
                  <Input
                    id="cu-first"
                    value={form.first_name}
                    onChange={(e) =>
                      setForm({ ...form, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cu-last">Nom</Label>
                  <Input
                    id="cu-last"
                    value={form.last_name}
                    onChange={(e) =>
                      setForm({ ...form, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cu-email">E-mail</Label>
                <Input
                  id="cu-email"
                  type="email"
                  placeholder="prenom.nom@organisation.fr"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cu-role">Role</Label>
                <select
                  id="cu-role"
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus-visible:ring-primary/25"
                  value={form.role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {ROLES.find((r) => r.value === form.role)?.hint}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={loading || done}
                >
                  <UserPlus className="h-4 w-4" weight="bold" />
                  {loading ? "Creation..." : "Creer"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
