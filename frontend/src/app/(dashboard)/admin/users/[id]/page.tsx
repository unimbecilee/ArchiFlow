"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowsClockwise,
  EnvelopeSimple,
  FloppyDisk,
  ShieldCheck,
  Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { useAuthStore } from "@/store/auth-store";
import type { AdminUserDetail } from "@/types/admin";
import {
  deleteUser,
  getUser,
  resendCredentials,
  syncPydio,
  updateUser,
} from "@/services/admin.service";

import { ARCHIFLOW_PLUS } from "@/lib/branding";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type PlatformRole,
} from "@/lib/roles";
import { useConfirm } from "@/components/feedback/confirm-provider";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const { user: currentUser } = useAuthStore();
  const userId = Number(params.id);

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("user");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!userId || Number.isNaN(userId)) return;
    setLoading(true);
    setError(null);
    try {
      const u = await getUser(userId);
      setDetail(u);
      setFirstName(u.first_name ?? "");
      setLastName(u.last_name ?? "");
      setRole(u.role);
      setIsActive(u.is_active);
    } catch {
      setError("Utilisateur introuvable");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/");
      return;
    }
    load();
  }, [currentUser, router, load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateUser(detail.id, {
        first_name: firstName,
        last_name: lastName,
        role,
        is_active: isActive,
      });
      setDetail(updated);
      setSuccess("Profil mis a jour");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || "Echec de la mise a jour");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    key: string,
    fn: () => Promise<{ email_sent?: boolean }>
  ) => {
    setActionLoading(key);
    setError(null);
    setSuccess(null);
    try {
      const res = await fn();
      await load();
      if (key === "resend") {
        setSuccess(
          res.email_sent
            ? "Nouveau mot de passe temporaire envoye par e-mail"
            : "Mot de passe regenere (SMTP inactif — voir logs)"
        );
      } else {
        setSuccess(`Compte ${ARCHIFLOW_PLUS} synchronise`);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || "Action echouee");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!detail || detail.id === currentUser?.id) return;
    if (
      !(await confirm({
        title: "Supprimer l'utilisateur",
        description: `Supprimer ${detail.email} ? Compte ArchiFlow et ${ARCHIFLOW_PLUS} seront retires.`,
        confirmLabel: "Supprimer",
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await deleteUser(detail.id);
      router.push("/admin/users");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || "Suppression impossible");
    }
  };

  if (currentUser?.role !== "admin") {
    return null;
  }

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Administration"
        title={detail ? detail.email : "Utilisateur"}
        description={`Fiche utilisateur, compte ${ARCHIFLOW_PLUS} et actions admin`}
        icon={<ShieldCheck className="h-6 w-6" weight="duotone" />}
        actions={
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : !detail ? (
        <PagePanel title="Introuvable" subtitle="Cet utilisateur n'existe pas">
          <Button asChild variant="outline">
            <Link href="/admin/users">Retour a la liste</Link>
          </Button>
        </PagePanel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <PagePanel title="Identite" subtitle="Informations ArchiFlow">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="first">Prenom</Label>
                  <Input
                    id="first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="last">Nom</Label>
                  <Input
                    id="last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>E-mail</Label>
                <Input value={detail.email} disabled className="bg-zinc-50" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2 justify-end">
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Compte actif
                  </label>
                </div>
              </div>

              <dl className="grid gap-2 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
                <div className="flex justify-between gap-4">
                  <dt>Role affiche</dt>
                  <dd className="font-medium text-zinc-900">{ROLE_LABELS[role as PlatformRole] ?? role}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Mot de passe</dt>
                  <dd className={detail.must_change_password ? "text-amber-700" : "text-emerald-700"}>
                    {detail.must_change_password ? "A changer a la prochaine connexion" : "OK"}
                  </dd>
                </div>
                {detail.last_login_at && (
                  <div className="flex justify-between gap-4">
                    <dt>Derniere connexion</dt>
                    <dd>{new Date(detail.last_login_at).toLocaleString("fr-FR")}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt>Cree le</dt>
                  <dd>{new Date(detail.created_at).toLocaleString("fr-FR")}</dd>
                </div>
              </dl>
              <Button type="submit" className="gap-2" disabled={saving}>
                <FloppyDisk className="h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          </PagePanel>

          <div className="space-y-6">
            <PagePanel title="Comptes externes" subtitle={ARCHIFLOW_PLUS}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="py-2 font-medium">Application</th>
                    <th className="py-2 font-medium">Statut</th>
                    <th className="py-2 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 font-medium text-zinc-900">{ARCHIFLOW_PLUS}</td>
                    <td className="py-3">
                      <span
                        className={
                          detail.pydio_linked
                            ? "text-emerald-700 font-medium"
                            : "text-amber-700 font-medium"
                        }
                      >
                        {detail.pydio_linked ? "Lie" : "Non lie"}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-xs text-zinc-500">
                      {detail.pydio_user_id || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={actionLoading !== null}
                  onClick={() => runAction("sync", () => syncPydio(detail.id))}
                >
                  <ArrowsClockwise className="h-4 w-4" />
                  {actionLoading === "sync" ? "Sync..." : `Synchroniser ${ARCHIFLOW_PLUS}`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={actionLoading !== null}
                  onClick={() => runAction("resend", () => resendCredentials(detail.id))}
                >
                  <EnvelopeSimple className="h-4 w-4" />
                  {actionLoading === "resend" ? "Envoi..." : "Renvoyer identifiants"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Sync regenere un mot de passe temporaire pour ArchiFlow et {ARCHIFLOW_PLUS}. Renvoyer envoie aussi
                un e-mail si SMTP actif.
              </p>
            </PagePanel>

            <PagePanel title="Zone sensible" subtitle="Irreversible">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 hover:text-red-700"
                disabled={detail.id === currentUser?.id}
                onClick={handleDelete}
              >
                <Trash className="h-4 w-4" />
                Supprimer l&apos;utilisateur
              </Button>
            </PagePanel>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
