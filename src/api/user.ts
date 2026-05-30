import { UploadUrlResponse, User, UserUpdate } from '../types';
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
  getUploadUrl: async (filename: string, contentType: string = 'image/jpeg') => {
    const response = await apiClient.get<UploadUrlResponse>('/user/upload-url', {
      params: { filename, content_type: contentType },
    });
    return response.data;
  },
};
