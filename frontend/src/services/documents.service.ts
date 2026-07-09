import api from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import { getApiErrorMessage } from "@/lib/api-error";
import { getAccessToken } from "@/lib/session-tokens";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/upload-accept";
import { MAX_RESUMABLE_FILE_BYTES } from "@/lib/upload-limits";
import {
  isResumableFile,
  uploadFileResumable,
  type ResumableProgress,
} from "@/services/resumable-upload.service";
import type {
  Document,
  DocumentsResponse,
  Folder,
  FolderBreadcrumbItem,
  FolderFlatOption,
} from "@/types/documents";

export async function getMyDocuments(
  folderId?: number | null,
  adminMode = false
): Promise<DocumentsResponse> {
  const params: Record<string, string> = {};
  if (folderId != null) params.folder_id = String(folderId);
  if (adminMode) params.admin_mode = "true";
  const res = await api.get<DocumentsResponse>("/api/documents/my", { params });
  return res.data;
}

export async function getFolders(parentId?: number | null): Promise<Folder[]> {
  const params: Record<string, string> = {};
  if (parentId != null) params.parent_id = String(parentId);
  const res = await api.get<{ success: boolean; data: Folder[] }>("/api/folders", {
    params,
  });
  return res.data.data ?? [];
}

export async function createFolder(data: {
  name: string;
  description?: string;
  parent_id?: number | null;
}): Promise<Folder> {
  const res = await api.post<{ success: boolean; data: Folder }>("/api/folders", data);
  return res.data.data;
}

export async function updateFolder(
  id: number,
  data: { name?: string; description?: string }
): Promise<Folder> {
  const res = await api.put<{ success: boolean; data: Folder }>(`/api/folders/${id}`, data);
  return res.data.data;
}

export async function deleteFolder(id: number, recursive = false): Promise<void> {
  const params = recursive ? { recursive: "true" } : undefined;
  await api.delete(`/api/folders/${id}`, { params });
}

export async function getFolder(id: number): Promise<Folder> {
  const res = await api.get<{ success: boolean; data: Folder }>(`/api/folders/${id}`);
  return res.data.data;
}

export async function getFolderBreadcrumb(id: number): Promise<FolderBreadcrumbItem[]> {
  const res = await api.get<{ success: boolean; data: FolderBreadcrumbItem[] }>(
    `/api/folders/${id}/breadcrumb`
  );
  return res.data.data ?? [];
}

export async function getFoldersFlat(): Promise<FolderFlatOption[]> {
  const res = await api.get<{ success: boolean; data: FolderFlatOption[] }>("/api/folders/flat");
  return res.data.data ?? [];
}

export async function moveDocument(
  id: number,
  folderId: number | null
): Promise<Document> {
  const res = await api.patch<{ success: boolean; data: Document }>(`/api/documents/${id}`, {
    folder_id: folderId,
  });
  return res.data.data;
}

export async function uploadDocument(
  file: File,
  meta: {
    titre?: string;
    description?: string;
    type_document?: string;
    folder_id?: number | null;
  }
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  if (meta.titre) form.append("titre", meta.titre);
  if (meta.description) form.append("description", meta.description);
  if (meta.type_document) form.append("type_document", meta.type_document);
  if (meta.folder_id != null) form.append("folder_id", String(meta.folder_id));

  const res = await api.post<{ success: boolean; data: Document }>(
    "/api/documents/upload",
    form
  );
  return res.data.data;
}

export type UploadBatchResult = {
  file: File;
  document?: Document;
  error?: string;
};

export type UploadBatchMeta = {
  description?: string;
  type_document?: string;
  folder_id?: number | null;
};

export type UploadBatchProgress = {
  done: number;
  total: number;
  currentName: string;
  bytesUploaded?: number;
  bytesTotal?: number;
  resumable?: ResumableProgress;
};

/** Import sequentiel — HTTP classique <=20 Mo, MPU resumable au-dela. */
export async function uploadDocuments(
  items: Array<{ file: File; titre?: string; folder_id?: number | null }>,
  meta: UploadBatchMeta,
  onProgress?: (p: UploadBatchProgress) => void
): Promise<UploadBatchResult[]> {
  const results: UploadBatchResult[] = [];
  const total = items.length;
  for (let i = 0; i < items.length; i++) {
    const { file, titre, folder_id } = items[i];
    const targetFolder = folder_id !== undefined ? folder_id : meta.folder_id;
    onProgress?.({ done: i, total, currentName: file.name });
    const title = titre?.trim() || file.name.replace(/\.[^.]+$/, "") || file.name;
    try {
      if (file.size > MAX_RESUMABLE_FILE_BYTES) {
        throw new Error(`Fichier trop volumineux (max ${MAX_RESUMABLE_FILE_BYTES / (1 << 30)} Go)`);
      }
      if (file.size > MAX_IMPORT_FILE_BYTES && !isResumableFile(file)) {
        throw new Error("Fichier hors plage autorisee");
      }
      let document: Document;
      const uploadMeta = {
        title,
        description: meta.description,
        category: meta.type_document,
        folder_id: targetFolder,
      };
      if (isResumableFile(file)) {
        document = await uploadFileResumable(
          file,
          uploadMeta,
          (resumable) =>
            onProgress?.({
              done: i,
              total,
              currentName: file.name,
              bytesUploaded: resumable.bytesUploaded,
              bytesTotal: resumable.bytesTotal,
              resumable,
            })
        );
      } else {
        document = await uploadDocument(file, {
          titre: title,
          description: meta.description,
          type_document: meta.type_document,
          folder_id: targetFolder,
        });
      }
      results.push({ file, document });
    } catch (err) {
      results.push({ file, error: getApiErrorMessage(err, "Echec upload") });
    }
    onProgress?.({ done: i + 1, total, currentName: file.name });
  }
  return results;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/api/documents/${id}`);
}

export async function searchDocuments(q: string, fullText = true): Promise<Document[]> {
  const res = await api.get<{ success: boolean; documents: Document[] }>(
    "/api/documents/search",
    { params: { q, ...(fullText ? { mode: "fts" } : {}) } }
  );
  return res.data.documents ?? [];
}

export async function getRecentDocuments(): Promise<Document[]> {
  const res = await api.get<{ success: boolean; documents: Document[] }>(
    "/api/documents/recent"
  );
  return res.data.documents ?? [];
}

export async function getTrashDocuments(): Promise<Document[]> {
  const res = await api.get<{ success: boolean; documents: Document[] }>(
    "/api/documents/trash"
  );
  return res.data.documents ?? [];
}

export async function restoreDocument(id: number): Promise<void> {
  await api.post(`/api/documents/${id}/restore`);
}

export async function lockDocument(id: number): Promise<void> {
  await api.post(`/api/documents/${id}/lock`);
}

export async function unlockDocument(id: number): Promise<void> {
  await api.delete(`/api/documents/${id}/lock`);
}

export function previewUrl(id: number): string {
  return apiUrl(`/api/documents/${id}/preview`);
}

export function downloadUrl(id: number): string {
  return apiUrl(`/api/documents/${id}/download`);
}

export async function downloadDocumentFile(
  id: number,
  fileName: string
): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(downloadUrl(id), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Telechargement impossible");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
