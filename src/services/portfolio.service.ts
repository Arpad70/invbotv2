// Portfolio Service - Portfolio management
import { db } from '../config/database';
import { Portfolio, CreatePortfolioRequest } from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('PortfolioService');

export class PortfolioService {
  async getPortfolioById(portfolioId: number): Promise<Portfolio | null> {
    const sql = 'SELECT * FROM portfolios WHERE portfolio_id = ?';
    return await db.queryOne<Portfolio>(sql, [portfolioId]);
  }

  async getPortfoliosByUserId(userId: number): Promise<Portfolio[]> {
    const sql = 'SELECT * FROM portfolios WHERE user_id = ? AND is_active = true ORDER BY created_at DESC';
    return await db.query<Portfolio>(sql, [userId]);
  }

  async createPortfolio(userId: number, req: CreatePortfolioRequest): Promise<Portfolio> {
    const sql = `
      INSERT INTO portfolios (user_id, name, description, initial_capital, current_balance)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await db.execute(sql, [
      userId,
      req.name,
      req.description || null,
      req.initial_capital,
      req.initial_capital, // current_balance = initial_capital on creation
    ]);

    const portfolio = await this.getPortfolioById(result.insertId);
    if (!portfolio) throw new Error('Failed to create portfolio');

    logger.info(`Portfolio created: ${req.name} (ID: ${result.insertId})`);
    return portfolio;
  }

  async updatePortfolioPnL(portfolioId: number): Promise<void> {
    const sql = 'CALL update_portfolio_pnl(?)';
    await db.execute(sql, [portfolioId]);
  }

  async getPortfolioStats(portfolioId: number): Promise<any> {
    const portfolio = await this.getPortfolioById(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    return {
      capital: {
        initial: portfolio.initial_capital,
        current: portfolio.current_balance,
        locked: portfolio.locked_capital,
        available: portfolio.available_capital,
      },
      performance: {
        realizedPnL: portfolio.realized_pnl,
        unrealizedPnL: portfolio.unrealized_pnl,
        totalPnL: portfolio.total_pnl,
        roiPercent: portfolio.roi_percent,
      },
      trades: {
        total: portfolio.total_trades,
        winning: portfolio.winning_trades,
        losing: portfolio.losing_trades,
        winRate: portfolio.win_rate,
      },
      other: {
        avgWin: 0,
        avgLoss: 0,
        maxDrawdown: 0,
      },
    };
  }

  async deletePortfolio(portfolioId: number): Promise<void> {
    const sql = 'UPDATE portfolios SET is_active = false, updated_at = NOW() WHERE portfolio_id = ?';
    await db.execute(sql, [portfolioId]);
    logger.info(`Portfolio deleted: ${portfolioId}`);
  }
}

export const portfolioService = new PortfolioService();
