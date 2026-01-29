import api from './api';

export async function getUsersForApproval() {
  const { data } = await api.get('/api/users/for-approval');
  return data;
}
