import api from './api';

export type ShareRecipient = {
  type: 'utilisateur' | 'role' | 'organisation';
  id: string | number;
  nom?: string;
};

export type ShareRequest = {
  destinataires: ShareRecipient[];
  permissions?: Array<'lecture' | 'téléchargement' | 'modification' | 'commentaire' | 'partage_supplementaire'>;
  date_expiration?: string; // ISO8601
  commentaire?: string;
};

export async function createShare(documentId: number, payload: ShareRequest) {
  const { data } = await api.post(`/api/documents/${documentId}/share`, payload);
  return data;
}

export async function updateShare(shareId: number, payload: Partial<ShareRequest>) {
  const { data } = await api.put(`/shares/${shareId}`, payload);
  return data;
}

export async function revokeShare(shareId: number) {
  const { data } = await api.delete(`/shares/${shareId}`);
  return data;
}
