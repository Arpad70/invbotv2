import express from 'express';
import { userService } from '../services/user.service';
import { JWTUtil } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger('AuthRoutes');

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  initialCapital?: number;
}

interface RefreshRequest {
  refreshToken: string;
}

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const { username, email, password, initialCapital } = req.body as RegisterRequest;

    // Validation
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: username, email, password',
      });
      return;
    }

    // Check if user exists
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Username already exists',
      });
      return;
    }

    const existingEmail = await userService.getUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
      return;
    }

    // Create user
    const user = await userService.createUser(
      username,
      email,
      password,
      initialCapital || 10000
    );

    // Generate tokens
    const accessToken = JWTUtil.generateAccessToken({
      userId: user.user_id,
      username: user.username,
      email: user.email,
    });

    const refreshToken = JWTUtil.generateRefreshToken({
      userId: user.user_id,
      username: user.username,
      email: user.email,
    });

    logger.info(`User registered: ${username}`);

    res.status(201).json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        initialCapital: user.initial_capital,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Registration error', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /auth/login
 * Login user and return JWT tokens
 */
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body as LoginRequest;

    // Validation
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: username, password',
      });
      return;
    }

    // Authenticate user
    const user = await userService.authenticateUser(username, password);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    // Generate tokens
    const accessToken = JWTUtil.generateAccessToken({
      userId: user.user_id,
      username: user.username,
      email: user.email,
    });

    const refreshToken = JWTUtil.generateRefreshToken({
      userId: user.user_id,
      username: user.username,
      email: user.email,
    });

    logger.info(`User logged in: ${username}`);

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  try {
    const { refreshToken } = req.body as RefreshRequest;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Missing refresh token',
      });
      return;
    }

    const decoded = JWTUtil.verifyToken(refreshToken);
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
      return;
    }

    // Generate new access token
    const accessToken = JWTUtil.generateAccessToken({
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
    });

    res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    logger.error('Refresh token error', error);
    res.status(500).json({
      success: false,
      error: 'Refresh failed',
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        initialCapital: user.initial_capital,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    logger.error('Get current user error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

export const authRoutes = router;
export default authRoutes;
