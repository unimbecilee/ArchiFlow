import type { Document } from "@/types/documents";
import type { SharedDocument } from "@/types/collaboration";

/** Champs minimaux pour l'apercu rapide (partages, etc.). */
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
  >
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
  });
}
