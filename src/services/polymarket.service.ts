import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';
import { config } from '../config';

export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  image_url?: string;
  outcomes: string[];
  outcome_prices: number[];
  volume_24h: number;
  liquidity: number;
  expiry_date: string;
  creation_date: string;
  active: boolean;
}

export interface PolymarketTrade {
  id: string;
  market_id: string;
  outcome: string;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface OrderRequest {
  market_id: string;
  outcome: 'YES' | 'NO';
  quantity: number;
  limit_price: number;
  order_type: 'buy' | 'sell';
}

export interface OrderResponse {
  order_id: string;
  status: string;
  market_id: string;
  outcome: string;
  quantity: number;
  price: number;
}

export class PolymarketService {
  private client: AxiosInstance;
  private logger: Logger;
  private apiKey: string;
  private baseUrl = 'https://api.polymarket.com';

  constructor() {
    this.logger = new Logger('PolymarketService');
    this.apiKey = config.apis.polymarket;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 10000,
    });
  }

  /**
   * Test connection to Polymarket API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/markets', { params: { limit: 1 } });
      return response.status === 200;
    } catch (error) {
      this.logger.error('Polymarket connection test failed', error);
      return false;
    }
  }

  /**
   * Get all active markets matching criteria
   */
  async getMarkets(filters?: {
    limit?: number;
    offset?: number;
    sort?: 'volume' | 'liquidity' | 'creation_date';
    active?: boolean;
  }): Promise<PolymarketMarket[]> {
    try {
      const params = {
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
        sort: filters?.sort || 'volume',
        active: filters?.active !== false,
      };

      const response = await this.client.get('/markets', { params });
      return response.data.markets || [];
    } catch (error) {
      this.logger.error('Failed to fetch markets', error);
      throw error;
    }
  }

  /**
   * Get specific market details
   */
  async getMarket(marketId: string): Promise<PolymarketMarket | null> {
    try {
      const response = await this.client.get(`/markets/${marketId}`);
      return response.data || null;
    } catch (error) {
      this.logger.error(`Failed to fetch market ${marketId}`, error);
      return null;
    }
  }

  /**
   * Search markets by keywords
   */
  async searchMarkets(keywords: string, limit = 20): Promise<PolymarketMarket[]> {
    try {
      const response = await this.client.get('/markets/search', {
        params: { query: keywords, limit },
      });
      return response.data.markets || [];
    } catch (error) {
      this.logger.error(`Failed to search markets for "${keywords}"`, error);
      return [];
    }
  }

  /**
   * Get market price history
   */
  async getPriceHistory(
    marketId: string,
    resolution: '1h' | '4h' | '1d' = '1d',
    limit = 100
  ): Promise<Array<{ timestamp: string; price_yes: number; price_no: number; volume: number }>> {
    try {
      const response = await this.client.get(`/markets/${marketId}/prices`, {
        params: { resolution, limit },
      });
      return response.data.prices || [];
    } catch (error) {
      this.logger.error(`Failed to fetch price history for ${marketId}`, error);
      return [];
    }
  }

  /**
   * Get market trades
   */
  async getMarketTrades(marketId: string, limit = 100): Promise<PolymarketTrade[]> {
    try {
      const response = await this.client.get(`/markets/${marketId}/trades`, {
        params: { limit },
      });
      return response.data.trades || [];
    } catch (error) {
      this.logger.error(`Failed to fetch trades for market ${marketId}`, error);
      return [];
    }
  }

  /**
   * Get user's portfolio (if authenticated)
   */
  async getPortfolio(): Promise<any> {
    try {
      const response = await this.client.get('/user/portfolio');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch user portfolio', error);
      return null;
    }
  }

  /**
   * Create a new order
   */
  async createOrder(order: OrderRequest): Promise<OrderResponse | null> {
    try {
      const response = await this.client.post('/orders', order);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create order', error);
      return null;
    }
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(): Promise<OrderResponse[]> {
    try {
      const response = await this.client.get('/user/orders');
      return response.data.orders || [];
    } catch (error) {
      this.logger.error('Failed to fetch open orders', error);
      return [];
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.client.delete(`/orders/${orderId}`);
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Failed to cancel order ${orderId}`, error);
      return false;
    }
  }

  /**
   * Get trending markets
   */
  async getTrendingMarkets(limit = 10): Promise<PolymarketMarket[]> {
    try {
      const response = await this.client.get('/markets/trending', { params: { limit } });
      return response.data.markets || [];
    } catch (error) {
      this.logger.error('Failed to fetch trending markets', error);
      return [];
    }
  }
}

// Singleton instance
export const polymarketService = new PolymarketService();

export default PolymarketService;
