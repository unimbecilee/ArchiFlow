"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash, TreeStructure, PencilSimple } from "@phosphor-icons/react";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { Button } from "@/components/ui/button";
import { CrudDataView, type CrudBulkAction, type CrudRowAction } from "@/components/crud";
import { useAuthStore } from "@/store/auth-store";
import { adminDeleteWorkflow, adminListWorkflows } from "@/services/admin-workflows.service";
import type { AdminWorkflowListRow } from "@/types/workflows";

function canDeleteRow(row: AdminWorkflowListRow) {
  return !row.protected && row.instance_count === 0;
}

export default function AdminWorkflowsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<AdminWorkflowListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminListWorkflows());
    } catch {
      setRows([]);
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

  const deleteOne = async (row: AdminWorkflowListRow) => {
    const w = row.workflow;
    if (!canDeleteRow(row)) return;
    const ok = window.confirm(`Supprimer le workflow « ${w.name} » ? Cette operation est definitive.`);
    if (!ok) return;
    try {
      await adminDeleteWorkflow(w.id);
      await load();
    } catch {
      alert("Suppression impossible.");
    }
  };

  const rowActions: CrudRowAction<AdminWorkflowListRow>[] = useMemo(
    () => [
      {
        id: "edit",
        label: "Modifier",
        icon: <PencilSimple className="h-4 w-4" />,
        onClick: (row) => router.push(`/admin/workflows/${row.workflow.id}`),
      },
      {
        id: "delete",
        label: "Supprimer",
        icon: <Trash className="h-4 w-4" />,
        destructive: true,
        hidden: (row) => !canDeleteRow(row),
        onClick: (row) => deleteOne(row),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load, router]
  );

  const bulkActions: CrudBulkAction<AdminWorkflowListRow>[] = useMemo(
    () => [
      {
        id: "delete",
        label: "Supprimer",
        icon: <Trash className="h-4 w-4" />,
        destructive: true,
        disabled: (items) => !items.some(canDeleteRow),
        onClick: async (items) => {
          const targets = items.filter(canDeleteRow);
          if (targets.length === 0) return;
          const ok = window.confirm(`Supprimer ${targets.length} workflow(s) ?`);
          if (!ok) return;
          try {
            await Promise.all(targets.map((r) => adminDeleteWorkflow(r.workflow.id)));
            await load();
          } catch {
            alert("Suppression impossible pour au moins un element.");
            await load();
          }
        },
      },
    ],
    [load]
  );

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Administration"
        title="Workflows"
        description="Definitions, activation et etapes — workflows systeme partiellement verrouilles"
        icon={<TreeStructure className="h-6 w-6" weight="duotone" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => load()}>
              Actualiser
            </Button>
            <Button size="sm" className="gap-1.5" asChild>
              <Link href="/admin/workflows/new">
                <Plus className="h-4 w-4" weight="bold" />
                Nouveau
              </Link>
            </Button>
          </>
        }
      />

      <PagePanel title="Definitions" subtitle={loading ? "Chargement..." : `${rows.length} workflow(s)`}>
        {loading ? (
          <ListSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Aucun workflow</p>
        ) : (
          <CrudDataView
            items={rows}
            getItemId={(row) => row.workflow.id}
            storageKey="archiflow-admin-workflows-view"
            rowActions={rowActions}
            bulkActions={bulkActions}
            columns={[
              {
                id: "name",
                header: "Nom",
                cell: (row) => (
                  <div>
                    <p className="font-medium text-zinc-900">{row.workflow.name}</p>
                    <p className="text-xs text-zinc-500">{row.workflow.description || "—"}</p>
                  </div>
                ),
              },
              {
                id: "steps",
                header: "Etapes",
                hideOnMobile: true,
                cell: (row) => row.workflow.steps?.length ?? 0,
              },
              {
                id: "instances",
                header: "Instances",
                hideOnMobile: true,
                cell: (row) => row.instance_count,
              },
              {
                id: "active",
                header: "Actif",
                cell: (row) => (
                  <span className={row.workflow.is_active ? "text-emerald-700" : "text-zinc-400"}>
                    {row.workflow.is_active ? "Oui" : "Non"}
                  </span>
                ),
              },
              {
                id: "type",
                header: "Type",
                hideOnMobile: true,
                cell: (row) =>
                  row.protected ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Systeme
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">Personnalise</span>
                  ),
              },
            ]}
            renderGridCard={(row) => (
              <div className="space-y-2">
                <p className="font-medium text-zinc-900">{row.workflow.name}</p>
                <p className="line-clamp-2 text-xs text-zinc-500">
                  {row.workflow.description || "Sans description"}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                  <span>{row.workflow.steps?.length ?? 0} etapes</span>
                  <span>·</span>
                  <span>{row.instance_count} instances</span>
                </div>
                {row.protected && (
                  <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    Systeme
                  </span>
                )}
              </div>
            )}
          />
        )}
      </PagePanel>
    </PageFrame>
  );
}
