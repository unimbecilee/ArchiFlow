export function isEditableDocument(mimeType?: string, fileName?: string): boolean {
  const m = (mimeType || "").toLowerCase();
  if (m.startsWith("text/")) return true;
  if (["application/json", "application/xml", "application/javascript"].includes(m)) {
    return true;
  }
  const ext = (fileName || "").toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  return [".txt", ".md", ".markdown", ".json", ".csv", ".xml", ".yml", ".yaml", ".log"].includes(
    ext
  );
}

export function canEditDocument(doc: {
  status?: string;
  is_locked?: boolean;
  editable?: boolean;
  can_write?: boolean;
  capabilities?: { write_documents?: boolean };
}): { ok: boolean; reason?: string } {
  if (typeof doc.can_write === "boolean") {
    if (!doc.can_write) {
      return { ok: false, reason: "Vous n'avez pas le droit de modifier ce document." };
    }
  } else if (doc.capabilities?.write_documents === false) {
    return { ok: false, reason: "Vous n'avez pas le droit de modifier ce document." };
  }
  if (!doc.editable) {
    return { ok: false, reason: "Ce type de fichier ne supporte pas l'edition en ligne." };
  }
  if (doc.status === "EN_VALIDATION") {
    return {
      ok: false,
      reason: "Document en validation. Annulez le workflow avant de modifier.",
    };
  }
  if (doc.is_locked) {
    return { ok: false, reason: "Document verrouille. Deverrouillez-le pour editer." };
  }
  return { ok: true };
}
