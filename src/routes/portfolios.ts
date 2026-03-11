import express from 'express';
import { portfolioService } from '../services/portfolio.service';
import { tradeService } from '../services/trade.service';
import { authMiddleware } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { db } from '../config/database';

const router = express.Router();
const logger = new Logger('PortfolioRoutes');

interface CreatePortfolioRequest {
  name: string;
  description?: string;
  initial_capital: number;
}

/**
 * GET /portfolios
 * Get all portfolios for current user
 */
router.get('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const portfolios = await portfolioService.getPortfoliosByUserId(req.user.userId);

    res.json({
      success: true,
      portfolios,
      count: portfolios.length,
    });
  } catch (error) {
    logger.error('Get portfolios error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolios',
    });
  }
});

/**
 * GET /portfolios/:portfolioId
 * Get portfolio details
 */
router.get('/:portfolioId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const portfolioId = parseInt(req.params.portfolioId);
    const portfolio = await portfolioService.getPortfolioById(portfolioId);

    if (!portfolio) {
      res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
      return;
    }

    // Check ownership
    if (portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const stats = await portfolioService.getPortfolioStats(portfolioId);

    res.json({
      success: true,
      portfolio: {
        ...portfolio,
        stats,
      },
    });
  } catch (error) {
    logger.error('Get portfolio error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio',
    });
  }
});

/**
 * POST /portfolios
 * Create new portfolio
 */
router.post('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { name, description, initial_capital } = req.body as CreatePortfolioRequest;

    if (!name || !initial_capital) {
      res.status(400).json({
        success: false,
        error: 'Portfolio name and initial capital are required',
      });
      return;
    }

    const portfolio = await portfolioService.createPortfolio(req.user.userId, {
      name,
      description,
      initial_capital,
    });

    logger.info(`Portfolio created: ${portfolio.name} for user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      portfolio,
    });
  } catch (error) {
    logger.error('Create portfolio error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portfolio',
    });
  }
});

/**
 * PUT /portfolios/:portfolioId
 * Update portfolio
 */
router.put('/:portfolioId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const portfolioId = parseInt(req.params.portfolioId);
    const portfolio = await portfolioService.getPortfolioById(portfolioId);

    if (!portfolio) {
      res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
      return;
    }

    // Check ownership
    if (portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const { name, description } = req.body;

    const sql = `
      UPDATE portfolios 
      SET name = ?, description = ?
      WHERE portfolio_id = ?
    `;
    await db.execute(sql, [
      name || portfolio.name,
      description !== undefined ? description : portfolio.description,
      portfolioId,
    ]);

    const updatedPortfolio = await portfolioService.getPortfolioById(portfolioId);

    res.json({
      success: true,
      portfolio: updatedPortfolio,
    });
  } catch (error) {
    logger.error('Update portfolio error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update portfolio',
    });
  }
});

/**
 * GET /portfolios/:portfolioId/trades
 * Get trades for a specific portfolio with pagination
 */
router.get('/:portfolioId/trades', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const portfolioId = parseInt(req.params.portfolioId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

    if (isNaN(portfolioId) || portfolioId <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid portfolio ID',
      });
      return;
    }

    const portfolio = await portfolioService.getPortfolioById(portfolioId);
    if (!portfolio) {
      res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
      return;
    }

    // Check ownership
    if (portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    // Get trades
    const trades = await tradeService.getTradesByPortfolio(portfolioId, limit * page);
    const total = trades.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedTrades = trades.slice(offset, offset + limit);

    res.json({
      success: true,
      trades: paginatedTrades,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        offset,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    logger.error('Get portfolio trades error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio trades',
    });
  }
});

/**
 * DELETE /portfolios/:portfolioId
 * Delete portfolio
 */
router.delete('/:portfolioId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const portfolioId = parseInt(req.params.portfolioId);
    const portfolio = await portfolioService.getPortfolioById(portfolioId);

    if (!portfolio) {
      res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
      return;
    }

    // Check ownership
    if (portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    await db.execute('DELETE FROM portfolios WHERE portfolio_id = ?', [portfolioId]);

    logger.info(`Portfolio deleted: ${portfolioId}`);

    res.json({
      success: true,
      message: 'Portfolio deleted successfully',
    });
  } catch (error) {
    logger.error('Delete portfolio error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete portfolio',
    });
  }
});

export const portfolioRoutes = router;
export default portfolioRoutes;
