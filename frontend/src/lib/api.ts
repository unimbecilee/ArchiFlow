import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/types/auth';
import { refreshAccessToken, clearAuthSession } from '@/lib/auth-session';
import { getApiBaseUrl } from '@/lib/api-base';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/session-tokens';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      withCredentials: true,
      // Prevent unbounded request/response bodies (Herozion / axios guidance).
      maxContentLength: 50 * 1024 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024 * 1024,
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        const isFormData =
          typeof FormData !== 'undefined' && config.data instanceof FormData;
        if (isFormData) {
          if (config.headers) {
            delete config.headers['Content-Type'];
          }
        } else if (config.data !== undefined && config.method !== 'get') {
          config.headers = config.headers ?? {};
          if (!config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
          const req = originalRequest as typeof originalRequest & { _retry?: boolean };
          if (req._retry) {
            return Promise.reject(error);
          }

          req._retry = true;
          const newToken = await this.ensureRefresh();
          if (newToken) {
            req.headers.Authorization = `Bearer ${newToken}`;
            return this.client(req);
          }

          await clearAuthSession();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private ensureRefresh(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = refreshAccessToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  get axios() {
    return this.client;
  }

  setToken(token: string) {
    setAccessToken(token);
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  clearToken() {
    clearAccessToken();
    delete this.client.defaults.headers.common.Authorization;
  }

  async refreshSession(): Promise<string | null> {
    const token = await this.ensureRefresh();
    if (token) {
      this.setToken(token);
    }
    return token;
  }
}

export const api = new ApiClient();
export default api.axios;
