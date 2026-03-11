import express from 'express';
import { userService } from '../services/user.service';
import { authMiddleware } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { db } from '../config/database';

const router = express.Router();
const logger = new Logger('UserRoutes');

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        timezone: user.timezone,
        initialCapital: user.initial_capital,
        firstName: user.first_name,
        lastName: user.last_name,
        dateOfBirth: user.date_of_birth,
        address: user.address,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error('Get user profile error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/v1/users/me
 * Update current user profile
 */
router.put('/me', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { timezone, initialCapital, firstName, lastName, dateOfBirth, address } = req.body;

    const sql = `
      UPDATE users 
      SET timezone = ?, initial_capital = ?, first_name = ?, last_name = ?, date_of_birth = ?, address = ?, updated_at = NOW()
      WHERE user_id = ?
    `;

    await db.execute(sql, [
      timezone || 'UTC',
      initialCapital !== undefined ? initialCapital : undefined,
      firstName || null,
      lastName || null,
      dateOfBirth || null,
      address || null,
      req.user.userId,
    ]);

    const user = await userService.getUserById(req.user.userId);

    logger.info(`User profile updated: ${req.user.userId}`);

    res.json({
      success: true,
      user: {
        userId: user!.user_id,
        username: user!.username,
        email: user!.email,
        timezone: user!.timezone,
        initialCapital: user!.initial_capital,
        firstName: user!.first_name,
        lastName: user!.last_name,
        dateOfBirth: user!.date_of_birth,
        address: user!.address,
      },
    });
  } catch (error) {
    logger.error('Update user profile error', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

/**
 * POST /api/v1/users/me/change-password
 * Change user password
 */
router.post('/me/change-password', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current and new password are required',
      });
      return;
    }

    // Verify current password
    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const authenticated = await userService.authenticateUser(user.username, currentPassword);
    if (!authenticated) {
      res.status(401).json({ success: false, error: 'Current password is incorrect' });
      return;
    }

    // Update password
    const crypto = require('crypto');
    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    const sql = 'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?';
    await db.execute(sql, [newPasswordHash, req.user.userId]);

    logger.info(`Password changed for user: ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

/**
 * POST /api/v1/users/me/api-keys
 * Add new API key for external platform
 */
router.post('/me/api-keys', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { platform, apiKey } = req.body;

    if (!platform || !apiKey) {
      res.status(400).json({
        success: false,
        error: 'Platform and apiKey are required',
      });
      return;
    }

    const allowedPlatforms = ['polymarket', 'kalshi', 'opinion'];
    if (!allowedPlatforms.includes(platform.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: `Platform must be one of: ${allowedPlatforms.join(', ')}`,
      });
      return;
    }

    await userService.updateUserApiKey(req.user.userId, platform, apiKey);

    logger.info(`API key added for user ${req.user.userId} on ${platform}`);

    res.json({
      success: true,
      message: `API key for ${platform} updated successfully`,
    });
  } catch (error) {
    logger.error('Add API key error', error);
    res.status(500).json({ success: false, error: 'Failed to add API key' });
  }
});

/**
 * GET /api/v1/users/me/api-keys
 * Get list of configured API key platforms
 */
router.get('/me/api-keys', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const configuredKeys: string[] = [];
    if (user.polymarket_api_key) configuredKeys.push('polymarket');
    if (user.kalshi_api_key) configuredKeys.push('kalshi');
    if (user.opinion_api_key) configuredKeys.push('opinion');

    res.json({
      success: true,
      configuredPlatforms: configuredKeys,
    });
  } catch (error) {
    logger.error('Get API keys error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API keys' });
  }
});

/**
 * DELETE /api/v1/users/me/api-keys/:platform
 * Remove API key for a platform
 */
router.delete('/me/api-keys/:platform', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { platform } = req.params;

    const allowedPlatforms = ['polymarket', 'kalshi', 'opinion'];
    if (!allowedPlatforms.includes(platform.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: `Platform must be one of: ${allowedPlatforms.join(', ')}`,
      });
      return;
    }

    const keyMap: Record<string, string> = {
      polymarket: 'polymarket_api_key',
      kalshi: 'kalshi_api_key',
      opinion: 'opinion_api_key',
    };

    const column = keyMap[platform.toLowerCase()];
    const sql = `UPDATE users SET ${column} = NULL WHERE user_id = ?`;
    await db.execute(sql, [req.user.userId]);

    logger.info(`API key removed for user ${req.user.userId} on ${platform}`);

    res.json({
      success: true,
      message: `API key for ${platform} removed successfully`,
    });
  } catch (error) {
    logger.error('Delete API key error', error);
    res.status(500).json({ success: false, error: 'Failed to remove API key' });
  }
});

export const userRoutes = router;
export default userRoutes;
