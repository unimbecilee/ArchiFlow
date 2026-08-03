"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash, FloppyDisk } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import {
  createAccessPolicy,
  deleteAccessPolicy,
  listAccessPolicies,
  updateAccessPolicy,
  type AccessPolicy,
  type AccessPolicyInput,
} from "@/services/access-policies.service";
import { useConfirm } from "@/components/feedback/confirm-provider";
import { toast } from "sonner";

const emptyForm: AccessPolicyInput = {
  name: "",
  effect: "deny",
  priority: 100,
  condition: "",
  actions: '["read","write","share"]',
  active: true,
};

const CONDITION_PRESETS: { label: string; json: string }[] = [
  {
    label: "Departement doc ≠ user",
    json: '{"attr":"doc.department","op":"neq","value":"$user.department"}',
  },
  {
    label: "Classification secret",
    json: '{"attr":"doc.classification","op":"eq","value":"secret"}',
  },
  {
    label: "Role user uniquement",
    json: '{"attr":"user.role","op":"eq","value":"user"}',
  },
];

export function AccessPoliciesSettings() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<AccessPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AccessPolicyInput>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listAccessPolicies());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (p: AccessPolicy) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      effect: p.effect,
      priority: p.priority,
      condition: p.condition || "",
      actions: p.actions || '["read"]',
      active: p.active,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editId != null) {
        await updateAccessPolicy(editId, form);
      } else {
        await createAccessPolicy(form);
      }
      resetForm();
      toast.success(editId != null ? "Politique mise a jour" : "Politique creee");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !(await confirm({
        title: "Supprimer la politique",
        description: "Cette regle ABAC sera retiree immediatement pour toute l'organisation.",
        confirmLabel: "Supprimer",
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await deleteAccessPolicy(id);
      if (editId === id) resetForm();
      toast.success("Politique supprimee");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible");
    }
  };

  if (loading) {
    return <ListSkeleton rows={4} />;
  }

  return (
    <>
      {error && <ErrorBanner message={error} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <PagePanel title="Politiques enregistrees" subtitle={`${rows.length} regle(s) · deny prioritaire`}>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune politique. Les deny s&apos;appliquent apres RBAC, partage et MAC.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className={`flex w-full flex-col gap-2 py-4 text-left transition-colors sm:flex-row sm:items-start sm:justify-between ${
                      editId === p.id ? "bg-emerald-50/60 -mx-2 rounded-xl px-2" : "hover:bg-zinc-50/80"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-zinc-900">
                        {p.name}{" "}
                        <span className="font-mono text-xs text-zinc-500">
                          p{p.priority} · {p.effect} · {p.active ? "active" : "inactive"}
                        </span>
                      </p>
                      {p.condition && (
                        <p className="line-clamp-2 font-mono text-xs text-zinc-600">{p.condition}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(p.id);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!editId && (
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              Nouvelle regle
            </Button>
          )}
        </PagePanel>

        <PagePanel
          title={editId != null ? "Modifier la politique" : "Nouvelle politique"}
          subtitle="Les regles deny bloquent meme un partage explicite si la condition correspond."
          className="lg:sticky lg:top-28"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="polName">Nom</Label>
              <Input
                id="polName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="polEffect">Effet</Label>
              <select
                id="polEffect"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={form.effect}
                onChange={(e) => setForm({ ...form, effect: e.target.value as "allow" | "deny" })}
              >
                <option value="deny">deny</option>
                <option value="allow">allow</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="polPriority">Priorite (ASC)</Label>
              <Input
                id="polPriority"
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="polActions">Actions (JSON array)</Label>
              <Input
                id="polActions"
                value={form.actions}
                onChange={(e) => setForm({ ...form, actions: e.target.value })}
                placeholder='["read","write"]'
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="polCond">Condition JSON</Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {CONDITION_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setForm({ ...form, condition: preset.json })}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <textarea
                id="polCond"
                className="min-h-[120px] rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                placeholder='{"attr":"doc.department","op":"neq","value":"$user.department"}'
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-1.5">
              <FloppyDisk className="h-4 w-4" />
              {editId != null ? "Mettre a jour" : "Creer"}
            </Button>
            {editId != null && (
              <Button variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </PagePanel>
      </div>
    </>
  );
}
