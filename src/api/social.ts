import { Friend, Group } from '../types';
import apiClient from './api-client';

export const groupsApi = {
  list: async () => {
    const response = await apiClient.get<{ groups: Group[] }>('/group/list');
    return response.data.groups;
  },
  create: async (data: { name: string; description: string }) => {
    const response = await apiClient.post<Group>('/group/create', data);
    return response.data;
  },
  addFriends: async (groupId: string, friend_ids: string[]) => {
    const response = await apiClient.post(`/group/${groupId}/add-friends`, { friend_ids });
    return response.data;
  },
  leave: async (groupId: string) => {
    const response = await apiClient.delete(`/group/${groupId}/leave`);
    return response.data;
  },
  delete: async (groupId: string) => {
    const response = await apiClient.delete(`/group/${groupId}`);
    return response.data;
  },
  getUsers: async (groupId: string) => {
    const response = await apiClient.get<{ users: string[] }>(`/group/${groupId}/users`);
    return response.data;
  }
};

export const friendsApi = {
  list: async () => {
    const response = await apiClient.get<{ friends: Friend[] }>('/friend/list');
    return response.data.friends;
  },
  search: async (query: string) => {
    const response = await apiClient.get(`/friend/search?q=${query}`);
    return response.data;
  },
  sendRequest: async (email: string) => {
    const response = await apiClient.post('/friend/request', { email });
    return response.data;
  },
  acceptRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friend/request/${requestId}/accept`);
    return response.data;
  },
  rejectRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friend/request/${requestId}/reject`);
    return response.data;
  },
  remove: async (friendId: string) => {
    const response = await apiClient.delete(`/friend/${friendId}`);
    return response.data;
  },
};
