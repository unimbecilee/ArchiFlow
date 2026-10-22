"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import type { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useAuthStore } from "@/store/auth-store";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type PlatformRole } from "@/lib/roles";
import { adminCreateWorkflow } from "@/services/admin-workflows.service";
import type {
  AdminCreateWorkflowPayload,
  AdminWorkflowApproverInput,
  AdminWorkflowStepInput,
} from "@/types/workflows";

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

export default function AdminWorkflowNewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<FormStep[]>([defaultStep(1)]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const addStep = () => {
    const nextOrder = Math.max(...steps.map((s) => s.step_order)) + 1;
    setSteps([...steps, defaultStep(nextOrder)]);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, patch: Partial<FormStep>) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addApprover = (stepIdx: number) => {
    const st = steps[stepIdx];
    const next = {
      ...st,
      approvers: [...st.approvers, { role_name: "user", user_id: "" }],
    };
    updateStep(stepIdx, next);
  };

  const removeApprover = (stepIdx: number, apIdx: number) => {
    const st = steps[stepIdx];
    if (st.approvers.length <= 1) return;
    updateStep(stepIdx, {
      approvers: st.approvers.filter((_, j) => j !== apIdx),
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const payload: AdminCreateWorkflowPayload = {
      name: name.trim(),
      description: description.trim(),
      is_active: true,
      steps: toPayload(steps),
    };
    try {
      const created = await adminCreateWorkflow(payload);
      router.replace(`/admin/workflows/${created.id}`);
    } catch (ex: unknown) {
      const ae = ex as AxiosError<{ error?: string }>;
      const msg = ae.response?.data?.error;
      setErr(msg || "Creation echouee");
    } finally {
      setBusy(false);
    }
  };

  if (user?.role !== "admin") return null;

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Administration"
        title="Nouveau workflow"
        description="Ajoute une definition avec au moins une etape et des approbateurs par role utilisateur ou par ID utilisateur"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/workflows" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
          </Button>
        }
      />

      <PagePanel title="Formulaire">
        {err && <ErrorBanner message={err} />}
        <form onSubmit={onSubmit} className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="wf-name">Nom</Label>
              <Input
                id="wf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Circuit interne projet X"
                required
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="wf-desc">Description</Label>
              <Input
                id="wf-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder=""
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Etapes</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={addStep}
              >
                <Plus className="h-4 w-4" /> Etape
              </Button>
            </div>
            {steps.map((st, si) => (
              <div
                key={`${st.step_order}-${si}`}
                className="space-y-3 rounded-xl border border-border bg-muted p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Etape ordre {st.step_order}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(si)}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Nom etape</Label>
                    <Input
                      value={st.name}
                      onChange={(e) => updateStep(si, { name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Type approbation</Label>
                    <select
                      className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                      value={st.approval_type}
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
                    onChange={(e) =>
                      updateStep(si, { description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Approbateurs</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addApprover(si)}
                    >
                      + ligne
                    </Button>
                  </div>
                  {st.approvers.map((ap, aj) => (
                    <div key={aj} className="flex flex-wrap gap-2">
                      <select
                        className="min-w-[10rem] flex-1 rounded-xl border border-border bg-card px-2 py-2 text-sm"
                        value={ap.role_name}
                        onChange={(e) => {
                          const copy = [...st.approvers];
                          copy[aj] = { ...copy[aj], role_name: e.target.value };
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
                        className="w-28"
                        placeholder="User ID"
                        value={ap.user_id}
                        onChange={(e) => {
                          const copy = [...st.approvers];
                          copy[aj] = { ...copy[aj], user_id: e.target.value };
                          updateStep(si, { approvers: copy });
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeApprover(si, aj)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              Creer
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/workflows">Annuler</Link>
            </Button>
          </div>
        </form>
      </PagePanel>
    </PageFrame>
  );
}
