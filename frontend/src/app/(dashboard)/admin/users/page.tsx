"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowsClockwise,
  UserPlus,
  MagnifyingGlass,
  Eye,
  Trash,
  Prohibit,
  CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { CrudDataView, type CrudBulkAction, type CrudRowAction } from "@/components/crud";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/auth";
import { deleteUser, listUsers, patchUser } from "@/services/admin.service";
import { ROLE_LABELS, type PlatformRole } from "@/lib/roles";
import { useConfirm } from "@/components/feedback/confirm-provider";
import { toast } from "sonner";

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-zinc-900 text-white",
    manager: "bg-amber-500/15 text-amber-800",
    validator: "bg-emerald-500/15 text-emerald-800",
    archivist: "bg-sky-500/15 text-sky-800",
    user: "bg-zinc-100 text-zinc-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        colors[role] || "bg-zinc-100 text-zinc-700"
      }`}
    >
      {ROLE_LABELS[role as PlatformRole] ?? role}
    </span>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
      return;
    }
    load();
  }, [user, router, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q)
    );
  }, [users, query]);

  const rowActions: CrudRowAction<User>[] = useMemo(
    () => [
      {
        id: "detail",
        label: "Voir la fiche",
        icon: <Eye className="h-4 w-4" />,
        onClick: (u) => router.push(`/admin/users/${u.id}`),
      },
      {
        id: "deactivate",
        label: "Desactiver",
        icon: <Prohibit className="h-4 w-4" />,
        hidden: (u) => !u.is_active || u.id === user?.id,
        onClick: async (u) => {
          await patchUser(u.id, { is_active: false });
          await load();
        },
      },
      {
        id: "activate",
        label: "Reactiver",
        icon: <CheckCircle className="h-4 w-4" />,
        hidden: (u) => u.is_active,
        onClick: async (u) => {
          await patchUser(u.id, { is_active: true });
          await load();
        },
      },
      {
        id: "delete",
        label: "Supprimer",
        icon: <Trash className="h-4 w-4" />,
        destructive: true,
        hidden: (u) => u.id === user?.id,
        onClick: async (u) => {
          if (
            !(await confirm({
              title: "Supprimer l'utilisateur",
              description: `Supprimer ${u.email} ? Cette action est definitive.`,
              confirmLabel: "Supprimer",
              destructive: true,
            }))
          ) {
            return;
          }
          try {
            await deleteUser(u.id);
            toast.success("Utilisateur supprime");
            await load();
          } catch {
            toast.error("Suppression impossible");
          }
        },
      },
    ],
    [load, router, user?.id, confirm]
  );

  const bulkActions: CrudBulkAction<User>[] = useMemo(
    () => [
      {
        id: "deactivate",
        label: "Desactiver",
        icon: <Prohibit className="h-4 w-4" />,
        disabled: (items) => items.every((u) => !u.is_active || u.id === user?.id),
        onClick: async (items) => {
          const targets = items.filter((u) => u.is_active && u.id !== user?.id);
          if (targets.length === 0) return;
          if (
            !(await confirm({
              title: "Desactiver les comptes",
              description: `Desactiver ${targets.length} utilisateur(s) ?`,
              confirmLabel: "Desactiver",
              destructive: true,
            }))
          ) {
            return;
          }
          await Promise.all(targets.map((u) => patchUser(u.id, { is_active: false })));
          toast.success(`${targets.length} compte(s) desactive(s)`);
          await load();
        },
      },
      {
        id: "delete",
        label: "Supprimer",
        icon: <Trash className="h-4 w-4" />,
        destructive: true,
        disabled: (items) => items.every((u) => u.id === user?.id),
        onClick: async (items) => {
          const targets = items.filter((u) => u.id !== user?.id);
          if (targets.length === 0) return;
          if (
            !(await confirm({
              title: "Supprimer les utilisateurs",
              description: `Supprimer ${targets.length} utilisateur(s) ? Action definitive.`,
              confirmLabel: "Supprimer",
              destructive: true,
            }))
          ) {
            return;
          }
          try {
            await Promise.all(targets.map((u) => deleteUser(u.id)));
            toast.success(`${targets.length} utilisateur(s) supprime(s)`);
            await load();
          } catch {
            toast.error("Suppression impossible pour au moins un compte");
            await load();
          }
        },
      },
    ],
    [load, user?.id, confirm]
  );

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        description="Annuaire, fiche detail et synchronisation ArchiFlow +"
        icon={<ShieldCheck className="h-6 w-6" weight="duotone" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <ArrowsClockwise className="h-4 w-4" />
              Actualiser
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4" weight="bold" />
              Creer
            </Button>
          </>
        }
      />

      <PagePanel
        title="Annuaire"
        subtitle={loading ? "Chargement..." : `${filtered.length} utilisateur(s)`}
      >
        <div className="mb-4 relative max-w-md">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher nom, prenom, e-mail..."
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <ListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Aucun utilisateur</p>
        ) : (
          <CrudDataView
            items={filtered}
            getItemId={(u) => u.id}
            storageKey="archiflow-admin-users-view"
            rowActions={rowActions}
            bulkActions={bulkActions}
            columns={[
              {
                id: "user",
                header: "Utilisateur",
                cell: (u) => (
                  <div>
                    <p className="font-medium text-zinc-900">{u.email}</p>
                    <p className="text-xs text-zinc-500">
                      {u.first_name} {u.last_name}
                      {u.must_change_password && (
                        <span className="ml-2 text-amber-700">· MDP a changer</span>
                      )}
                    </p>
                  </div>
                ),
              },
              {
                id: "role",
                header: "Role",
                cell: (u) => <RoleBadge role={u.role} />,
              },
              {
                id: "archi-plus",
                header: "ArchiFlow +",
                hideOnMobile: true,
                cell: (u) => (
                  <span
                    className={`text-xs font-medium ${u.pydio_linked ? "text-emerald-700" : "text-zinc-400"}`}
                  >
                    {u.pydio_linked ? "Lie" : "—"}
                  </span>
                ),
              },
              {
                id: "active",
                header: "Actif",
                hideOnMobile: true,
                cell: (u) => (
                  <span className={u.is_active ? "text-emerald-700" : "text-zinc-400"}>
                    {u.is_active ? "Oui" : "Non"}
                  </span>
                ),
              },
            ]}
            renderGridCard={(u) => (
              <div className="space-y-2">
                <p className="truncate font-medium text-zinc-900">{u.email}</p>
                <p className="text-xs text-zinc-500">
                  {u.first_name} {u.last_name}
                </p>
                <div className="flex flex-wrap gap-2">
                  <RoleBadge role={u.role} />
                  <span className={u.is_active ? "text-xs text-emerald-700" : "text-xs text-zinc-400"}>
                    {u.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
            )}
          />
        )}
      </PagePanel>

      <CreateUserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </PageFrame>
  );
}
