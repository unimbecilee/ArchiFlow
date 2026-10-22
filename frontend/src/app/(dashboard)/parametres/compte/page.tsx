"use client";

import { useEffect, useState } from "react";
import { FloppyDisk } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PagePanel } from "@/components/layout/page-panel";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useAuthStore } from "@/store/auth-store";
import { updateMyProfile } from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { userInitials } from "@/lib/user-display";
import {
  readUserPrefs,
  writeUserPrefs,
  type UserPrefs,
} from "@/lib/user-prefs";
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
      setError("Prénom et nom sont requis");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setUser({
        ...user!,
        ...updated,
        capabilities: updated.capabilities ?? user?.capabilities,
      });
      writeUserPrefs(prefs);
      toast.success("Profil enregistré");
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
              {userInitials(user?.email, firstName, lastName)}
            </div>
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="settingsFirstName">Prénom</Label>
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
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      </PagePanel>

      <PagePanel
        title="Affichage"
        subtitle="Préférences d'interface sur cet appareil"
      >
        <div className="space-y-3">
          <label
            className="group flex cursor-pointer items-start justify-between gap-4 rounded-lg
 border border-border bg-card p-4 shadow-e1 transition-colors duration-200
 hover:border-border-strong hover:bg-accent/40"
          >
            <span>
              <span className="block text-sm font-medium text-foreground">
                Bouton Importer (mobile)
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                Afficher le raccourci flottant sur petit écran
              </span>
            </span>
            <Switch
              id="showImportFab"
              aria-describedby="showImportFab-desc"
              checked={prefs.showImportFab}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({ ...p, showImportFab: checked }))
              }
            />
          </label>
          <p
            id="showImportFab-desc"
            className="ml-10 text-[13px] text-muted-foreground hidden"
          >
            Afficher le raccourci flottant sur petit écran
          </p>

          <label
            className="group flex cursor-pointer items-start justify-between gap-4 rounded-lg
 border border-border bg-card p-4 shadow-e1 transition-colors duration-200
 hover:border-border-strong hover:bg-accent/40"
          >
            <span>
              <span className="block text-sm font-medium text-foreground">
                Confirmer avant suppression
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Demander une confirmation pour les actions destructives
              </span>
            </span>
            <Switch
              id="confirmBeforeDelete"
              aria-describedby="confirmBeforeDelete-desc"
              checked={prefs.confirmBeforeDelete}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({ ...p, confirmBeforeDelete: checked }))
              }
            />
          </label>
          <p
            id="confirmBeforeDelete-desc"
            className="ml-10 text-[13px] text-muted-foreground hidden"
          >
            Demander une confirmation pour les actions destructives
          </p>
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
