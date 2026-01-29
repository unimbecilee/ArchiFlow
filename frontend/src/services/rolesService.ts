import api from './api';

export async function getSharingRoles() {
  const { data } = await api.get('/api/sharing/roles');
  return data;
}
