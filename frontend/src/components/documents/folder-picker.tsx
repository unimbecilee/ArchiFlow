"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { getFoldersFlat } from "@/services/documents.service";
import type { FolderFlatOption } from "@/types/documents";

type FolderPickerProps = {
  value: string;
  onChange: (folderId: string) => void;
  label?: string;
};

export function FolderPicker({ value, onChange, label = "Dossier de destination" }: FolderPickerProps) {
  const [options, setOptions] = useState<FolderFlatOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFoldersFlat()
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="folder-picker">{label}</Label>
      <select
        id="folder-picker"
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">Racine (aucun dossier)</option>
        {options.map((f) => (
          <option key={f.id} value={String(f.id)}>
            {f.path}
          </option>
        ))}
      </select>
      <p className="text-xs text-zinc-500">
        Le fichier sera enregistre dans le dossier selectionne.
      </p>
    </div>
  );
}
