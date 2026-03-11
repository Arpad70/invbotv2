import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',

  // Database
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '3306', 10),
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || 'password',
    NAME: process.env.DB_NAME || 'invbot_v2',
  },

  // Redis
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    PASSWORD: process.env.REDIS_PASSWORD || '',
  },

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // API Keys
  POLYMARKET_API_KEY: process.env.POLYMARKET_API_KEY || '',
  KALSHI_API_KEY: process.env.KALSHI_API_KEY || '',
  OPINION_API_KEY: process.env.OPINION_API_KEY || '',

  // Trading Settings
  INITIAL_PORTFOLIO_CAPITAL: parseFloat(process.env.INITIAL_PORTFOLIO_CAPITAL || '10000'),
  MAX_DAILY_LOSS_PERCENT: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || '5'),
  MAX_WEEKLY_LOSS_PERCENT: parseFloat(process.env.MAX_WEEKLY_LOSS_PERCENT || '10'),
  MAX_POSITION_SIZE_PERCENT: parseFloat(process.env.MAX_POSITION_SIZE_PERCENT || '5'),

  // Feature Flags
  ENABLE_TRADING: process.env.ENABLE_TRADING === 'true',
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS !== 'false',
  TEST_MODE: process.env.TEST_MODE !== 'false',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || './logs/app.log',
};
