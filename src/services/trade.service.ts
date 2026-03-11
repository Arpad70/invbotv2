// Trade Service - Trade management
import { db } from '../config/database';
import { Trade, CreateTradeRequest } from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('TradeService');

export class TradeService {
  async getTradeById(tradeId: number): Promise<Trade | null> {
    const sql = 'SELECT * FROM trades WHERE trade_id = ?';
    return await db.queryOne<Trade>(sql, [tradeId]);
  }

  async getActiveTradesByPortfolio(portfolioId: number): Promise<Trade[]> {
    const sql = `
      SELECT * FROM trades 
      WHERE portfolio_id = ? AND status IN ('PENDING', 'OPEN')
      ORDER BY created_at DESC
    `;
    return await db.query<Trade>(sql, [portfolioId]);
  }

  async getTradesByPortfolio(portfolioId: number, limit: number = 50): Promise<Trade[]> {
    const sql = `
      SELECT * FROM trades 
      WHERE portfolio_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    return await db.query<Trade>(sql, [portfolioId, limit]);
  }

  async getTradesByStrategy(strategyId: number): Promise<Trade[]> {
    const sql = `
      SELECT * FROM trades 
      WHERE strategy_id = ?
      ORDER BY created_at DESC
    `;
    return await db.query<Trade>(sql, [strategyId]);
  }

  async createTrade(portfolioId: number, req: CreateTradeRequest): Promise<Trade> {
    const sql = `
      INSERT INTO trades (
        portfolio_id, strategy_id, market_id, market_name, market_platform,
        order_type, initial_size_usd, current_size_usd, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `;

    const result = await db.execute(sql, [
      portfolioId,
      req.strategy_id,
      req.market_id,
      req.market_name,
      req.market_platform,
      req.order_type,
      req.initial_size_usd,
      req.initial_size_usd,
    ]);

    const trade = await this.getTradeById(result.insertId);
    if (!trade) throw new Error('Failed to create trade');

    logger.info(`Trade created: ${req.market_name} (ID: ${result.insertId})`);
    return trade;
  }

  async approveTrade(tradeId: number, approved: boolean, notes?: string): Promise<void> {
    const approvalStatus = approved ? 'APPROVED' : 'REJECTED';
    const newStatus = approved ? 'OPEN' : 'REJECTED';

    const sql = `
      UPDATE trades 
      SET user_approval = ?, status = ?, user_approval_time = NOW(), user_approval_notes = ?
      WHERE trade_id = ?
    `;

    await db.execute(sql, [approvalStatus, newStatus, notes || null, tradeId]);
    logger.info(`Trade ${approvalStatus}: ${tradeId}`);
  }

  async updateTradePrice(
    tradeId: number,
    priceYes: number,
    priceNo: number,
    unrealizedPnL: number
  ): Promise<void> {
    const sql = `
      UPDATE trades 
      SET current_price_yes = ?, current_price_no = ?, unrealized_pnl = ?, last_price_update = NOW()
      WHERE trade_id = ?
    `;

    await db.execute(sql, [priceYes, priceNo, unrealizedPnL, tradeId]);
  }

  async closeTrade(
    tradeId: number,
    exitPriceYes: number | null,
    exitPriceNo: number | null,
    realizedPnL: number,
    exitReason: string = 'MANUAL'
  ): Promise<void> {
    const sql = `
      CALL close_trade(?, ?, ?, ?)
    `;

    await db.execute(sql, [tradeId, exitPriceYes, exitPriceNo, exitReason]);
    logger.info(`Trade closed: ${tradeId} (PnL: ${realizedPnL})`);
  }

  async getPendingApprovals(portfolioId: number): Promise<Trade[]> {
    const sql = `
      SELECT * FROM trades 
      WHERE portfolio_id = ? AND user_approval = 'PENDING'
      ORDER BY created_at DESC
    `;
    return await db.query<Trade>(sql, [portfolioId]);
  }

  async getTradeMetrics(portfolioId: number, timeframe: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    let dateFilter = 'DATE(created_at) = CURDATE()';
    if (timeframe === 'week') {
      dateFilter = 'YEARWEEK(created_at) = YEARWEEK(NOW())';
    } else if (timeframe === 'month') {
      dateFilter = 'YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())';
    }

    const sql = `
      SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(realized_pnl) as total_pnl,
        AVG(CASE WHEN realized_pnl > 0 THEN realized_pnl END) as avg_win,
        AVG(CASE WHEN realized_pnl < 0 THEN ABS(realized_pnl) END) as avg_loss
      FROM trades
      WHERE portfolio_id = ? AND status = 'CLOSED' AND ${dateFilter}
    `;

    const metrics = await db.queryOne<any>(sql, [portfolioId]);
    return metrics || {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl: 0,
      avg_win: 0,
      avg_loss: 0,
    };
  }
}

export const tradeService = new TradeService();
