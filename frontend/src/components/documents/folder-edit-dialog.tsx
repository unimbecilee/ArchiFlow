"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="editFolderName">Nom</Label>
            <Input
              id="editFolderName"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Nom du dossier"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="editFolderDesc">Description (optionnel)</Label>
            <Input
              id="editFolderDesc"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={saving || !name.trim()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapFolderError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("not empty")) {
    return "Le dossier doit être vide (aucun fichier ni sous-dossier).";
  }
  if (lower.includes("forbidden")) return "Action non autorisée.";
  if (lower.includes("name is required")) return "Le nom est obligatoire.";
  return message;
}

export { mapFolderError };
