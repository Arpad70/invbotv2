import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
    this.client.interceptors.request.use(
      (config) => {
        // Get token from Zustand store in localStorage
        const authStore = localStorage.getItem('auth-store');
        let token = null;
        
        if (authStore) {
          try {
            const parsed = JSON.parse(authStore);
            token = parsed.state?.accessToken || null;
          } catch (e) {
            // Store not yet initialized
            token = null;
          }
        }
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If token expired, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Get token from store
            const authStore = localStorage.getItem('auth-store');
            let refreshToken = null;
            
            if (authStore) {
              try {
                const parsed = JSON.parse(authStore);
                refreshToken = parsed.state?.refreshToken || null;
              } catch (e) {
                refreshToken = null;
              }
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken } = response.data;
            
            // Update the store with new token
            const updated = localStorage.getItem('auth-store');
            if (updated) {
              try {
                const parsed = JSON.parse(updated);
                parsed.state.accessToken = accessToken;
                localStorage.setItem('auth-store', JSON.stringify(parsed));
              } catch (e) {
                // Could not parse, create new
                localStorage.setItem('auth-store', JSON.stringify({ state: { accessToken, refreshToken } }));
              }
            }

            // Retry original request
            const token = accessToken;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens
            localStorage.removeItem('auth-store');
            window.location.href = '/';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async login(username: string, password: string) {
    return this.client.post('/auth/login', { username, password });
  }

  async register(username: string, email: string, password: string) {
    return this.client.post('/auth/register', { username, email, password });
  }

  async refreshToken() {
    // Get token from Zustand store in localStorage
    const authStore = localStorage.getItem('auth-store');
    let refreshToken = null;
    
    if (authStore) {
      try {
        const parsed = JSON.parse(authStore);
        refreshToken = parsed.state?.refreshToken || null;
      } catch (e) {
        refreshToken = null;
      }
    }

    return this.client.post('/auth/refresh', { refreshToken });
  }

  // User endpoints
  async getProfile() {
    return this.client.get('/users/me');
  }

  async updateProfile(data: Record<string, any>) {
    return this.client.put('/users/me', data);
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.client.post('/users/me/change-password', { currentPassword: oldPassword, newPassword });
  }

  // API Keys endpoints
  async getApiKeys() {
    return this.client.get('/users/me/api-keys');
  }

  async addApiKey(platform: string, apiKey: string) {
    return this.client.post('/users/me/api-keys', { platform, apiKey });
  }

  async removeApiKey(platform: string) {
    return this.client.delete(`/users/me/api-keys/${platform}`);
  }

  // Portfolio endpoints
  async getPortfolios() {
    return this.client.get('/portfolios');
  }

  async getPortfolio(id: number) {
    return this.client.get(`/portfolios/${id}`);
  }

  async createPortfolio(data: Record<string, any>) {
    return this.client.post('/portfolios', data);
  }

  async updatePortfolio(id: number, data: Record<string, any>) {
    return this.client.put(`/portfolios/${id}`, data);
  }

  async deletePortfolio(id: number) {
    return this.client.delete(`/portfolios/${id}`);
  }

  // Strategy endpoints
  async getStrategies(portfolioId: number) {
    return this.client.get(`/strategies?portfolioId=${portfolioId}`);
  }

  async getStrategy(id: number) {
    return this.client.get(`/strategies/${id}`);
  }

  async createStrategy(data: Record<string, any>) {
    return this.client.post('/strategies', data);
  }

  async updateStrategy(id: number, data: Record<string, any>) {
    return this.client.put(`/strategies/${id}`, data);
  }

  async deleteStrategy(id: number) {
    return this.client.delete(`/strategies/${id}`);
  }

  // Trade endpoints
  async getTrades(portfolioId: number) {
    return this.client.get(`/trades?portfolioId=${portfolioId}`);
  }

  async getTrade(id: number) {
    return this.client.get(`/trades/${id}`);
  }

  async createTrade(data: Record<string, any>) {
    return this.client.post('/trades', data);
  }

  async approveTrade(id: number) {
    return this.client.post(`/trades/${id}/approve`);
  }

  async closeTrade(id: number) {
    return this.client.post(`/trades/${id}/close`);
  }

  async getTradeMetrics(portfolioId: number) {
    return this.client.get(`/trades/metrics?portfolioId=${portfolioId}`);
  }

  async getPortfolioTrades(portfolioId: number, page: number = 1, limit: number = 50) {
    return this.client.get(`/portfolios/${portfolioId}/trades?page=${page}&limit=${limit}`);
  }

  async getPortfolioStats(portfolioId: number) {
    return this.client.get(`/portfolios/${portfolioId}/stats`);
  }
}

export const apiClient = new ApiClient();
