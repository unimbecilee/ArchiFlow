import { useMutation } from 'react-query';
import { createShare, revokeShare, updateShare, ShareRequest } from '../services/sharingService';

export function useCreateShare(documentId: number) {
  return useMutation((payload: ShareRequest) => createShare(documentId, payload));
}

export function useUpdateShare() {
  return useMutation((vars: { shareId: number; payload: Partial<ShareRequest> }) =>
    updateShare(vars.shareId, vars.payload)
  );
}

export function useRevokeShare() {
  return useMutation((shareId: number) => revokeShare(shareId));
}
