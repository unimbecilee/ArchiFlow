import type { Document } from "@/types/documents";
import type { SharedDocument } from "@/types/collaboration";

/** Champs pour l'apercu rapide (partages, etc.) — inclut flags office/edit. */
export function documentForQuickPreview(
  doc: Pick<
    Document,
    | "id"
    | "titre"
    | "mime_type"
    | "file_name"
    | "taille"
    | "taille_formatee"
    | "date_creation"
    | "description"
    | "previewable"
    | "editable"
    | "office_editable"
    | "status"
    | "is_locked"
    | "can_write"
  >,
): Document {
  return {
    id: doc.id,
    titre: doc.titre,
    mime_type: doc.mime_type,
    file_name: doc.file_name,
    taille: doc.taille,
    taille_formatee: doc.taille_formatee,
    date_creation: doc.date_creation,
    description: doc.description,
    previewable: doc.previewable,
    editable: doc.editable,
    office_editable: doc.office_editable,
    status: doc.status,
    is_locked: doc.is_locked,
    can_write: doc.can_write,
  };
}

export function sharedDocumentForPreview(doc: SharedDocument): Document {
  return documentForQuickPreview({
    id: doc.id,
    titre: doc.titre,
    description: doc.description,
    taille: doc.taille,
    taille_formatee: doc.taille_formatee,
    mime_type: doc.mime_type,
    file_name: doc.file_name,
    date_creation: doc.date_creation,
    previewable: doc.previewable,
    editable: doc.editable,
    office_editable: doc.office_editable,
    status: doc.status,
    is_locked: doc.is_locked,
    can_write: doc.can_write,
  });
}
