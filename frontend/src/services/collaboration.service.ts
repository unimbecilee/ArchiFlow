import api from "@/lib/api";
import type {
  DocumentComment,
  DocumentVersion,
  Notification,
  SharedDocument,
  Tag,
} from "@/types/collaboration";
import type { Document } from "@/types/documents";

export async function getSharedWithMe(): Promise<SharedDocument[]> {
  const res = await api.get<{ success: boolean; documents: SharedDocument[] }>(
    "/api/documents/shared-with-me",
  );
  return res.data.documents ?? [];
}

export async function shareDocument(
  docId: number,
  payload: { email: string; message?: string; permissions?: string[] },
): Promise<void> {
  await api.post(`/api/documents/${docId}/share`, payload);
}

export async function getDocument(id: number): Promise<Document> {
  const res = await api.get<{ success: boolean; data: Document }>(
    `/api/documents/${id}`,
  );
  return res.data.data;
}

export async function listComments(docId: number): Promise<DocumentComment[]> {
  const res = await api.get<{ success: boolean; comments: DocumentComment[] }>(
    `/api/documents/${docId}/comments`,
  );
  return res.data.comments ?? [];
}

export async function addComment(
  docId: number,
  content: string,
  parentId?: number,
): Promise<DocumentComment> {
  const res = await api.post<{ success: boolean; comment: DocumentComment }>(
    `/api/documents/${docId}/comments`,
    { content, parent_id: parentId },
  );
  return res.data.comment;
}

export async function deleteComment(
  docId: number,
  commentId: number,
): Promise<void> {
  await api.delete(`/api/documents/${docId}/comments/${commentId}`);
}

export async function listVersions(docId: number): Promise<DocumentVersion[]> {
  const res = await api.get<{ success: boolean; versions: DocumentVersion[] }>(
    `/api/documents/${docId}/versions`,
  );
  return res.data.versions ?? [];
}

export function versionDownloadUrl(docId: number, versionId: number): string {
  return `/api/documents/${docId}/versions/${versionId}/download`;
}

export function versionPreviewUrl(docId: number, versionId: number): string {
  return `/api/documents/${docId}/versions/${versionId}/preview`;
}

export type DocumentEditableContent = {
  editable: boolean;
  content?: string;
  mime_type?: string;
  file_name?: string;
  reason?: string;
};

export async function getDocumentEditableContent(
  docId: number,
): Promise<DocumentEditableContent> {
  const res = await api.get<{
    success: boolean;
    data: DocumentEditableContent;
  }>(`/api/documents/${docId}/content`);
  return res.data.data;
}

export async function saveDocumentEdit(
  docId: number,
  content: string,
  commentaire?: string,
): Promise<DocumentVersion> {
  const res = await api.post<{ success: boolean; version: DocumentVersion }>(
    `/api/documents/${docId}/versions/edit`,
    { content, commentaire },
  );
  return res.data.version;
}

export async function uploadVersion(
  docId: number,
  file: File,
  comment?: string,
): Promise<DocumentVersion> {
  const form = new FormData();
  form.append("file", file);
  if (comment) form.append("comment", comment);
  const res = await api.post<{ success: boolean; version: DocumentVersion }>(
    `/api/documents/${docId}/versions`,
    form,
  );
  return res.data.version;
}

export async function getDocumentTags(docId: number): Promise<Tag[]> {
  const res = await api.get<{ success: boolean; data: Tag[] }>(
    `/api/documents/${docId}/tags`,
  );
  return res.data.data ?? [];
}

export async function addDocumentTag(
  docId: number,
  name: string,
  color?: string,
): Promise<Tag[]> {
  const res = await api.post<{ success: boolean; data: Tag[] }>(
    `/api/documents/${docId}/tags`,
    { name, color: color || "#3b82f6" },
  );
  return res.data.data ?? [];
}

export async function removeDocumentTag(
  docId: number,
  tagId: number,
): Promise<void> {
  await api.delete(`/api/documents/${docId}/tags/${tagId}`);
}

export async function listNotifications(): Promise<{
  data: Notification[];
  unread: number;
  unread_shares: number;
}> {
  const res = await api.get<{
    success: boolean;
    data: Notification[];
    unread: number;
    unread_shares?: number;
  }>("/api/notifications");
  return {
    data: res.data.data ?? [],
    unread: res.data.unread ?? 0,
    unread_shares: res.data.unread_shares ?? 0,
  };
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.put(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put("/api/notifications/read-all");
}
