import express from 'express';
import { tradeService } from '../services/trade.service';
import { portfolioService } from '../services/portfolio.service';
import { authMiddleware } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger('TradeRoutes');

/**
 * GET /trades
 * Get all trades for user's portfolios
 */
router.get('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const portfolios = await portfolioService.getPortfoliosByUserId(req.user.userId);
    const portfolioIds = portfolios.map(p => p.portfolio_id);

    let trades: any[] = [];
    for (const portfolioId of portfolioIds) {
      const portfolioTrades = await tradeService.getActiveTradesByPortfolio(portfolioId);
      trades = [...trades, ...portfolioTrades];
    }

    res.json({
      success: true,
      trades,
      count: trades.length,
    });
  } catch (error) {
    logger.error('Get trades error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
    });
  }
});

/**
 * GET /trades/:tradeId
 * Get trade details
 */
router.get('/:tradeId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const tradeId = parseInt(req.params.tradeId);
    const trade = await tradeService.getTradeById(tradeId);

    if (!trade) {
      res.status(404).json({
        success: false,
        error: 'Trade not found',
      });
      return;
    }

    // Verify ownership
    const portfolio = await portfolioService.getPortfolioById(trade.portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    res.json({
      success: true,
      trade,
    });
  } catch (error) {
    logger.error('Get trade error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trade',
    });
  }
});

/**
 * POST /trades
 * Create new trade (pending approval)
 */
router.post('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { portfolio_id, strategy_id, market_id, market_name, market_platform, order_type, initial_size_usd, stoploss_percent } = req.body;

    if (!portfolio_id || !market_id || !market_platform || !order_type || !initial_size_usd) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: portfolio_id, market_id, market_platform, order_type, initial_size_usd',
      });
      return;
    }

    // Verify portfolio ownership
    const portfolio = await portfolioService.getPortfolioById(portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const trade = await tradeService.createTrade(portfolio_id, {
      strategy_id: strategy_id || 0,
      market_id,
      market_name,
      market_platform,
      order_type,
      initial_size_usd,
      stoploss_percent,
    });

    logger.info(`Trade created: ${trade.trade_id} for portfolio ${portfolio_id}`);

    res.status(201).json({
      success: true,
      trade,
    });
  } catch (error) {
    logger.error('Create trade error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create trade',
    });
  }
});

/**
 * POST /trades/:tradeId/approve
 * Approve trade for execution
 */
router.post('/:tradeId/approve', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const tradeId = parseInt(req.params.tradeId);
    const trade = await tradeService.getTradeById(tradeId);

    if (!trade) {
      res.status(404).json({
        success: false,
        error: 'Trade not found',
      });
      return;
    }

    // Verify ownership
    const portfolio = await portfolioService.getPortfolioById(trade.portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const { approve, notes } = req.body;

    if (approve === undefined) {
      res.status(400).json({
        success: false,
        error: 'approve field is required',
      });
      return;
    }

    await tradeService.approveTrade(tradeId, approve === true, notes || '');

    logger.info(`Trade approved: ${tradeId}`);

    const updatedTrade = await tradeService.getTradeById(tradeId);

    res.json({
      success: true,
      trade: updatedTrade,
    });
  } catch (error) {
    logger.error('Approve trade error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve trade',
    });
  }
});

/**
 * POST /trades/:tradeId/close
 * Close trade
 */
router.post('/:tradeId/close', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const tradeId = parseInt(req.params.tradeId);
    const trade = await tradeService.getTradeById(tradeId);

    if (!trade) {
      res.status(404).json({
        success: false,
        error: 'Trade not found',
      });
      return;
    }

    // Verify ownership
    const portfolio = await portfolioService.getPortfolioById(trade.portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const { exitPriceYes, exitPriceNo, realizedPnL, exitReason } = req.body;

    if (exitPriceYes === undefined || exitPriceNo === undefined) {
      res.status(400).json({
        success: false,
        error: 'Exit prices (exitPriceYes, exitPriceNo) are required',
      });
      return;
    }

    await tradeService.closeTrade(
      tradeId,
      exitPriceYes,
      exitPriceNo,
      realizedPnL || 0,
      exitReason || 'MANUAL'
    );

    logger.info(`Trade closed: ${tradeId}`);

    const updatedTrade = await tradeService.getTradeById(tradeId);

    res.json({
      success: true,
      trade: updatedTrade,
    });
  } catch (error) {
    logger.error('Close trade error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close trade',
    });
  }
});

/**
 * GET /trades/:tradeId/metrics
 * Get trade metrics and performance
 */
router.get('/:tradeId/metrics', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const tradeId = parseInt(req.params.tradeId);
    const trade = await tradeService.getTradeById(tradeId);

    if (!trade) {
      res.status(404).json({
        success: false,
        error: 'Trade not found',
      });
      return;
    }

    // Verify ownership
    const portfolio = await portfolioService.getPortfolioById(trade.portfolio_id);
    if (!portfolio || portfolio.user_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const metrics = await tradeService.getTradeMetrics(tradeId);

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    logger.error('Get trade metrics error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trade metrics',
    });
  }
});

export const tradeRoutes = router;
export default tradeRoutes;
