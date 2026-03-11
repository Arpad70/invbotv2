import { Logger } from '../utils/logger';
import { marketDataService } from './market-data.service';

export interface TradeSignal {
  strategyType: string;
  marketId: string;
  marketName: string;
  side: 'BUY' | 'SELL';
  confidence: number; // 0-100
  reason: string;
  suggestedSize: number;
  timestamp: Date;
}

export abstract class TradingStrategy {
  protected logger: Logger;
  protected strategyType: string;
  protected portfolioId: number;
  protected maxPositionSize: number = 500; // Max USD per trade

  constructor(strategyType: string, portfolioId: number) {
    this.strategyType = strategyType;
    this.portfolioId = portfolioId;
    this.logger = new Logger(`Strategy_${strategyType}`);
  }

  /**
   * Abstract method - each strategy implements its own signal generation
   */
  abstract generateSignal(): Promise<TradeSignal | null>;

  /**
   * Execute strategy - find signals and create trades
   */
  async execute(): Promise<TradeSignal[]> {
    try {
      const signals: TradeSignal[] = [];
      const signal = await this.generateSignal();

      if (signal && signal.confidence >= 50) {
        signals.push(signal);
        this.logger.info(`${this.strategyType} - Generated signal: ${signal.marketName} (${signal.confidence}% confidence)`);
      }

      return signals;
    } catch (error) {
      this.logger.error(`${this.strategyType} execution error`, error);
      return [];
    }
  }
}

/**
 * Strategy 1: Arbitrage - Find imbalanced spreads
 */
export class ArbitrageStrategy extends TradingStrategy {
  private minSpreadPercent = 5;

  constructor(portfolioId: number) {
    super('ARBITRAGE', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    const opportunities = await marketDataService.findArbitrageOpportunities(this.minSpreadPercent);

    if (opportunities.length === 0) return null;

    // Take best opportunity by spread
    const best = opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent)[0];

    // Buy underpriced outcome
    const side = best.priceYes < best.priceNo ? 'BUY' : 'SELL';

    return {
      strategyType: 'ARBITRAGE',
      marketId: best.marketId,
      marketName: best.marketName,
      side,
      confidence: Math.min(100, best.spreadPercent * 10),
      reason: `Spread ${best.spreadPercent.toFixed(2)}% - ${side} ${side === 'BUY' ? 'YES' : 'NO'}`,
      suggestedSize: Math.min(this.maxPositionSize, 100),
      timestamp: new Date(),
    };
  }
}

/**
 * Strategy 2: Momentum - Follow price trends
 */
export class MomentumStrategy extends TradingStrategy {
  constructor(portfolioId: number) {
    super('MOMENTUM', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    const markets = await marketDataService.getHighLiquidityMarkets(10000, 30);

    for (const market of markets) {
      const analysis = await marketDataService.getMarketAnalysis([market.marketId]);
      const marketAnalysis = analysis[market.marketId];

      if (!marketAnalysis || !marketAnalysis.trend) continue;

      if (marketAnalysis.trend === 'up' && marketAnalysis.prices.yes < marketAnalysis.prices.no) {
        return {
          strategyType: 'MOMENTUM',
          marketId: market.marketId,
          marketName: market.marketName,
          side: 'BUY',
          confidence: 70,
          reason: 'Uptrend momentum detected - buying underpriced YES',
          suggestedSize: this.maxPositionSize,
          timestamp: new Date(),
        };
      }

      if (marketAnalysis.trend === 'down' && marketAnalysis.prices.no < marketAnalysis.prices.yes) {
        return {
          strategyType: 'MOMENTUM',
          marketId: market.marketId,
          marketName: market.marketName,
          side: 'BUY',
          confidence: 70,
          reason: 'Downtrend momentum detected - buying underpriced NO',
          suggestedSize: this.maxPositionSize,
          timestamp: new Date(),
        };
      }
    }

    return null;
  }
}

/**
 * Strategy 3: Mean Reversion - Buy when price deviates from average
 */
export class MeanReversionStrategy extends TradingStrategy {
  constructor(portfolioId: number) {
    super('MEAN_REVERSION', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    const markets = await marketDataService.getHighLiquidityMarkets(5000, 50);

    for (const market of markets) {
      const analysis = await marketDataService.getMarketAnalysis([market.marketId]);
      const marketAnalysis = analysis[market.marketId];

      if (!marketAnalysis || !marketAnalysis.volatility) continue;

      // If volatility is high (price deviation), buy the underpriced outcome
      if (marketAnalysis.volatility > 5) {
        const side = marketAnalysis.prices.yes > 0.6 ? 'BUY' : 'SELL';

        return {
          strategyType: 'MEAN_REVERSION',
          marketId: market.marketId,
          marketName: market.marketName,
          side,
          confidence: Math.min(95, marketAnalysis.volatility * 5),
          reason: `High volatility (${marketAnalysis.volatility.toFixed(1)}%) - reverting to mean`,
          suggestedSize: this.maxPositionSize * 0.8,
          timestamp: new Date(),
        };
      }
    }

    return null;
  }
}

/**
 * Strategy 4: Liquidity Farming - Trade in high-liquidity pairs
 */
export class LiquidityFarmingStrategy extends TradingStrategy {
  constructor(portfolioId: number) {
    super('LIQUIDITY_FARMING', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    const markets = await marketDataService.getHighLiquidityMarkets(50000, 10);

    if (markets.length === 0) return null;

    // Pick highest liquidity market
    const best = markets[0];

    // Simple: buy underpriced outcome
    const side = Math.abs(best.priceYes - 0.5) > Math.abs(best.priceNo - 0.5) ? 'SELL' : 'BUY';

    return {
      strategyType: 'LIQUIDITY_FARMING',
      marketId: best.marketId,
      marketName: best.marketName,
      side,
      confidence: 65,
      reason: `High liquidity (${best.liquidity.toFixed(0)} USD) - ${side}`,
      suggestedSize: this.maxPositionSize,
      timestamp: new Date(),
    };
  }
}

/**
 * Strategy 5: Event Trading - Trade around upcoming events
 */
export class EventTradingStrategy extends TradingStrategy {
  constructor(portfolioId: number) {
    super('EVENT_TRADING', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    // Get markets expiring in next 7 days (likely to have events)
    const markets = await marketDataService.getMarketsExpiringSoon(7);

    if (markets.length === 0) return null;

    // Sort by volume (more trades = more event-driven)
    const eventMarkets = markets.sort((a, b) => b.volume24h - a.volume24h).slice(0, 5);

    for (const market of eventMarkets) {
      const analysis = await marketDataService.getMarketAnalysis([market.marketId]);
      const marketAnalysis = analysis[market.marketId];

      if (!marketAnalysis) continue;

      // High volume + trending = likely event-driven
      if (marketAnalysis.volume24h > 10000 && (marketAnalysis.trend === 'up' || marketAnalysis.trend === 'down')) {
        const side = marketAnalysis.trend === 'up' ? 'BUY' : 'SELL';

        return {
          strategyType: 'EVENT_TRADING',
          marketId: market.marketId,
          marketName: market.marketName,
          side,
          confidence: 75,
          reason: `Event-driven: high volume (${marketAnalysis.volume24h}) + ${marketAnalysis.trend} trend`,
          suggestedSize: this.maxPositionSize * 1.5,
          timestamp: new Date(),
        };
      }
    }

    return null;
  }
}

/**
 * Strategy 6: Volume Breakout - Buy when volume spikes
 */
export class VolumeBreakoutStrategy extends TradingStrategy {
  constructor(portfolioId: number) {
    super('VOLUME_BREAKOUT', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    const markets = await marketDataService.getHighLiquidityMarkets(1000, 100);

    // Sort by 24h volume (high volume = breakout potential)
    const volumeMarkets = markets.sort((a, b) => b.volume24h - a.volume24h).slice(0, 20);

    for (const market of volumeMarkets) {
      // If volume > 50k, it's a breakout
      if (market.volume24h > 50000) {
        const side = market.priceYes > market.priceNo ? 'BUY' : 'SELL';

        return {
          strategyType: 'VOLUME_BREAKOUT',
          marketId: market.marketId,
          marketName: market.marketName,
          side,
          confidence: 80,
          reason: `Volume breakout: ${market.volume24h.toFixed(0)} USD in 24h`,
          suggestedSize: this.maxPositionSize * 1.2,
          timestamp: new Date(),
        };
      }
    }

    return null;
  }
}

/**
 * Strategy 7: Pairs Trading - Trade correlated outcomes
 */
export class PairsTradingStrategy extends TradingStrategy {
  constructor(portfolioId: number) {
    super('PAIRS_TRADING', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    const markets = await marketDataService.getHighLiquidityMarkets(5000, 50);

    if (markets.length < 2) return null;

    // Pick two most imbalanced markets
    const top2 = markets
      .sort((a, b) => Math.abs(b.spread - 0.5) - Math.abs(a.spread - 0.5))
      .slice(0, 2);

    // Buy the underpriced in both
    return {
      strategyType: 'PAIRS_TRADING',
      marketId: top2[0].marketId,
      marketName: top2[0].marketName,
      side: top2[0].priceYes < top2[0].priceNo ? 'BUY' : 'SELL',
      confidence: 72,
      reason: 'Pairs trading strategy - correlated trades',
      suggestedSize: this.maxPositionSize * 0.7,
      timestamp: new Date(),
    };
  }
}

/**
 * Strategy 8: Sentiment Analysis - Trade based on market sentiment
 */
export class SentimentStrategy extends TradingStrategy {
  constructor(portfolioId: number) {
    super('SENTIMENT', portfolioId);
  }

  async generateSignal(): Promise<TradeSignal | null> {
    const markets = await marketDataService.getHighLiquidityMarkets(10000, 50);

    // Simple sentiment: if most markets lean YES, sentiment is bullish
    const yesCount = markets.filter(m => m.priceYes > 0.55).length;
    const noCount = markets.filter(m => m.priceNo > 0.55).length;

    const sentiment = yesCount > noCount ? 'BULLISH' : noCount > yesCount ? 'BEARISH' : 'NEUTRAL';

    if (sentiment === 'NEUTRAL') return null;

    // Find most extreme market in sentiment direction
    const extremeMarkets = sentiment === 'BULLISH'
      ? markets.filter(m => m.priceNo > 0.6)
      : markets.filter(m => m.priceYes > 0.6);

    if (extremeMarkets.length === 0) return null;

    const best = extremeMarkets.sort((a, b) => b.liquidity - a.liquidity)[0];

    return {
      strategyType: 'SENTIMENT',
      marketId: best.marketId,
      marketName: best.marketName,
      side: sentiment === 'BULLISH' ? 'BUY' : 'SELL',
      confidence: 68,
      reason: `${sentiment} market sentiment - ${sentiment === 'BULLISH' ? 'buying NO' : 'buying YES'}`,
      suggestedSize: this.maxPositionSize,
      timestamp: new Date(),
    };
  }
}

/**
 * Strategy Factory - create all strategies
 */
export function createAllStrategies(portfolioId: number): TradingStrategy[] {
  return [
    new ArbitrageStrategy(portfolioId),
    new MomentumStrategy(portfolioId),
    new MeanReversionStrategy(portfolioId),
    new LiquidityFarmingStrategy(portfolioId),
    new EventTradingStrategy(portfolioId),
    new VolumeBreakoutStrategy(portfolioId),
    new PairsTradingStrategy(portfolioId),
    new SentimentStrategy(portfolioId),
  ];
}
