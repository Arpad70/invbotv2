import express from 'express';
import { JWTUtil, JWTPayload } from '../utils/jwt';
import { Logger } from '../utils/logger';

const logger = new Logger('AuthMiddleware');

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Verify JWT token from Authorization header
 */
export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Missing authorization header',
      });
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization scheme',
      });
      return;
    }

    const decoded = JWTUtil.verifyToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if token is missing
 */
export function optionalAuthMiddleware(req: express.Request, _res: express.Response, next: express.NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer') {
      next();
      return;
    }

    const decoded = JWTUtil.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', error);
    next();
  }
}

/**
 * Require specific role/permission
 */
export function requireRole(_role: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // TODO: Expand this to check actual user roles from database
    // For now, just ensure user is authenticated
    next();
  };
}

export default authMiddleware;
