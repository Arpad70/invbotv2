import { Wallet } from 'ethers';
import {
  ClobClient,
  OrderType,
  Side,
  ApiError,
  OrderBookSummary,
  OpenOrder,
} from '@polymarket/clob-client';
import { Logger } from '../utils/logger';

/**
 * Order side enum
 */
export enum TradeSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Order type enum
 */
export enum OrderTypeEnum {
  GOOD_TILL_CANCEL = 'GTC',
  FILL_OR_KILL = 'FOK',
}

/**
 * Polymarket CLOB Service
 */
export class PolymarketClobService {
  private clobClient: ClobClient | null = null;
  private wallet: Wallet | null = null;
  private logger: Logger;
  private hostUrl = 'https://clob.polymarket.com';
  private chainId = 137; // Polygon

  constructor() {
    this.logger = new Logger('PolymarketClobService');
  }

  /**
   * Initialize CLOB client with ethers Wallet
   */
  async initialize(privateKey: string, funderAddress?: string): Promise<boolean> {
    try {
      if (!privateKey) {
        this.logger.error('Private key is required for CLOB initialization');
        return false;
      }

      this.wallet = new Wallet(privateKey);

      // Initialize CLOB client with ethers Wallet
      this.clobClient = new ClobClient(
        this.hostUrl,
        this.chainId,
        this.wallet as any,
        undefined,
        1, // signature type: 1 = Email/Magic
        funderAddress || this.wallet.address
      );

      this.logger.info(`CLOB client initialized for wallet: ${this.wallet.address}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize CLOB client', error);
      return false;
    }
  }

  /**
   * Create or derive API credentials
   */
  async deriveOrCreateApiKey(): Promise<boolean> {
    try {
      if (!this.clobClient) {
        this.logger.error('CLOB client not initialized');
        return false;
      }

      const apiKeyCreds = await this.clobClient.createOrDeriveApiKey();
      this.logger.info('API key credentials created/derived successfully');
      return !!apiKeyCreds && !!apiKeyCreds.key;
    } catch (error) {
      this.logger.error('Failed to create/derive API key', error);
      return false;
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.clobClient !== null && this.wallet !== null;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Create and post an order
   */
  async createAndPostOrder(
    userOrder: any,
    options: any = {}
  ): Promise<any> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      // Create and post order (uses GTC by default)
      const result = await this.clobClient.createAndPostOrder(
        {
          tokenID: userOrder.tokenID,
          price: userOrder.price,
          side: userOrder.side === TradeSide.BUY ? Side.BUY : Side.SELL,
          size: userOrder.size,
        },
        options,
        OrderType.GTC
      );

      this.logger.info('Order created and posted', {
        tokenID: userOrder.tokenID,
        side: userOrder.side,
        size: userOrder.size,
      });

      return {
        success: true,
        order: result,
      };
    } catch (error) {
      this.logger.error('Failed to create/post order', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an  order
   */
  async cancelOrder(orderPayload: any): Promise<boolean> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      await this.clobClient.cancelOrder(orderPayload);
      this.logger.info('Order cancelled successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel order', error);
      return false;
    }
  }

  /**
   * Get order book for a token
   */
  async getOrderBook(tokenID: string): Promise<any> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      const book: OrderBookSummary = await this.clobClient.getOrderBook(tokenID);
      return book || null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        this.logger.debug(`No order book found for token ${tokenID}`);
        return null;
      }
      this.logger.error(`Failed to get order book for ${tokenID}`, error);
      return null;
    }
  }

  /**
   * Get all open orders
   */
  async getOpenOrders(): Promise<OpenOrder[]> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      const response: any = await this.clobClient.getOpenOrders();
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (error) {
      this.logger.error('Failed to get open orders', error);
      return [];
    }
  }

  /**
   * Get a specific order
   */
  async getOrder(orderID: string): Promise<OpenOrder | null> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      return await this.clobClient.getOrder(orderID);
    } catch (error) {
      this.logger.error(`Failed to get order ${orderID}`, error);
      return null;
    }
  }

  /**
   * Get balance allowance
   */
  async getBalanceAllowance(): Promise<any> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      return await this.clobClient.getBalanceAllowance();
    } catch (error) {
      this.logger.error('Failed to get balance allowance', error);
      return null;
    }
  }

  /**
   * Get tick size for a token
   */
  async getTickSize(tokenID: string): Promise<string | null> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      const tickSize = await this.clobClient.getTickSize(tokenID);
      return tickSize || null;
    } catch (error) {
      this.logger.error(`Failed to get tick size for ${tokenID}`, error);
      return null;
    }
  }

  /**
   * Get neg risk status
   */
  async getNegRisk(tokenID: string): Promise<boolean> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      return await this.clobClient.getNegRisk(tokenID);
    } catch (error) {
      this.logger.error(`Failed to get neg risk for ${tokenID}`, error);
      return false;
    }
  }

  /**
   * Get trades
   */
  async getTrades(params?: any): Promise<any[]> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      return await this.clobClient.getTrades(params);
    } catch (error) {
      this.logger.error('Failed to get trades', error);
      return [];
    }
  }

  /**
   * Get midpoint price
   */
  async getMidpoint(tokenID: string): Promise<any> {
    try {
      if (!this.clobClient) {
        throw new Error('CLOB client not initialized');
      }

      return await this.clobClient.getMidpoint(tokenID);
    } catch (error) {
      this.logger.error(`Failed to get midpoint for ${tokenID}`, error);
      return null;
    }
  }

  /**
   * Reset service
   */
  reset(): void {
    this.clobClient = null;
    this.wallet = null;
    this.logger.info('CLOB service reset');
  }
}

// Export singleton
export const polymarketClobService = new PolymarketClobService();
