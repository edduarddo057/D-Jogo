import { http, type Schema } from '@/lib/http';

export type Notification = Schema<'Notification'>;
export type NotificationPage = Schema<'NotificationPage'>;
export type NotificationSettings = Schema<'NotificationSettings'>;

export async function listNotifications(): Promise<NotificationPage> {
  const { data } = await http.get<NotificationPage>('/me/notifications', { params: { limit: 50 } });
  return data;
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  await http.post('/me/notifications/read', ids ? { ids } : {});
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await http.get<NotificationSettings>('/me/notification-settings');
  return data;
}

export async function updateNotificationSettings(patch: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const { data } = await http.patch<NotificationSettings>('/me/notification-settings', patch);
  return data;
}
