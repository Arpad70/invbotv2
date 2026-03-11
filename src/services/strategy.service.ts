// Strategy Service - Trading strategy management
import { db } from '../config/database';
import { Strategy, CreateStrategyRequest } from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('StrategyService');

export class StrategyService {
  async getStrategyById(strategyId: number): Promise<Strategy | null> {
    const sql = 'SELECT * FROM strategies WHERE strategy_id = ?';
    const result = await db.queryOne<any>(sql, [strategyId]);
    if (result) {
      result.parameters = JSON.parse(result.parameters || '{}');
    }
    return result;
  }

  async getStrategiesByPortfolio(portfolioId: number): Promise<Strategy[]> {
    const sql = 'SELECT * FROM strategies WHERE portfolio_id = ? ORDER BY created_at DESC';
    const results = await db.query<any>(sql, [portfolioId]);
    return results.map(s => ({
      ...s,
      parameters: JSON.parse(s.parameters || '{}'),
    }));
  }

  async createStrategy(portfolioId: number, req: CreateStrategyRequest): Promise<Strategy> {
    const sql = `
      INSERT INTO strategies (
        portfolio_id, name, strategy_type, description, 
        allocated_capital, current_capital, parameters
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.execute(sql, [
      portfolioId,
      req.name,
      req.strategy_type,
      req.description || null,
      req.allocated_capital,
      req.allocated_capital,
      JSON.stringify(req.parameters || {}),
    ]);

    const strategy = await this.getStrategyById(result.insertId);
    if (!strategy) throw new Error('Failed to create strategy');

    logger.info(`Strategy created: ${req.name} (Type: ${req.strategy_type})`);
    return strategy;
  }

  async getEnabledStrategies(): Promise<Strategy[]> {
    const sql = 'SELECT * FROM strategies WHERE is_enabled = true AND is_test_mode = false';
    const results = await db.query<any>(sql);
    return results.map(s => ({
      ...s,
      parameters: JSON.parse(s.parameters || '{}'),
    }));
  }

  async updateStrategyPerformance(strategyId: number): Promise<void> {
    const sql = `
      UPDATE strategies s
      SET 
        realized_pnl = (SELECT COALESCE(SUM(realized_pnl), 0) FROM trades WHERE strategy_id = s.strategy_id AND status = 'CLOSED'),
        unrealized_pnl = (SELECT COALESCE(SUM(unrealized_pnl), 0) FROM trades WHERE strategy_id = s.strategy_id AND status = 'OPEN'),
        trade_count = (SELECT COUNT(*) FROM trades WHERE strategy_id = s.strategy_id AND status != 'CANCELLED'),
        win_count = (SELECT COUNT(*) FROM trades WHERE strategy_id = s.strategy_id AND status = 'CLOSED' AND realized_pnl > 0),
        updated_at = NOW()
      WHERE strategy_id = ?
    `;

    await db.execute(sql, [strategyId]);
  }

  async toggleStrategy(strategyId: number, enabled: boolean): Promise<void> {
    const sql = 'UPDATE strategies SET is_enabled = ?, updated_at = NOW() WHERE strategy_id = ?';
    await db.execute(sql, [enabled, strategyId]);
    logger.info(`Strategy ${enabled ? 'enabled' : 'disabled'}: ${strategyId}`);
  }

  async toggleTestMode(strategyId: number, testMode: boolean): Promise<void> {
    const sql = 'UPDATE strategies SET is_test_mode = ?, updated_at = NOW() WHERE strategy_id = ?';
    await db.execute(sql, [testMode, strategyId]);
    logger.info(`Strategy test mode set to ${testMode}: ${strategyId}`);
  }

  async getStrategyPerformance(strategyId: number): Promise<any> {
    const strategy = await this.getStrategyById(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    // Get all trades for this strategy
    const trades = await db.query<any>(
      'SELECT * FROM trades WHERE strategy_id = ?',
      [strategyId]
    );

    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const openTrades = trades.filter(t => t.status === 'OPEN');

    return {
      basic: {
        name: strategy.name,
        type: strategy.strategy_type,
        allocatedCapital: strategy.allocated_capital,
        currentCapital: strategy.current_capital,
        isEnabled: strategy.is_enabled,
        isTestMode: strategy.is_test_mode,
      },
      performance: {
        realizedPnL: strategy.realized_pnl,
        unrealizedPnL: strategy.unrealized_pnl,
        totalPnL: strategy.realized_pnl + strategy.unrealized_pnl,
        roiPercent: (((strategy.realized_pnl + strategy.unrealized_pnl) / strategy.allocated_capital) * 100).toFixed(2),
      },
      trades: {
        total: strategy.trade_count,
        winning: strategy.win_count,
        losing: strategy.trade_count - strategy.win_count,
        winRate: ((strategy.win_count / strategy.trade_count) * 100 || 0).toFixed(2),
        avgWin: closedTrades.length > 0
          ? (closedTrades.reduce((sum, t) => sum + (t.realized_pnl > 0 ? t.realized_pnl : 0), 0) / closedTrades.filter(t => t.realized_pnl > 0).length).toFixed(2)
          : 0,
      },
      active: {
        openTrades: openTrades.length,
        openPnL: openTrades.reduce((sum, t) => sum + (t.unrealized_pnl || 0), 0).toFixed(2),
      },
    };
  }
}

export const strategyService = new StrategyService();
