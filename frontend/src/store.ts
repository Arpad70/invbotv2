import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  userId: number;
  username: string;
  email: string;
  timezone: string;
  initialCapital: number;
  isActive: boolean;
  createdAt: string;
  polymarket_api_key?: string;
  kalshi_api_key?: string;
  opinion_api_key?: string;
  last_login?: string;
}

export interface Portfolio {
  portfolio_id: number;
  user_id: number;
  name: string;
  description: string;
  current_balance: string;
  realized_pnl: string;
  unrealized_pnl: string;
  total_pnl: string;
  roi_percent: number;
  created_at: string;
  updated_at: string;
}

export interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export interface PortfolioStore {
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | null;
  isLoading: boolean;
  error: string | null;
  setPortfolios: (portfolios: Portfolio[]) => void;
  setSelectedPortfolio: (portfolio: Portfolio | null) => void;
  addPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (portfolio: Portfolio) => void;
  removePortfolio: (portfolioId: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  portfolios: [],
  selectedPortfolio: null,
  isLoading: false,
  error: null,
  setPortfolios: (portfolios) => set({ portfolios }),
  setSelectedPortfolio: (portfolio) => set({ selectedPortfolio: portfolio }),
  addPortfolio: (portfolio) =>
    set((state) => ({
      portfolios: [...state.portfolios, portfolio],
    })),
  updatePortfolio: (portfolio) =>
    set((state) => ({
      portfolios: state.portfolios.map((p) =>
        p.portfolio_id === portfolio.portfolio_id ? portfolio : p
      ),
    })),
  removePortfolio: (portfolioId) =>
    set((state) => ({
      portfolios: state.portfolios.filter((p) => p.portfolio_id !== portfolioId),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export interface MarketData {
  id: string;
  name: string;
  price: number;
  volume: number;
  spread: number;
  trend: 'up' | 'down' | 'sideways';
  volatility: number;
}

export interface MarketStore {
  markets: MarketData[];
  selectedMarket: MarketData | null;
  isLoading: boolean;
  error: string | null;
  setMarkets: (markets: MarketData[]) => void;
  setSelectedMarket: (market: MarketData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  markets: [],
  selectedMarket: null,
  isLoading: false,
  error: null,
  setMarkets: (markets) => set({ markets }),
  setSelectedMarket: (market) => set({ selectedMarket: market }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
