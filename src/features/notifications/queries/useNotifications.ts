import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationSettings,
  listNotifications,
  markNotificationsRead,
  updateNotificationSettings,
  type NotificationPage,
  type NotificationSettings,
} from '../api/notificationsApi';

export const notificationKeys = {
  list: ['notifications', 'list'] as const,
  settings: ['notifications', 'settings'] as const,
};

/** Avisos: atualiza a cada minuto com a aba visível (o ponto vermelho do sino). */
export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.list, queryFn: listNotifications, refetchInterval: 60_000 });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    meta: { silent: true },
    onMutate: (ids) => {
      const at = new Date().toISOString();
      queryClient.setQueryData<NotificationPage>(notificationKeys.list, (old) =>
        old
          ? {
              ...old,
              unread: 0,
              items: old.items.map((n) => (!n.readAt && (!ids || ids.includes(n.id)) ? { ...n, readAt: at } : n)),
            }
          : old,
      );
    },
  });
}

export function useNotificationSettings() {
  return useQuery({ queryKey: notificationKeys.settings, queryFn: getNotificationSettings });
}

/** Cada interruptor salva na hora (otimista, com volta se falhar). */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.settings });
      const previous = queryClient.getQueryData<NotificationSettings>(notificationKeys.settings);
      if (previous) queryClient.setQueryData(notificationKeys.settings, { ...previous, ...patch });
      return { previous };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(notificationKeys.settings, ctx.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(notificationKeys.settings, settings),
  });
}
