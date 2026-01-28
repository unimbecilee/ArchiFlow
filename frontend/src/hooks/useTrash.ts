import { useMutation, useQuery, useQueryClient } from 'react-query';
import { listTrash, restoreTrashItem, deleteTrashItem, bulkRestore, bulkDelete, TrashListParams } from '../services/trashService';

export function useTrash(params?: TrashListParams) {
  return useQuery(['trash', params], () => listTrash(params));
}

export function useRestoreTrashItem() {
  const qc = useQueryClient();
  return useMutation((trashId: number) => restoreTrashItem(trashId), {
    onSuccess: () => qc.invalidateQueries('trash'),
  });
}

export function useDeleteTrashItem() {
  const qc = useQueryClient();
  return useMutation((trashId: number) => deleteTrashItem(trashId), {
    onSuccess: () => qc.invalidateQueries('trash'),
  });
}

export function useBulkRestore() {
  const qc = useQueryClient();
  return useMutation((ids: number[]) => bulkRestore(ids), {
    onSuccess: () => qc.invalidateQueries('trash'),
  });
}

export function useBulkDelete() {
  const qc = useQueryClient();
  return useMutation((ids: number[]) => bulkDelete(ids), {
    onSuccess: () => qc.invalidateQueries('trash'),
  });
}
