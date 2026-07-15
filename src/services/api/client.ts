import axios from 'axios';
import { setupInterceptors } from './interceptors';

const apiClient = axios.create({
  baseURL: '', // Proxied via Vite
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds
});

setupInterceptors(apiClient);

export default apiClient;
