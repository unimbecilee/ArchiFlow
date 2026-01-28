import api from './api';

export type TrashListParams = {
  page?: number;
  per_page?: number;
  type?: string;
  user_filter?: 'own' | 'all';
  search?: string;
};

export async function listTrash(params?: TrashListParams) {
  const { data } = await api.get('/trash', { params });
  return data;
}

export async function restoreTrashItem(trashId: number) {
  const { data } = await api.post(`/trash/${trashId}/restore`, {});
  return data;
}

export async function deleteTrashItem(trashId: number) {
  const { data } = await api.delete(`/trash/${trashId}`);
  return data;
}

export async function bulkRestore(trashIds: number[]) {
  const { data } = await api.post('/trash/bulk-restore', { trash_ids: trashIds });
  return data;
}

export async function bulkDelete(trashIds: number[]) {
  const { data } = await api.delete('/trash/bulk-delete', { data: { trash_ids: trashIds } });
  return data;
}
