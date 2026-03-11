-- =====================================================
-- InvBot v2 - MySQL Database Schema
-- =====================================================

CREATE DATABASE IF NOT EXISTS invbotv2_db;
USE invbotv2_db;

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- API Keys (encrypted in application)
    polymarket_api_key VARCHAR(500) NULL,
    kalshi_api_key VARCHAR(500) NULL,
    opinion_api_key VARCHAR(500) NULL,
    
    -- User settings
    initial_capital DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    is_active BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferred_currency VARCHAR(10) DEFAULT 'USD',
    
    -- Risk preferences
    max_daily_loss_percent DECIMAL(5,2) DEFAULT 5.00,
    max_weekly_loss_percent DECIMAL(5,2) DEFAULT 10.00,
    max_position_size_percent DECIMAL(5,2) DEFAULT 5.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at DESC)
);

-- =====================================================
-- 2. PORTFOLIOS
-- =====================================================

CREATE TABLE portfolios (
    portfolio_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Capital tracking
    initial_capital DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    locked_capital DECIMAL(15,2) DEFAULT 0.00,  -- Capital in open positions
    available_capital DECIMAL(15,2) GENERATED ALWAYS AS (current_balance - locked_capital) STORED,
    
    -- Performance
    realized_pnl DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    total_pnl GENERATED ALWAYS AS (realized_pnl + unrealized_pnl) STORED,
    roi_percent DECIMAL(8,2) GENERATED ALWAYS AS ((total_pnl / initial_capital * 100)) STORED,
    
    -- Statistics
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_trades > 0 
        THEN (winning_trades / total_trades * 100) 
        ELSE 0 END
    ) STORED,
    
    avg_win DECIMAL(15,2) DEFAULT 0.00,
    avg_loss DECIMAL(15,2) DEFAULT 0.00,
    max_drawdown_percent DECIMAL(8,2) DEFAULT 0.00,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- 3. STRATEGIES
-- =====================================================

CREATE TABLE strategies (
    strategy_id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    strategy_type ENUM(
        'FARMING',
        'CRYPTO_15MIN',
        'COPY_TRADING',
        'PENNY_TRADING',
        'ARBITRAGE',
        'MARKET_DEPTH',
        'NEAR_EXPIRY',
        'SMALL_EXCHANGE'
    ) NOT NULL,
    description TEXT,
    
    -- Capital allocation
    allocated_capital DECIMAL(15,2) NOT NULL,
    current_capital DECIMAL(15,2) NOT NULL,
    locked_capital DECIMAL(15,2) DEFAULT 0.00,
    
    -- Performance
    realized_pnl DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    roi_percent DECIMAL(8,2) DEFAULT 0.00,
    
    -- Statistics
    trade_count INT DEFAULT 0,
    win_count INT DEFAULT 0,
    loss_count INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Strategy parameters (JSON for flexibility)
    parameters JSON,
    
    is_enabled BOOLEAN DEFAULT TRUE,
    is_test_mode BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_strategy_type (strategy_type),
    INDEX idx_is_enabled (is_enabled)
);

-- =====================================================
-- 4. TRADES
-- =====================================================

CREATE TABLE trades (
    trade_id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT NOT NULL,
    strategy_id INT NOT NULL,
    
    -- Market information
    market_id VARCHAR(255) NOT NULL,
    market_name VARCHAR(500) NOT NULL,
    market_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER') DEFAULT 'POLYMARKET',
    market_expires_at TIMESTAMP NULL,
    
    -- Trade details
    order_type ENUM('YES', 'NO', 'BOTH') NOT NULL,
    initial_size_usd DECIMAL(15,2) NOT NULL,
    current_size_usd DECIMAL(15,2) NOT NULL,
    
    -- Entry prices
    entry_price_yes DECIMAL(10,6),
    entry_price_no DECIMAL(10,6),
    entry_time TIMESTAMP,
    
    -- Current prices
    current_price_yes DECIMAL(10,6),
    current_price_no DECIMAL(10,6),
    last_price_update TIMESTAMP,
    
    -- Exit information
    exit_price_yes DECIMAL(10,6) NULL,
    exit_price_no DECIMAL(10,6) NULL,
    exit_time TIMESTAMP NULL,
    exit_reason VARCHAR(100) NULL,
    
    -- P&L
    realized_pnl DECIMAL(15,2) NULL,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    roi_percent DECIMAL(8,2) DEFAULT 0.00,
    
    -- Status
    status ENUM('PENDING', 'OPEN', 'CLOSED', 'CANCELLED', 'REJECTED') DEFAULT 'PENDING',
    
    -- User intervention
    user_approval ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    user_approval_time TIMESTAMP NULL,
    user_approval_notes VARCHAR(500) NULL,
    
    -- Priority tracking (for incremental sizing)
    priority_boost DECIMAL(3,1) DEFAULT 1.0,  -- 1.0 to 5.0
    priority_increase_reason VARCHAR(100) NULL,
    
    -- Risk management
    stoploss_percent DECIMAL(5,2) NULL,
    stoploss_triggered BOOLEAN DEFAULT FALSE,
    stoploss_price DECIMAL(10,6) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    FOREIGN KEY (strategy_id) REFERENCES strategies(strategy_id) ON DELETE CASCADE,
    
    INDEX idx_portfolio_status (portfolio_id, status),
    INDEX idx_strategy_status (strategy_id, status),
    INDEX idx_market_id (market_id),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_user_approval (user_approval)
);

-- =====================================================
-- 5. TRADE POSITIONS (YES/NO sides)
-- =====================================================

CREATE TABLE trade_positions (
    position_id INT PRIMARY KEY AUTO_INCREMENT,
    trade_id INT NOT NULL,
    side ENUM('YES', 'NO') NOT NULL,
    
    -- Position details
    shares DECIMAL(15,6) NOT NULL,
    avg_entry_price DECIMAL(10,6) NOT NULL,
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Current status
    current_price DECIMAL(10,6),
    current_value DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    
    -- Exit
    exit_price DECIMAL(10,6) NULL,
    exit_time TIMESTAMP NULL,
    realized_pnl DECIMAL(15,2) NULL,
    
    status ENUM('OPEN', 'CLOSED', 'PARTIAL') DEFAULT 'OPEN',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (trade_id) REFERENCES trades(trade_id) ON DELETE CASCADE,
    
    INDEX idx_trade_id (trade_id),
    INDEX idx_side (side),
    INDEX idx_status (status)
);

-- =====================================================
-- 6. ARBITRAGE OPPORTUNITIES
-- =====================================================

CREATE TABLE arbitrage_opportunities (
    opportunity_id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Platform pair
    from_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER'),
    to_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER'),
    
    -- Market information
    market_id VARCHAR(255) NOT NULL,
    market_name VARCHAR(500) NOT NULL,
    market_side ENUM('YES', 'NO'),
    
    -- Pricing
    from_price DECIMAL(10,6) NOT NULL,
    to_price DECIMAL(10,6) NOT NULL,
    spread_abs DECIMAL(10,6) GENERATED ALWAYS AS (ABS(to_price - from_price)) STORED,
    spread_percent DECIMAL(8,4) GENERATED ALWAYS AS (
        ((to_price - from_price) / from_price * 100)
    ) STORED,
    
    -- Liquidity info
    from_liquidity_usd DECIMAL(15,2),
    to_liquidity_usd DECIMAL(15,2),
    min_available_usd DECIMAL(15,2),  -- min of both sides
    
    -- Timing
    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    status ENUM('ACTIVE', 'EXECUTED', 'EXPIRED', 'SKIPPED') DEFAULT 'ACTIVE',
    
    -- Execution tracking
    executed_size_usd DECIMAL(15,2) NULL,
    actual_profit DECIMAL(15,2) NULL,
    execution_time TIMESTAMP NULL,
    
    INDEX idx_active (status, found_at DESC),
    INDEX idx_spread (spread_percent DESC),
    INDEX idx_platform_pair (from_platform, to_platform)
);

-- =====================================================
-- 7. MARKET DATA SNAPSHOTS (Historical)
-- =====================================================

CREATE TABLE market_data_snapshots (
    snapshot_id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT,
    
    -- Market info
    market_id VARCHAR(255) NOT NULL,
    market_name VARCHAR(500),
    market_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER'),
    
    -- Prices
    yes_price DECIMAL(10,6),
    no_price DECIMAL(10,6),
    implied_prob_yes DECIMAL(5,4) GENERATED ALWAYS AS (yes_price) STORED,
    
    -- Liquidity
    liquidity_yes DECIMAL(15,2),
    liquidity_no DECIMAL(15,2),
    total_liquidity DECIMAL(15,2),
    
    -- Volume & activity
    volume_24h DECIMAL(15,2),
    trades_24h INT,
    
    -- Miscellaneous
    is_active BOOLEAN DEFAULT TRUE,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE SET NULL,
    
    INDEX idx_market_id (market_id),
    INDEX idx_captured_time (captured_at DESC),
    INDEX idx_portfolio_time (portfolio_id, captured_at DESC),
    INDEX idx_platform (market_platform)
);

-- =====================================================
-- 8. ALERT LOGS
-- =====================================================

CREATE TABLE alert_logs (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT NOT NULL,
    
    -- Alert details
    alert_type VARCHAR(100) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    severity ENUM('INFO', 'WARNING', 'CRITICAL') DEFAULT 'INFO',
    
    -- References
    related_trade_id INT NULL,
    related_strategy_id INT NULL,
    
    -- Status
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by_user_id INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    FOREIGN KEY (related_trade_id) REFERENCES trades(trade_id) ON DELETE SET NULL,
    FOREIGN KEY (related_strategy_id) REFERENCES strategies(strategy_id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_portfolio_created (portfolio_id, created_at DESC),
    INDEX idx_severity (severity),
    INDEX idx_unacknowledged (is_acknowledged, severity)
);

-- =====================================================
-- 9. API CACHE (Rate limiting & optimization)
-- =====================================================

CREATE TABLE api_cache (
    cache_id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Request tracking
    endpoint_type VARCHAR(100),  -- 'market_data', 'orderbook', 'user_balance', etc.
    endpoint_url VARCHAR(500),
    query_params JSON,
    
    -- Market context
    market_id VARCHAR(255) NULL,
    market_platform VARCHAR(50) NULL,
    
    -- Cached response
    response_hash VARCHAR(64) NOT NULL,
    response_data LONGTEXT NOT NULL,
    
    -- Caching metadata
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    hit_count INT DEFAULT 0,
    is_valid BOOLEAN DEFAULT TRUE,
    
    INDEX idx_endpoint (endpoint_type, expires_at),
    INDEX idx_market (market_id, market_platform),
    INDEX idx_expires (expires_at),
    UNIQUE KEY unique_hash (response_hash)
);

-- =====================================================
-- 10. AUDIT LOG (Compliance & debugging)
-- =====================================================

CREATE TABLE audit_log (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action_type VARCHAR(100),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_user_time (user_id, created_at DESC),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_action (action_type, created_at DESC)
);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Portfolio summary
CREATE VIEW v_portfolio_summary AS
SELECT 
    p.portfolio_id,
    p.user_id,
    p.name,
    p.initial_capital,
    p.current_balance,
    p.realized_pnl,
    p.unrealized_pnl,
    (p.realized_pnl + p.unrealized_pnl) as total_pnl,
    ((p.realized_pnl + p.unrealized_pnl) / p.initial_capital * 100) as roi_percent,
    p.total_trades,
    p.winning_trades,
    p.losing_trades,
    p.win_rate,
    p.created_at,
    COUNT(DISTINCT s.strategy_id) as strategy_count
FROM portfolios p
LEFT JOIN strategies s ON p.portfolio_id = s.portfolio_id
GROUP BY p.portfolio_id;

-- Active trades
CREATE VIEW v_active_trades AS
SELECT 
    t.trade_id,
    t.portfolio_id,
    t.strategy_id,
    t.market_name,
    t.initial_size_usd,
    t.unrealized_pnl,
    t.roi_percent,
    t.user_approval,
    t.status,
    t.created_at,
    CASE 
        WHEN t.order_type = 'YES' THEN t.current_price_yes
        WHEN t.order_type = 'NO' THEN t.current_price_no
        ELSE (t.current_price_yes + t.current_price_no) / 2
    END as current_price,
    ROUND((UNIX_TIMESTAMP(NOW()) - UNIX_TIMESTAMP(t.created_at)) / 3600) as hours_open
FROM trades t
WHERE t.status IN ('OPEN', 'PENDING');

-- Strategy performance
CREATE VIEW v_strategy_performance AS
SELECT 
    s.strategy_id,
    s.portfolio_id,
    s.name,
    s.strategy_type,
    s.allocated_capital,
    s.current_capital,
    s.roi_percent,
    s.trade_count,
    s.win_count,
    s.win_rate,
    s.is_enabled,
    (SELECT COUNT(*) FROM trades WHERE strategy_id = s.strategy_id AND status = 'OPEN') as open_trades,
    (SELECT SUM(unrealized_pnl) FROM trades WHERE strategy_id = s.strategy_id AND status = 'OPEN') as open_pnl
FROM strategies s;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Update portfolio P&L
DELIMITER //
CREATE PROCEDURE update_portfolio_pnl(IN p_portfolio_id INT)
BEGIN
    UPDATE portfolios
    SET 
        realized_pnl = (SELECT COALESCE(SUM(realized_pnl), 0) FROM trades WHERE portfolio_id = p_portfolio_id AND status = 'CLOSED'),
        unrealized_pnl = (SELECT COALESCE(SUM(unrealized_pnl), 0) FROM trades WHERE portfolio_id = p_portfolio_id AND status = 'OPEN'),
        total_trades = (SELECT COUNT(*) FROM trades WHERE portfolio_id = p_portfolio_id AND status != 'CANCELLED'),
        winning_trades = (SELECT COUNT(*) FROM trades WHERE portfolio_id = p_portfolio_id AND status = 'CLOSED' AND realized_pnl > 0),
        losing_trades = (SELECT COUNT(*) FROM trades WHERE portfolio_id = p_portfolio_id AND status = 'CLOSED' AND realized_pnl < 0),
        updated_at = NOW()
    WHERE portfolio_id = p_portfolio_id;
END //
DELIMITER ;

-- Close trade
DELIMITER //
CREATE PROCEDURE close_trade(
    IN p_trade_id INT,
    IN p_exit_price_yes DECIMAL(10,6),
    IN p_exit_price_no DECIMAL(10,6),
    IN p_exit_reason VARCHAR(100)
)
BEGIN
    DECLARE v_portfolio_id INT;
    DECLARE v_initial_size DECIMAL(15,2);
    DECLARE v_realized_pnl DECIMAL(15,2);
    
    SELECT portfolio_id, initial_size_usd INTO v_portfolio_id, v_initial_size FROM trades WHERE trade_id = p_trade_id;
    
    -- Calculate P&L (simplified - real implementation would be more complex)
    SET v_realized_pnl = v_initial_size * ((p_exit_price_yes - entry_price_yes) / entry_price_yes);
    
    UPDATE trades
    SET 
        status = 'CLOSED',
        exit_price_yes = p_exit_price_yes,
        exit_price_no = p_exit_price_no,
        exit_time = NOW(),
        exit_reason = p_exit_reason,
        realized_pnl = v_realized_pnl,
        updated_at = NOW()
    WHERE trade_id = p_trade_id;
    
    -- Update portfolio
    CALL update_portfolio_pnl(v_portfolio_id);
END //
DELIMITER ;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

INSERT INTO users (username, email, password_hash, initial_capital)
VALUES ('admin', 'admin@invbot.local', SHA2('admin123', 256), 10000.00);
