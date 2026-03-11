import express from 'express';
import { strategyService } from '../services/strategy.service';
import { portfolioService } from '../services/portfolio.service';
import { authMiddleware } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { db } from '../config/database';

const router = express.Router();
const logger = new Logger('StrategyRoutes');

/**
 * GET /api/v1/strategies
 * Get all strategies for user's portfolios
 */
router.get('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Get all strategies for user's portfolios
    const portfolios = await portfolioService.getPortfoliosByUserId(req.user.userId);
    const portfolioIds = portfolios.map(p => p.portfolio_id);

    let strategies: any[] = [];
    for (const portfolioId of portfolioIds) {
      const strats = await strategyService.getStrategiesByPortfolio(portfolioId);
      strategies = [...strategies, ...strats];
    }

    res.json({
      success: true,
      strategies,
      count: strategies.length,
    });
  } catch (error) {
    logger.error('Get strategies error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch strategies',
    });
  }
});

/**
 * GET /strategies/:strategyId
 * Get strategy details
 */
router.get('/:strategyId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const strategyId = parseInt(req.params.strategyId);
    const strategy = await strategyService.getStrategyById(strategyId);

    if (!strategy) {
      res.status(404).json({
        success: false,
        error: 'Strategy not found',
      });
      return;
    }

    // Verify ownership
    const portfolio = await portfolioService.getPortfolioById(strategy.portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const performance = await strategyService.getStrategyPerformance(strategyId);

    res.json({
      success: true,
      strategy: {
        ...strategy,
        performance,
      },
    });
  } catch (error) {
    logger.error('Get strategy error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch strategy',
    });
  }
});

/**
 * POST /strategies
 * Create new strategy
 */
router.post('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { portfolioId, name, strategy_type, description, allocated_capital } = req.body;

    if (!portfolioId || !name || !strategy_type || !allocated_capital) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: portfolioId, name, strategy_type, allocated_capital',
      });
      return;
    }

    // Verify portfolio ownership
    const portfolio = await portfolioService.getPortfolioById(portfolioId);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const strategy = await strategyService.createStrategy(portfolioId, {
      name,
      strategy_type,
      description,
      allocated_capital,
    });

    logger.info(`Strategy created: ${name} in portfolio ${portfolioId}`);

    res.status(201).json({
      success: true,
      strategy,
    });
  } catch (error) {
    logger.error('Create strategy error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create strategy',
    });
  }
});

/**
 * PUT /strategies/:strategyId
 * Update strategy
 */
router.put('/:strategyId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const strategyId = parseInt(req.params.strategyId);
    const strategy = await strategyService.getStrategyById(strategyId);

    if (!strategy) {
      res.status(404).json({
        success: false,
        error: 'Strategy not found',
      });
      return;
    }

    // Verify ownership
    const portfolio = await portfolioService.getPortfolioById(strategy.portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const { name, strategy_type, description, is_enabled } = req.body;

    const sql = `
      UPDATE strategies 
      SET name = ?, strategy_type = ?, description = ?, is_enabled = ?
      WHERE strategy_id = ?
    `;

    await db.execute(sql, [
      name || strategy.name,
      strategy_type || strategy.strategy_type,
      description !== undefined ? description : strategy.description,
      is_enabled !== undefined ? is_enabled : strategy.is_enabled,
      strategyId,
    ]);

    const updatedStrategy = await strategyService.getStrategyById(strategyId);

    res.json({
      success: true,
      strategy: updatedStrategy,
    });
  } catch (error) {
    logger.error('Update strategy error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update strategy',
    });
  }
});

/**
 * DELETE /strategies/:strategyId
 * Delete strategy
 */
router.delete('/:strategyId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const strategyId = parseInt(req.params.strategyId);
    const strategy = await strategyService.getStrategyById(strategyId);

    if (!strategy) {
      res.status(404).json({
        success: false,
        error: 'Strategy not found',
      });
      return;
    }

    // Verify ownership
    const portfolio = await portfolioService.getPortfolioById(strategy.portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    await db.execute('DELETE FROM strategies WHERE strategy_id = ?', [strategyId]);

    logger.info(`Strategy deleted: ${strategyId}`);

    res.json({
      success: true,
      message: 'Strategy deleted successfully',
    });
  } catch (error) {
    logger.error('Delete strategy error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete strategy',
    });
  }
});

export const strategyRoutes = router;
export default strategyRoutes;
