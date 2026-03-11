// ====================================
// Common Types & Interfaces
// ====================================

export interface User {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  initial_capital: number;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  address?: string;
  polymarket_api_key?: string;
  kalshi_api_key?: string;
  opinion_api_key?: string;
  is_active: boolean;
  timezone: string;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Portfolio {
  portfolio_id: number;
  user_id: number;
  name: string;
  description?: string;
  initial_capital: number;
  current_balance: number;
  locked_capital: number;
  available_capital: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  roi_percent: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum StrategyType {
  FARMING = 'FARMING',
  CRYPTO_15MIN = 'CRYPTO_15MIN',
  COPY_TRADING = 'COPY_TRADING',
  PENNY_TRADING = 'PENNY_TRADING',
  ARBITRAGE = 'ARBITRAGE',
  MARKET_DEPTH = 'MARKET_DEPTH',
  NEAR_EXPIRY = 'NEAR_EXPIRY',
  SMALL_EXCHANGE = 'SMALL_EXCHANGE'
}

export interface Strategy {
  strategy_id: number;
  portfolio_id: number;
  name: string;
  strategy_type: StrategyType;
  description?: string;
  allocated_capital: number;
  current_capital: number;
  locked_capital: number;
  realized_pnl: number;
  unrealized_pnl: number;
  roi_percent: number;
  trade_count: number;
  win_count: number;
  win_rate: number;
  parameters: Record<string, any>;
  is_enabled: boolean;
  is_test_mode: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum TradeStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum TradeApproval {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum OrderType {
  YES = 'YES',
  NO = 'NO',
  BOTH = 'BOTH'
}

export enum MarketPlatform {
  POLYMARKET = 'POLYMARKET',
  KALSHI = 'KALSHI',
  OPINION = 'OPINION',
  LIMITLESS = 'LIMITLESS',
  OTHER = 'OTHER'
}

export interface Trade {
  trade_id: number;
  portfolio_id: number;
  strategy_id: number;
  market_id: string;
  market_name: string;
  market_platform: MarketPlatform;
  market_expires_at?: Date;
  order_type: OrderType;
  initial_size_usd: number;
  current_size_usd: number;
  entry_price_yes?: number;
  entry_price_no?: number;
  entry_time?: Date;
  current_price_yes?: number;
  current_price_no?: number;
  exit_price_yes?: number;
  exit_price_no?: number;
  exit_time?: Date;
  exit_reason?: string;
  realized_pnl?: number;
  unrealized_pnl: number;
  roi_percent: number;
  status: TradeStatus;
  user_approval: TradeApproval;
  user_approval_time?: Date;
  priority_boost: number;
  stoploss_percent?: number;
  stoploss_triggered: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TradePosition {
  position_id: number;
  trade_id: number;
  side: 'YES' | 'NO';
  shares: number;
  avg_entry_price: number;
  current_price?: number;
  current_value?: number;
  unrealized_pnl: number;
  exit_price?: number;
  exit_time?: Date;
  realized_pnl?: number;
  status: 'OPEN' | 'CLOSED' | 'PARTIAL';
  updated_at: Date;
}

export interface ArbitrageOpportunity {
  opportunity_id: number;
  from_platform: MarketPlatform;
  to_platform: MarketPlatform;
  market_id: string;
  market_name: string;
  market_side?: 'YES' | 'NO';
  from_price: number;
  to_price: number;
  spread_abs: number;
  spread_percent: number;
  from_liquidity_usd?: number;
  to_liquidity_usd?: number;
  min_available_usd?: number;
  found_at: Date;
  expires_at?: Date;
  status: 'ACTIVE' | 'EXECUTED' | 'EXPIRED' | 'SKIPPED';
  executed_size_usd?: number;
  actual_profit?: number;
  execution_time?: Date;
}

export interface MarketData {
  snapshot_id?: number;
  portfolio_id?: number;
  market_id: string;
  market_name?: string;
  market_platform?: MarketPlatform;
  yes_price?: number;
  no_price?: number;
  implied_prob_yes?: number;
  liquidity_yes?: number;
  liquidity_no?: number;
  total_liquidity?: number;
  volume_24h?: number;
  trades_24h?: number;
  is_active: boolean;
  captured_at: Date;
}

export interface Alert {
  alert_id: number;
  portfolio_id: number;
  alert_type: string;
  subject?: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  related_trade_id?: number;
  related_strategy_id?: number;
  is_acknowledged: boolean;
  acknowledged_at?: Date;
  created_at: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

// ====================================
// Request/Response DTOs
// ====================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    username: string;
    email: string;
  };
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  initial_capital: number;
}

export interface CreateStrategyRequest {
  name: string;
  strategy_type: StrategyType;
  description?: string;
  allocated_capital: number;
  parameters?: Record<string, any>;
}

export interface CreateTradeRequest {
  strategy_id: number;
  market_id: string;
  market_name: string;
  market_platform: MarketPlatform;
  order_type: OrderType;
  initial_size_usd: number;
  stoploss_percent?: number;
}

export interface ApproveTradeRequest {
  approve: boolean;
  notes?: string;
}

export interface BotStrategyParams {
  [key: string]: any;
}

// Farming Strategy specific
export interface FarmingStrategyParams extends BotStrategyParams {
  min_market_age_days: number;
  max_days_to_expiry: number;
  min_spread_percent: number;
  max_spread_percent: number;
  min_liquidity_usd: number;
  position_size_percent: number;
}

// Crypto 15min Strategy specific
export interface Crypto15minStrategyParams extends BotStrategyParams {
  max_trade_size_usd: number;
  stoploss_percent: number;
  trailing_stop: boolean;
  trailing_stop_percent: number;
}

// Arbitrage Strategy specific
export interface ArbitrageStrategyParams extends BotStrategyParams {
  platforms: MarketPlatform[];
  min_spread_percent: number;
  min_liquidity_usd: number;
  execution_timeout_seconds: number;
}
