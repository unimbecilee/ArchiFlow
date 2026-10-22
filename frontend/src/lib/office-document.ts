const OFFICE_EXT = new Set([
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
  ".xls",
  ".xlsx",
  ".ods",
  ".csv",
  ".ppt",
  ".pptx",
  ".odp",
]);

export function isOfficeDocument(
  mimeType?: string,
  fileName?: string,
): boolean {
  const ext = (fileName || "").toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  if (OFFICE_EXT.has(ext)) return true;
  const m = (mimeType || "").toLowerCase();
  return (
    m.includes("wordprocessing") ||
    m.includes("spreadsheet") ||
    m.includes("presentation") ||
    m === "application/msword" ||
    m === "application/vnd.ms-excel" ||
    m === "application/vnd.ms-powerpoint" ||
    m === "text/csv"
  );
}

export function canEditOfficeDocument(doc: {
  status?: string;
  is_locked?: boolean;
  office_editable?: boolean;
  /** Droit d'ecriture effectif renvoye par l'API (ownership / ACL). */
  can_write?: boolean;
  capabilities?: { write_documents?: boolean };
}): { ok: boolean; reason?: string } {
  // 5A : se fier au droit reel, pas au role seul
  if (typeof doc.can_write === "boolean") {
    if (!doc.can_write) {
      return {
        ok: false,
        reason: "Vous n'avez pas le droit de modifier ce document.",
      };
    }
  } else if (doc.capabilities?.write_documents === false) {
    return {
      ok: false,
      reason: "Vous n'avez pas le droit de modifier ce document.",
    };
  }

  if (!doc.office_editable) {
    return {
      ok: false,
      reason: "Ce type de fichier ne supporte pas l'edition bureautique.",
    };
  }
  if (doc.status === "EN_VALIDATION") {
    return {
      ok: false,
      reason: "Document en validation. Annulez le workflow avant de modifier.",
    };
  }
  if (doc.is_locked) {
    return {
      ok: false,
      reason: "Document verrouille. Deverrouillez-le pour editer.",
    };
  }
  return { ok: true };
}
