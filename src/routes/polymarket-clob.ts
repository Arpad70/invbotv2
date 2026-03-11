import express from 'express';
import { polymarketClobService, TradeSide } from '../services/polymarket-clob.service';
import { authMiddleware } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger('PolymarketClobRoutes');

/**
 * POST /polymarket/clob/init
 * Initialize CLOB client for authenticated user
 */
router.post('/init', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { privateKey, funderAddress } = req.body;

    if (!privateKey) {
      res.status(400).json({
        success: false,
        error: 'privateKey is required',
      });
      return;
    }

    // Initialize CLOB client
    const initialized = await polymarketClobService.initialize(privateKey, funderAddress);

    if (!initialized) {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize CLOB client',
      });
      return;
    }

    // Derive API keys
    const apiKeyCreds = await polymarketClobService.deriveOrCreateApiKey();

    res.json({
      success: true,
      message: 'CLOB client initialized',
      walletAddress: polymarketClobService.getWalletAddress(),
      hasApiKeys: !!apiKeyCreds,
    });
  } catch (error) {
    logger.error('CLOB init error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize CLOB client',
    });
  }
});

/**
 * POST /polymarket/clob/orders
 * Create and post an order
 */
router.post('/orders', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized. Call /polymarket/clob/init first',
      });
      return;
    }

    const { tokenID, price, side, size, tickSize, negRisk } = req.body;

    // Validate required fields
    if (!tokenID || price === undefined || !side || !size || !tickSize !== undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenID, price, side, size, tickSize',
      });
      return;
    }

    // Validate side
    if (!Object.values(TradeSide).includes(side)) {
      res.status(400).json({
        success: false,
        error: `Invalid side. Must be ${Object.values(TradeSide).join(' or ')}`,
      });
      return;
    }

    // Create order
    const orderResponse = await polymarketClobService.createAndPostOrder(
      {
        tokenID,
        price: parseFloat(price),
        side: side as TradeSide,
        size: parseFloat(size),
      },
      {
        tickSize: tickSize.toString(),
        negRisk: negRisk === true,
      }
    );

    if (orderResponse.success) {
      logger.info(
        `Order created: ${orderResponse.orderID}`,
        { tokenID, side, price, size }
      );

      res.status(201).json({
        success: true,
        order: orderResponse,
      });
    } else {
      res.status(400).json({
        success: false,
        error: orderResponse.error || 'Failed to create order',
        order: orderResponse,
      });
    }
  } catch (error) {
    logger.error('Create order error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
    });
  }
});

/**
 * GET /polymarket/clob/orders
 * Get all open orders
 */
router.get('/orders', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized',
      });
      return;
    }

    const orders = await polymarketClobService.getOpenOrders();

    res.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    logger.error('Get orders error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
    });
  }
});

/**
 * GET /polymarket/clob/orders/:orderId
 * Get order details
 */
router.get('/orders/:orderId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized',
      });
      return;
    }

    const { orderId } = req.params;
    const order = await polymarketClobService.getOrder(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    logger.error('Get order error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
    });
  }
});

/**
 * DELETE /polymarket/clob/orders/:orderId
 * Cancel an order
 */
router.delete('/orders/:orderId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized',
      });
      return;
    }

    const { orderId } = req.params;
    const success = await polymarketClobService.cancelOrder(orderId);

    if (success) {
      res.json({
        success: true,
        message: `Order ${orderId} cancelled`,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to cancel order',
      });
    }
  } catch (error) {
    logger.error('Cancel order error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
    });
  }
});

/**
 * GET /polymarket/clob/orderbook/:tokenId
 * Get order book for a market
 */
router.get('/orderbook/:tokenId', async (req: express.Request, res: express.Response) => {
  try {
    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized',
      });
      return;
    }

    const { tokenId } = req.params;
    const orderBook = await polymarketClobService.getOrderBook(tokenId);

    if (!orderBook) {
      res.status(404).json({
        success: false,
        error: 'Order book not found',
      });
      return;
    }

    res.json({
      success: true,
      orderBook,
    });
  } catch (error) {
    logger.error('Get orderbook error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order book',
    });
  }
});

/**
 * GET /polymarket/clob/midpoint/:tokenId
 * Get midpoint price for a market
 */
router.get('/midpoint/:tokenId', async (req: express.Request, res: express.Response) => {
  try {
    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized',
      });
      return;
    }

    const { tokenId } = req.params;
    const midpoint = await polymarketClobService.getMidpoint(tokenId);

    if (!midpoint) {
      res.status(404).json({
        success: false,
        error: 'Midpoint not found',
      });
      return;
    }

    res.json({
      success: true,
      midpoint,
    });
  } catch (error) {
    logger.error('Get midpoint error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch midpoint',
    });
  }
});

/**
 * GET /polymarket/clob/balance-allowance
 * Get user's balance allowance
 */
router.get('/balance-allowance', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized',
      });
      return;
    }

    const balance = await polymarketClobService.getBalanceAllowance();

    res.json({
      success: true,
      balance: balance || { balance: '0', allowance: '0' },
    });
  } catch (error) {
    logger.error('Get balance error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    });
  }
});

/**
 * GET /polymarket/clob/trades
 * Get user's trading history
 */
router.get('/trades', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!polymarketClobService.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'CLOB client not initialized',
      });
      return;
    }

    const trades = await polymarketClobService.getTrades();

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
 * POST /polymarket/clob/reset
 * Reset CLOB client (clear credentials)
 */
router.post('/reset', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    polymarketClobService.reset();

    res.json({
      success: true,
      message: 'CLOB client reset',
    });
  } catch (error) {
    logger.error('Reset error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset CLOB client',
    });
  }
});

export default router;
