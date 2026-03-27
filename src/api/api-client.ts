import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { authEvents } from '../utils/auth-events';

const API_BASE_URL = 'http://192.168.68.63:8000/api'; // Update this to your local IP for physical device testing

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  // Logging for debugging
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  if (config.data) {
    console.log('[API Data]', config.data instanceof FormData ? '[FormData]' : config.data);
  }

  try {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} from ${response.config.url}`);
    console.log('[API Response Data]', response.data);
    return response;
  },
  (error) => {
    console.log(`[API Error] ${error.response?.status} from ${error.config?.url}`);
    console.log('[API Error Detail]', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.warn('Unauthorized request, emitting event');
      authEvents.emitUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
