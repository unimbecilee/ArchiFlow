"use client";

import { useEffect, useState } from "react";
import { FloppyDisk } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useAuthStore } from "@/store/auth-store";
import { updateMyProfile } from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { userInitials } from "@/lib/user-display";
import { readUserPrefs, writeUserPrefs, type UserPrefs } from "@/lib/user-prefs";
import { toast } from "sonner";

export default function ParametresComptePage() {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [prefs, setPrefs] = useState<UserPrefs>(() => readUserPrefs());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPrefs(readUserPrefs());
  }, [user?.first_name, user?.last_name]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Prenom et nom sont requis");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setUser({ ...user!, ...updated, capabilities: updated.capabilities ?? user?.capabilities });
      writeUserPrefs(prefs);
      toast.success("Profil enregistre");
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Enregistrement impossible"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}

      <PagePanel title="Profil" subtitle="Informations personnelles">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-lg font-semibold text-emerald-800">
              {userInitials(user?.email, firstName, lastName)}
            </div>
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="settingsFirstName">Prenom</Label>
                <Input
                  id="settingsFirstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="settingsLastName">Nom</Label>
                <Input
                  id="settingsLastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="settingsEmail">Email</Label>
                <Input
                  id="settingsEmail"
                  value={user?.email ?? ""}
                  disabled
                  readOnly
                  className="bg-zinc-50 text-zinc-600"
                />
              </div>
            </div>
          </div>
        </div>
      </PagePanel>

      <PagePanel title="Affichage" subtitle="Preferences d'interface sur cet appareil">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 px-3 py-3 hover:bg-zinc-50/80">
            <Checkbox
              className="mt-0.5"
              checked={prefs.showImportFab}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({ ...p, showImportFab: checked }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-zinc-900">
                Bouton Importer (mobile)
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Afficher le raccourci flottant sur petit ecran
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 px-3 py-3 hover:bg-zinc-50/80">
            <Checkbox
              className="mt-0.5"
              checked={prefs.confirmBeforeDelete}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({ ...p, confirmBeforeDelete: checked }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-zinc-900">
                Confirmer avant suppression
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Demander une confirmation pour les actions destructives
              </span>
            </span>
          </label>
        </div>
      </PagePanel>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="gap-1.5"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          <FloppyDisk className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
