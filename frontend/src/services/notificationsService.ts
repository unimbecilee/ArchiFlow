import api from './api';

export type NotificationsParams = {
  page?: number;
  per_page?: number;
  unread_only?: boolean | string;
  type?: string;
};

export async function listNotifications(params?: NotificationsParams) {
  const { data } = await api.get('/notifications', { params });
  return data;
}

export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.unread_count as number;
}

export async function markAsRead(notificationId: number) {
  const { data } = await api.put(`/notifications/${notificationId}/read`, {});
  return data;
}

export async function markAllAsRead() {
  const { data } = await api.put('/notifications/mark-all-read', {});
  return data;
}

export async function getPreferences() {
  const { data } = await api.get('/notifications/preferences');
  return data;
}

export async function getStats() {
  const { data } = await api.get('/notifications/stats');
  return data;
}

export async function clickNotification(notificationId: number) {
  const { data } = await api.post(`/notifications/${notificationId}/click`, {});
  return data as { redirect_url: string; notification_type: string; action_required: boolean };
}

export async function notifyArchiveRequest(payload: { document_id: number; document_title: string; comment?: string }) {
  const { data } = await api.post('/notifications/archive-request', payload);
  return data;
}
