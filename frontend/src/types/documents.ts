export interface Document {
  id: number;
  titre: string;
  title?: string;
  description?: string;
  date_creation: string;
  derniere_modification?: string;
  taille: number;
  taille_formatee?: string;
  type_document?: string;
  categorie?: string;
  dossier_id?: number | null;
  folder_id?: number | null;
  minio_url?: string;
  mime_type?: string;
  file_name?: string;
  status?: string;
  current_version_number?: number;
  rejected_at_version?: number | null;
  previewable?: boolean;
  editable?: boolean;
  office_editable?: boolean;
  is_locked?: boolean;
  locked_by_id?: number | null;
  owner_id?: number;
  can_write?: boolean;
  can_classify?: boolean;
  classification?: string;
  department?: string;
  content_sha256?: string;
  on_hold?: boolean;
}

export interface Folder {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  parent_id?: number | null;
  subfolders_count?: number;
  documents_count?: number;
  created_at?: string;
}

export interface FolderBreadcrumbItem {
  id: number;
  name: string;
}

export interface FolderFlatOption {
  id: number;
  name: string;
  path: string;
}

export interface DocumentsResponse {
  success?: boolean;
  documents: Document[];
  total: number;
}
