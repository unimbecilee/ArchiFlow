export interface SharedDocument {
  id: number;
  titre: string;
  description?: string;
  taille: number;
  taille_formatee?: string;
  mime_type?: string;
  file_name?: string;
  previewable?: boolean;
  editable?: boolean;
  office_editable?: boolean;
  status?: string;
  is_locked?: boolean;
  can_write?: boolean;
  date_creation: string;
  permissions: string[];
  date_partage: string;
  proprietaire_id: number;
}

export interface DocumentComment {
  id: number;
  document_id: number;
  content: string;
  author_id: number;
  parent_id?: number | null;
  created_at: string;
  author?: { id: number; email?: string; first_name?: string; last_name?: string };
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  file_name: string;
  size: number;
  mime_type?: string;
  comment?: string;
  created_at: string;
  created_by_id: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
