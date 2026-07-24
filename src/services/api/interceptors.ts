import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export function setupInterceptors(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('org_auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Auto-inject role header for backend RBAC middleware (require_role decorator)
      const rawUser = localStorage.getItem('org_auth_user');
      if (rawUser && config.headers) {
        try {
          const user = JSON.parse(rawUser);
          if (user?.role) {
            config.headers['X-User-Role'] = user.role;
          }
        } catch {
          // ignore parse errors — user just won't have role header
        }
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response && error.response.status === 401) {
        // Handle token expiration / unauthorized
        localStorage.removeItem('org_auth_token');
        localStorage.removeItem('org_auth_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}
