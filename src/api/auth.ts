import * as SecureStore from 'expo-secure-store';
import { AuthResponse } from '../types';
import apiClient from './api-client';

export const authApi = {
  login: async (formData: FormData) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  register: async (data: any) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await apiClient.post(`/auth/forgot-password?email=${email}`);
    return response.data;
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
  },
};
