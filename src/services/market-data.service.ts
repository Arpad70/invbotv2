import { db } from '../config/database';
import { Logger } from '../utils/logger';
import { polymarketService } from './polymarket.service';

export interface MarketSnapshot {
  marketId: string;
  marketName: string;
  priceYes: number;
  priceNo: number;
  volume24h: number;
  liquidity: number;
  spread: number;
  spreadPercent: number;
  active: boolean;
  expiryDate: string;
}

export class MarketDataService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MarketDataService');
  }

  /**
   * Fetch all markets and calculate spreads
   */
  async getAllMarketsWithAnalysis(): Promise<MarketSnapshot[]> {
    try {
      const markets = await polymarketService.getMarkets({ limit: 100 });

      const snapshots: MarketSnapshot[] = markets.map(market => {
        const priceYes = market.outcome_prices[0] || 0.5;
        const priceNo = market.outcome_prices[1] || 0.5;
        const spread = Math.abs(priceYes - priceNo);
        const spreadPercent = (spread / ((priceYes + priceNo) / 2)) * 100;

        return {
          marketId: market.id,
          marketName: market.question,
          priceYes,
          priceNo,
          volume24h: market.volume_24h,
          liquidity: market.liquidity,
          spread,
          spreadPercent,
          active: market.active,
          expiryDate: market.expiry_date,
        };
      });

      // Store in database
      for (const snapshot of snapshots) {
        const sql = `
          INSERT INTO market_data_snapshots 
          (market_id, market_name, price_yes, price_no, volume_24h, liquidity, spread_percent, active, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          price_yes = ?, price_no = ?, volume_24h = ?, liquidity = ?, spread_percent = ?, last_updated = NOW()
        `;

        await db.execute(sql, [
          snapshot.marketId,
          snapshot.marketName,
          snapshot.priceYes,
          snapshot.priceNo,
          snapshot.volume24h,
          snapshot.liquidity,
          snapshot.spreadPercent,
          snapshot.active,
          snapshot.expiryDate,
          snapshot.priceYes,
          snapshot.priceNo,
          snapshot.volume24h,
          snapshot.liquidity,
          snapshot.spreadPercent,
        ]);
      }

      this.logger.info(`Fetched and stored ${snapshots.length} market snapshots`);
      return snapshots;
    } catch (error) {
      this.logger.error('Failed to fetch markets', error);
      return [];
    }
  }

  /**
   * Find arbitrage opportunities (imbalanced spreads)
   */
  async findArbitrageOpportunities(minSpreadPercent = 5): Promise<MarketSnapshot[]> {
    try {
      const markets = await this.getAllMarketsWithAnalysis();

      const opportunities = markets.filter(m => 
        m.spreadPercent >= minSpreadPercent && 
        m.liquidity > 1000 &&
        m.active &&
        new Date(m.expiryDate) > new Date()
      );

      // Store opportunities in database
      for (const opp of opportunities) {
        const sql = `
          INSERT INTO arbitrage_opportunities 
          (market_id, market_name, spread_percent, price_yes, price_no, liquidity, opportunity_type)
          VALUES (?, ?, ?, ?, ?, ?, 'IMBALANCE')
        `;

        await db.execute(sql, [
          opp.marketId,
          opp.marketName,
          opp.spreadPercent,
          opp.priceYes,
          opp.priceNo,
          opp.liquidity,
        ]);
      }

      this.logger.info(`Found ${opportunities.length} arbitrage opportunities`);
      return opportunities;
    } catch (error) {
      this.logger.error('Failed to find arbitrage opportunities', error);
      return [];
    }
  }

  /**
   * Get market analysis for specific markets
   */
  async getMarketAnalysis(marketIds: string[]): Promise<Record<string, any>> {
    const analysis: Record<string, any> = {};

    for (const marketId of marketIds) {
      try {
        const market = await polymarketService.getMarket(marketId);
        if (!market) continue;

        const priceHistory = await polymarketService.getPriceHistory(marketId, '1d', 30);
        const trades = await polymarketService.getMarketTrades(marketId, 50);

        analysis[marketId] = {
          market: {
            id: market.id,
            question: market.question,
            outcomes: market.outcomes,
          },
          prices: {
            yes: market.outcome_prices[0] || 0.5,
            no: market.outcome_prices[1] || 0.5,
          },
          liquidity: market.liquidity,
          volume24h: market.volume_24h,
          priceHistory: priceHistory.slice(-7), // Last 7 days
          recentTrades: trades.slice(0, 10),
          trend: this.calculateTrend(priceHistory),
          volatility: this.calculateVolatility(priceHistory),
        };
      } catch (error) {
        this.logger.error(`Failed to analyze market ${marketId}`, error);
      }
    }

    return analysis;
  }

  /**
   * Calculate price trend from history
   */
  private calculateTrend(priceHistory: any[]): 'up' | 'down' | 'sideways' {
    if (priceHistory.length < 2) return 'sideways';

    const recent = priceHistory.slice(-7);

    const firstPrice = recent[0]?.price_yes || 0.5;
    const lastPrice = recent[recent.length - 1]?.price_yes || 0.5;

    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (change > 2) return 'up';
    if (change < -2) return 'down';
    return 'sideways';
  }

  /**
   * Calculate volatility from price history
   */
  private calculateVolatility(priceHistory: any[]): number {
    if (priceHistory.length < 2) return 0;

    const prices = priceHistory.map(item => item.price_yes || 0.5);
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return Number((stdDev / mean * 100).toFixed(2));
  }

  /**
   * Get high-liquidity markets
   */
  async getHighLiquidityMarkets(minLiquidity = 5000, limit = 20): Promise<MarketSnapshot[]> {
    try {
      const markets = await this.getAllMarketsWithAnalysis();
      return markets
        .filter(m => m.liquidity >= minLiquidity && m.active)
        .sort((a, b) => b.liquidity - a.liquidity)
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get high liquidity markets', error);
      return [];
    }
  }

  /**
   * Get markets expiring soon
   */
  async getMarketsExpiringSoon(daysFromNow = 7): Promise<MarketSnapshot[]> {
    try {
      const markets = await this.getAllMarketsWithAnalysis();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysFromNow);

      return markets
        .filter(m => {
          const expiryDate = new Date(m.expiryDate);
          return expiryDate <= futureDate && expiryDate > new Date() && m.active;
        })
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    } catch (error) {
      this.logger.error('Failed to find markets expiring soon', error);
      return [];
    }
  }
}

export const marketDataService = new MarketDataService();

export default MarketDataService;
