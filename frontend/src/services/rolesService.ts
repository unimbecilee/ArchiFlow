import api from './api';

export async function getSharingRoles() {
  const { data } = await api.get('/sharing/roles');
  return data;
}
