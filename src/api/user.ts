import { User, UserUpdate } from '../types';
import apiClient from './api-client';

export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get<User>('/user/profile');
    return response.data;
  },
  updateProfile: async (data: UserUpdate) => {
    const response = await apiClient.put<User>('/user/profile', data);
    return response.data;
  },
};
