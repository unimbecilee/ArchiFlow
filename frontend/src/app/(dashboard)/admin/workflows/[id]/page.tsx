"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import type { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useAuthStore } from "@/store/auth-store";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type PlatformRole } from "@/lib/roles";
import {
  adminDeleteWorkflow,
  adminGetWorkflow,
  adminUpdateWorkflow,
} from "@/services/admin-workflows.service";
import type {
  AdminUpdateWorkflowPayload,
  AdminWorkflowApproverInput,
  AdminWorkflowStepInput,
  WorkflowFullDefinition,
} from "@/types/workflows";
import { useConfirm } from "@/components/feedback/confirm-provider";
import { toast } from "sonner";

type FormApprover = { role_name: string; user_id: string };
type FormStep = {
  name: string;
  description: string;
  step_order: number;
  approval_type: string;
  approvers: FormApprover[];
};

const APPROVAL_TYPES = [
  { value: "SIMPLE", label: "Simple" },
  { value: "MULTIPLE", label: "Multiple (tous)" },
  { value: "PARALLELE", label: "Parallele" },
];

function defaultStep(order: number): FormStep {
  return {
    name: `Etape ${order}`,
    description: "",
    step_order: order,
    approval_type: "SIMPLE",
    approvers: [{ role_name: "manager", user_id: "" }],
  };
}

function stepsFromWorkflow(wf: WorkflowFullDefinition): FormStep[] {
  const steps =
    wf.steps?.slice().sort((a, b) => a.step_order - b.step_order) ?? [];
  if (!steps.length) return [defaultStep(1)];
  return steps.map((s) => ({
    name: s.name,
    description: s.description ?? "",
    step_order: s.step_order,
    approval_type: s.approval_type || "SIMPLE",
    approvers:
      s.approvers && s.approvers.length > 0
        ? s.approvers.map((a) => ({
            role_name: a.role_name || "user",
            user_id: a.user_id ? String(a.user_id) : "",
          }))
        : [{ role_name: "user", user_id: "" }],
  }));
}

function toPayload(steps: FormStep[]): AdminWorkflowStepInput[] {
  return steps.map((st) => ({
    name: st.name.trim(),
    description: st.description.trim(),
    step_order: st.step_order,
    approval_type: st.approval_type,
    approvers: st.approvers.map((a): AdminWorkflowApproverInput => {
      const uidRaw = a.user_id.trim();
      const uid = uidRaw ? parseInt(uidRaw, 10) : NaN;
      const role = a.role_name.trim();
      const out: AdminWorkflowApproverInput = { role_name: role };
      if (!Number.isNaN(uid) && uid > 0) out.user_id = uid;
      return out;
    }),
  }));
}

export default function AdminWorkflowEditPage() {
  const router = useRouter();
  const params = useParams();
  const confirm = useConfirm();
  const id = typeof params?.id === "string" ? parseInt(params.id, 10) : NaN;

  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [protectedWf, setProtectedWf] = useState(false);
  const [instanceCount, setInstanceCount] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<FormStep[]>([defaultStep(1)]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const load = useCallback(async () => {
    if (Number.isNaN(id)) return;
    setLoading(true);
    setErr(null);
    setLoadErr(null);
    try {
      const res = await adminGetWorkflow(id);
      const w = res.workflow;
      setProtectedWf(res.protected);
      setInstanceCount(res.instance_count);
      setName(w.name);
      setDescription(w.description ?? "");
      setIsActive(w.is_active);
      setSteps(stepsFromWorkflow(w));
    } catch {
      setLoadErr("Workflow introuvable");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const stepsLocked = protectedWf || instanceCount > 0;
  const nameLocked = protectedWf;

  const addStep = () => {
    const nextOrder = Math.max(0, ...steps.map((s) => s.step_order)) + 1;
    setSteps([...steps, defaultStep(nextOrder)]);
  };

  const removeStep = (idx: number) => {
    if (stepsLocked || steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, patch: Partial<FormStep>) => {
    if (stepsLocked) return;
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addApprover = (stepIdx: number) => {
    if (stepsLocked) return;
    const st = steps[stepIdx];
    updateStep(stepIdx, {
      approvers: [...st.approvers, { role_name: "user", user_id: "" }],
    });
  };

  const removeApprover = (stepIdx: number, apIdx: number) => {
    if (stepsLocked) return;
    const st = steps[stepIdx];
    if (st.approvers.length <= 1) return;
    updateStep(stepIdx, {
      approvers: st.approvers.filter((_, j) => j !== apIdx),
    });
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number.isNaN(id)) return;
    setErr(null);
    setBusy(true);
    const payload: AdminUpdateWorkflowPayload = {
      name: name.trim(),
      description: description.trim(),
      is_active: protectedWf ? true : isActive,
      ...(stepsLocked ? {} : { steps: toPayload(steps) }),
    };
    try {
      await adminUpdateWorkflow(id, payload);
      await load();
    } catch (ex) {
      const axiosErr = ex as AxiosError<{ error?: string }>;
      setErr(
        String(
          axiosErr.response?.data?.error ??
            axiosErr.message ??
            "Enregistrement echoue",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (Number.isNaN(id) || protectedWf || instanceCount > 0) return;
    if (
      !(await confirm({
        title: "Supprimer le workflow",
        description: "Supprimer ce workflow ? Operation definitive.",
        confirmLabel: "Supprimer",
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await adminDeleteWorkflow(id);
      toast.success("Workflow supprime");
      router.replace("/admin/workflows");
    } catch {
      toast.error("Suppression impossible");
    }
  };

  if (user?.role !== "admin") return null;

  if (Number.isNaN(id)) {
    return (
      <PageFrame>
        <PagePanel title="Erreur">ID invalide</PagePanel>
      </PageFrame>
    );
  }

  if (!loading && loadErr) {
    return (
      <PageFrame>
        <PageHeader
          eyebrow="Administration"
          title="Workflow"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/workflows">Liste</Link>
            </Button>
          }
        />
        <PagePanel title=" ">
          <ErrorBanner message={loadErr} />
        </PagePanel>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Administration"
        title={loading ? "Chargement…" : name}
        description={`ID ${id} · ${protectedWf ? "Workflow systeme (etapes fixes)" : "Workflow personnalise"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/workflows" className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Liste
              </Link>
            </Button>
          </div>
        }
      />

      {protectedWf && (
        <p className="-mt-6 mb-6 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
          Nom, desactivation et etapes sont proteges pour ce workflow critique.
        </p>
      )}
      {!protectedWf && instanceCount > 0 && (
        <p className="-mt-6 mb-6 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
          {instanceCount} instance(s) existe(nt) — metadonnees modifiables,
          etapes verrouillees.
        </p>
      )}

      <PagePanel title="Edition">
        {err && <ErrorBanner message={err} />}
        {loading ? (
          <ListSkeleton rows={6} />
        ) : (
          <form onSubmit={onSave} className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="wf-name">Nom</Label>
                <Input
                  id="wf-name"
                  value={name}
                  disabled={nameLocked}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="wf-desc">Description</Label>
                <Input
                  id="wf-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary"
                    checked={isActive}
                    disabled={protectedWf}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Actif (nouveaux departs autorises si coche et etapes
                  coherentes)
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Etapes{" "}
                  {stepsLocked && (
                    <span className="font-normal text-muted-foreground">
                      (lecture seule)
                    </span>
                  )}
                </p>
                {!stepsLocked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={addStep}
                  >
                    <Plus className="h-4 w-4" /> Etape
                  </Button>
                )}
              </div>
              {steps.map((st, si) => (
                <div
                  key={`${st.step_order}-${si}`}
                  className={`space-y-3 rounded-xl border border-border p-4 ${
                    stepsLocked ? "bg-muted" : "bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Etape ordre {st.step_order}
                    </p>
                    {!stepsLocked && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(si)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Nom etape</Label>
                      <Input
                        value={st.name}
                        disabled={stepsLocked}
                        onChange={(e) =>
                          updateStep(si, { name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Type approbation</Label>
                      <select
                        className="h-10 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-70"
                        value={st.approval_type}
                        disabled={stepsLocked}
                        onChange={(e) =>
                          updateStep(si, { approval_type: e.target.value })
                        }
                      >
                        {APPROVAL_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Description etape</Label>
                    <Input
                      value={st.description}
                      disabled={stepsLocked}
                      onChange={(e) =>
                        updateStep(si, { description: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Approbateurs</Label>
                      {!stepsLocked && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addApprover(si)}
                        >
                          + ligne
                        </Button>
                      )}
                    </div>
                    {st.approvers.map((ap, aj) => (
                      <div key={aj} className="flex flex-wrap gap-2">
                        <select
                          className="min-w-[10rem] flex-1 rounded-xl border border-border bg-card px-2 py-2 text-sm disabled:opacity-70"
                          value={ap.role_name}
                          disabled={stepsLocked}
                          onChange={(e) => {
                            const copy = [...st.approvers];
                            copy[aj] = {
                              ...copy[aj],
                              role_name: e.target.value,
                            };
                            updateStep(si, { approvers: copy });
                          }}
                        >
                          {ASSIGNABLE_ROLES.map((r: PlatformRole) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <Input
                          className="w-28 disabled:opacity-70"
                          placeholder="User ID"
                          disabled={stepsLocked}
                          value={ap.user_id}
                          onChange={(e) => {
                            const copy = [...st.approvers];
                            copy[aj] = { ...copy[aj], user_id: e.target.value };
                            updateStep(si, { approvers: copy });
                          }}
                        />
                        {!stepsLocked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeApprover(si, aj)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy} className="gap-1.5">
                <FloppyDisk className="h-4 w-4" /> Enregistrer
              </Button>
              {!protectedWf && instanceCount === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive-soft-foreground"
                  onClick={onDelete}
                >
                  Supprimer
                </Button>
              )}
            </div>
          </form>
        )}
      </PagePanel>
    </PageFrame>
  );
}
