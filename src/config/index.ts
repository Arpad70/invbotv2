import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_DATABASE',
  'DB_USER',
  'DB_PASSWORD',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file');
  process.exit(1);
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database (Centralized - all from .env)
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_DATABASE!,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },

  // API Keys
  apis: {
    polymarket: process.env.POLYMARKET_API_KEY || '',
    kalshi: process.env.KALSHI_API_KEY || '',
    opinion: process.env.OPINION_API_KEY || '',
  },

  // Trading Settings
  trading: {
    initialCapital: parseFloat(process.env.INITIAL_PORTFOLIO_CAPITAL || '10000'),
    maxDailyLossPercent: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || '5'),
    maxWeeklyLossPercent: parseFloat(process.env.MAX_WEEKLY_LOSS_PERCENT || '10'),
    maxPositionSizePercent: parseFloat(process.env.MAX_POSITION_SIZE_PERCENT || '5'),
  },

  // Feature Flags
  features: {
    enableTrading: process.env.ENABLE_TRADING === 'true',
    enableNotifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
    testMode: process.env.TEST_MODE !== 'false',
  },
} as const;

// Export type for use in application
export type AppConfig = typeof config;
