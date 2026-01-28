import api from './api';

export async function getOrganizations() {
  const { data } = await api.get('/organizations');
  return data;
}
