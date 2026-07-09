"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FolderEditDialogProps = {
  open: boolean;
  title: string;
  name: string;
  description: string;
  saving?: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function FolderEditDialog({
  open,
  title,
  name,
  description,
  saving,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSave,
}: FolderEditDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="surface-bento w-full max-w-md p-6">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        <p className="mt-1 text-sm text-zinc-600">Nom et description du dossier.</p>
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="editFolderName">Nom</Label>
            <Input
              id="editFolderName"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Nom du dossier"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editFolderDesc">Description (optionnel)</Label>
            <Input
              id="editFolderDesc"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Description"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={onSave} disabled={saving || !name.trim()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function mapFolderError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("not empty")) {
    return "Le dossier doit etre vide (aucun fichier ni sous-dossier).";
  }
  if (lower.includes("forbidden")) return "Action non autorisee.";
  if (lower.includes("name is required")) return "Le nom est obligatoire.";
  return message;
}

export { mapFolderError };
