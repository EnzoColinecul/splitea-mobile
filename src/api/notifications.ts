import { Notification } from '../types';
import apiClient from './api-client';

export const notificationApi = {
  list: async (params?: { is_read?: boolean; limit?: number; offset?: number }) => {
    const response = await apiClient.get<{ notifications: Notification[]; total: number }>('/notification/', { params });
    return response.data;
  },
  markAsRead: async (ids: string[]) => {
    const response = await apiClient.patch('/notification/read', { ids });
    return response.data;
  },
};
