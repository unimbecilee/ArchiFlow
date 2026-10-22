import api from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import { getApiErrorMessage } from "@/lib/api-error";
import { fetchAuthenticated, readFetchError } from "@/lib/fetch-auth";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/upload-accept";
import { MAX_RESUMABLE_FILE_BYTES } from "@/lib/upload-limits";
import {
  isResumableFile,
  putFileResumable,
  type ResumableProgress,
} from "@/services/resumable-upload.service";
import type {
  Document,
  DocumentsResponse,
  Folder,
  FolderBreadcrumbItem,
  FolderFlatOption,
} from "@/types/documents";

/** Classic multipart ceiling (Flask-style MAX_CONTENT_LENGTH). */
const MAX_CONTENT_LENGTH = 20 * 1024 * 1024;

export async function getMyDocuments(
  folderId?: number | null,
  adminMode = false,
  cursor?: { cursor_id: number; cursor_created_at: string } | null,
): Promise<DocumentsResponse> {
  const params: Record<string, string> = {};
  if (folderId != null) params.folder_id = String(folderId);
  if (adminMode) params.admin_mode = "true";
  if (cursor?.cursor_id) {
    params.cursor_id = String(cursor.cursor_id);
    params.cursor_created_at = cursor.cursor_created_at;
  }
  const res = await api.get<DocumentsResponse>("/api/documents/my", { params });
  return res.data;
}

export async function getFolders(
  parentId?: number | null,
  options?: { orgScope?: boolean },
): Promise<Folder[]> {
  const params: Record<string, string> = {};
  if (parentId != null) params.parent_id = String(parentId);
  if (options?.orgScope) params.org_scope = "true";
  const res = await api.get<{ success: boolean; data: Folder[] }>(
    "/api/folders",
    {
      params,
    },
  );
  return res.data.data ?? [];
}

export async function createFolder(data: {
  name: string;
  description?: string;
  parent_id?: number | null;
}): Promise<Folder> {
  const res = await api.post<{ success: boolean; data: Folder }>(
    "/api/folders",
    data,
  );
  return res.data.data;
}

export async function updateFolder(
  id: number,
  data: { name?: string; description?: string },
): Promise<Folder> {
  const res = await api.put<{ success: boolean; data: Folder }>(
    `/api/folders/${id}`,
    data,
  );
  return res.data.data;
}

export async function deleteFolder(
  id: number,
  recursive = false,
): Promise<void> {
  const params = recursive ? { recursive: "true" } : undefined;
  await api.delete(`/api/folders/${id}`, { params });
}

export async function getFolder(id: number): Promise<Folder> {
  const res = await api.get<{ success: boolean; data: Folder }>(
    `/api/folders/${id}`,
  );
  return res.data.data;
}

export async function getFolderBreadcrumb(
  id: number,
): Promise<FolderBreadcrumbItem[]> {
  const res = await api.get<{ success: boolean; data: FolderBreadcrumbItem[] }>(
    `/api/folders/${id}/breadcrumb`,
  );
  return res.data.data ?? [];
}

export async function getFoldersFlat(options?: {
  orgScope?: boolean;
}): Promise<FolderFlatOption[]> {
  const params: Record<string, string> = {};
  if (options?.orgScope) params.org_scope = "true";
  const res = await api.get<{ success: boolean; data: FolderFlatOption[] }>(
    "/api/folders/flat",
    {
      params,
    },
  );
  return res.data.data ?? [];
}

export async function moveDocument(
  id: number,
  folderId: number | null,
): Promise<Document> {
  const res = await api.patch<{ success: boolean; data: Document }>(
    `/api/documents/${id}`,
    {
      folder_id: folderId,
    },
  );
  return res.data.data;
}

export async function updateDocumentClassification(
  id: number,
  data: { classification?: string; department?: string },
): Promise<Document> {
  const res = await api.patch<{ success: boolean; data: Document }>(
    `/api/documents/${id}`,
    data,
  );
  return res.data.data;
}

export async function uploadDocument(
  file: File,
  meta: {
    titre?: string;
    description?: string;
    type_document?: string;
    folder_id?: number | null;
  },
): Promise<Document> {
  const MAX_CONTENT_LENGTH = 20 * 1024 * 1024;
  if (file.size > MAX_CONTENT_LENGTH) {
    throw new Error(
      `Fichier trop volumineux (MAX_CONTENT_LENGTH=${MAX_CONTENT_LENGTH})`,
    );
  }
  const form = new FormData();
  form.append("file", file);
  if (meta.titre) form.append("titre", meta.titre);
  if (meta.description) form.append("description", meta.description);
  if (meta.type_document) form.append("type_document", meta.type_document);
  if (meta.folder_id != null) form.append("folder_id", String(meta.folder_id));

  const res = await api.post<{ success: boolean; data: Document }>(
    "/api/documents/upload",
    form,
    { maxContentLength: MAX_CONTENT_LENGTH, maxBodyLength: MAX_CONTENT_LENGTH },
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

/** Import — hot path Browser→SFTPGo→MinIO ; fallback HTTP/MPU si SFTPGo indisponible. */
export async function uploadDocuments(
  items: Array<{
    file: File;
    titre?: string;
    folder_id?: number | null;
    relative_path?: string;
  }>,
  meta: UploadBatchMeta,
  onProgress?: (p: UploadBatchProgress) => void,
  signal?: AbortSignal,
): Promise<UploadBatchResult[]> {
  if (items.length === 0) return [];

  // MAX_CONTENT_LENGTH = classic multipart ceiling; larger files use SFTPGo / MPU.
  for (const it of items) {
    if (it.file.size > MAX_RESUMABLE_FILE_BYTES) {
      throw new Error(
        `Fichier trop volumineux (MAX_CONTENT_LENGTH resumable / ${MAX_RESUMABLE_FILE_BYTES} bytes)`,
      );
    }
  }

  try {
    const { putFilesViaSftpGo } =
      await import("@/services/sftpgo-upload.service");
    const byFolder = new Map<string, typeof items>();
    for (const it of items) {
      const fid = it.folder_id !== undefined ? it.folder_id : meta.folder_id;
      const key = fid == null ? "root" : String(fid);
      const list = byFolder.get(key) ?? [];
      list.push(it);
      byFolder.set(key, list);
    }

    const all: UploadBatchResult[] = [];
    let done = 0;
    for (const [key, group] of Array.from(byFolder.entries())) {
      const folder_id = key === "root" ? null : Number(key);
      const batch = await putFilesViaSftpGo(
        group.map((it) => ({
          file: it.file,
          titre: it.titre,
          relative_path: it.relative_path,
        })),
        {
          folder_id,
          description: meta.description,
          category: meta.type_document,
        },
        (p) =>
          onProgress?.({
            done: done + p.filesDone,
            total: items.length,
            currentName: p.fileName,
            bytesUploaded: p.bytesUploaded,
            bytesTotal: p.bytesTotal,
          }),
        signal,
      );
      done += group.length;
      all.push(...batch);
    }
    const disabled = all.every(
      (r) =>
        r.error &&
        /SFTPGo upload hot path disabled|SFTPGo integration disabled/i.test(
          r.error,
        ),
    );
    if (disabled) {
      // fall through to classic / MPU
    } else {
      // MPU fallback for files SFTPGo rejected as too large (mode=s3).
      const needsMpu = all.filter(
        (r) =>
          r.error &&
          /trop gros|MPU|mode.?s3|utilise MPU/i.test(r.error),
      );
      if (needsMpu.length === 0) return all;

      const recovered: UploadBatchResult[] = [];
      for (const row of all) {
        if (
          !row.error ||
          !/trop gros|MPU|mode.?s3|utilise MPU/i.test(row.error)
        ) {
          recovered.push(row);
          continue;
        }
        const item = items.find((it) => it.file === row.file);
        const title =
          item?.titre?.trim() ||
          row.file.name.replace(/\.[^.]+$/, "") ||
          row.file.name;
        const targetFolder =
          item?.folder_id !== undefined ? item.folder_id : meta.folder_id;
        try {
          const document = await putFileResumable(
            row.file,
            {
              title,
              description: meta.description,
              category: meta.type_document,
              folder_id: targetFolder,
            },
            (resumable) =>
              onProgress?.({
                done: recovered.filter((r) => r.document).length,
                total: items.length,
                currentName: row.file.name,
                bytesUploaded: resumable.bytesUploaded,
                bytesTotal: resumable.bytesTotal,
                resumable,
              }),
            signal,
          );
          recovered.push({ file: row.file, document });
        } catch (err) {
          recovered.push({
            file: row.file,
            error: getApiErrorMessage(err, "Echec upload MPU"),
          });
        }
      }
      return recovered;
    }
  } catch {
    // fall through to legacy
  }

  const results: UploadBatchResult[] = [];
  const total = items.length;
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { file, titre, folder_id } = items[i];
    const targetFolder = folder_id !== undefined ? folder_id : meta.folder_id;
    onProgress?.({ done: i, total, currentName: file.name });
    const title =
      titre?.trim() || file.name.replace(/\.[^.]+$/, "") || file.name;
    try {
      if (file.size > MAX_RESUMABLE_FILE_BYTES) {
        throw new Error(
          `Fichier trop volumineux (max ${MAX_RESUMABLE_FILE_BYTES / (1 << 30)} Go)`,
        );
      }
      if (
        file.size > MAX_CONTENT_LENGTH &&
        file.size > MAX_IMPORT_FILE_BYTES &&
        !isResumableFile(file)
      ) {
        throw new Error(
          `Fichier depasse MAX_CONTENT_LENGTH=${MAX_CONTENT_LENGTH}`,
        );
      }
      let document: Document;
      const uploadMeta = {
        title,
        description: meta.description,
        category: meta.type_document,
        folder_id: targetFolder,
      };
      if (isResumableFile(file)) {
        // MPU path — size already gated by MAX_CONTENT_LENGTH / MAX_RESUMABLE_FILE_BYTES
        document = await putFileResumable(
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
            }),
          signal,
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

export type SearchFacets = {
  classification?: Record<string, number>;
  category?: Record<string, number>;
};

export type SearchResult = {
  documents: Document[];
  total: number;
  facets?: SearchFacets;
};

export async function searchDocuments(
  q: string,
  options?:
    | boolean
    | { fullText?: boolean; classification?: string; category?: string },
): Promise<Document[]> {
  const opts = typeof options === "boolean" ? { fullText: options } : options;
  const result = await searchDocumentsDetailed(q, opts);
  return result.documents;
}

export async function searchDocumentsDetailed(
  q: string,
  options?: { fullText?: boolean; classification?: string; category?: string },
): Promise<SearchResult> {
  const fullText = options?.fullText !== false;
  const res = await api.get<{
    success: boolean;
    documents: Document[];
    total?: number;
    facets?: SearchFacets;
  }>("/api/documents/search", {
    params: {
      q,
      ...(fullText ? { mode: "fts" } : {}),
      ...(options?.classification
        ? { classification: options.classification }
        : {}),
      ...(options?.category ? { category: options.category } : {}),
    },
  });
  return {
    documents: res.data.documents ?? [],
    total: res.data.total ?? res.data.documents?.length ?? 0,
    facets: res.data.facets,
  };
}

export async function purgeDocument(id: number): Promise<void> {
  await api.delete(`/api/documents/${id}/purge`);
}

export async function getDocumentHold(id: number): Promise<{
  on_hold: boolean;
  hold?: { id: number; reason?: string };
}> {
  const res = await api.get<{
    success: boolean;
    on_hold: boolean;
    hold?: { id: number; reason?: string };
  }>(`/api/documents/${id}/hold`);
  return { on_hold: res.data.on_hold, hold: res.data.hold };
}

export async function placeDocumentHold(
  id: number,
  reason: string,
): Promise<void> {
  await api.post(`/api/documents/${id}/hold`, { reason });
}

export async function releaseDocumentHold(
  id: number,
  holdId: number,
): Promise<void> {
  await api.post(`/api/documents/${id}/hold/${holdId}/release`);
}

export async function getRecentDocuments(): Promise<Document[]> {
  const res = await api.get<{ success: boolean; documents: Document[] }>(
    "/api/documents/recent",
  );
  return res.data.documents ?? [];
}

export async function getTrashDocuments(): Promise<Document[]> {
  const res = await api.get<{ success: boolean; documents: Document[] }>(
    "/api/documents/trash",
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
  fileName: string,
): Promise<void> {
  const res = await fetchAuthenticated(downloadUrl(id));
  if (!res.ok) {
    throw new Error(await readFetchError(res));
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
