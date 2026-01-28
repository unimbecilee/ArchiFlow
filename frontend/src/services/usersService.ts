import api from './api';

export async function getUsersForApproval() {
  const { data } = await api.get('/users/for-approval');
  return data;
}
