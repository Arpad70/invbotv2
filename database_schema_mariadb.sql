-- =====================================================
-- InvBot v2 - MySQL/MariaDB Database Schema (Simplified)
-- Compatible with MariaDB 10.11+
-- =====================================================

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    polymarket_api_key VARCHAR(500) DEFAULT NULL,
    kalshi_api_key VARCHAR(500) DEFAULT NULL,
    opinion_api_key VARCHAR(500) DEFAULT NULL,
    
    initial_capital DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    is_active BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferred_currency VARCHAR(10) DEFAULT 'USD',
    
    max_daily_loss_percent DECIMAL(5,2) DEFAULT 5.00,
    max_weekly_loss_percent DECIMAL(5,2) DEFAULT 10.00,
    max_position_size_percent DECIMAL(5,2) DEFAULT 5.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. PORTFOLIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS portfolios (
    portfolio_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    initial_capital DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    locked_capital DECIMAL(15,2) DEFAULT 0.00,
    
    realized_pnl DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. STRATEGIES
-- =====================================================

CREATE TABLE IF NOT EXISTS strategies (
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
    
    allocated_capital DECIMAL(15,2) NOT NULL,
    current_capital DECIMAL(15,2) NOT NULL,
    locked_capital DECIMAL(15,2) DEFAULT 0.00,
    
    realized_pnl DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    
    trade_count INT DEFAULT 0,
    win_count INT DEFAULT 0,
    
    parameters JSON,
    
    is_enabled BOOLEAN DEFAULT TRUE,
    is_test_mode BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_strategy_type (strategy_type),
    INDEX idx_is_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. TRADES
-- =====================================================

CREATE TABLE IF NOT EXISTS trades (
    trade_id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT NOT NULL,
    strategy_id INT NOT NULL,
    
    market_id VARCHAR(255) NOT NULL,
    market_name VARCHAR(500) NOT NULL,
    market_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER') DEFAULT 'POLYMARKET',
    market_expires_at TIMESTAMP NULL,
    
    order_type ENUM('YES', 'NO', 'BOTH') NOT NULL,
    initial_size_usd DECIMAL(15,2) NOT NULL,
    current_size_usd DECIMAL(15,2) NOT NULL,
    
    entry_price_yes DECIMAL(10,6),
    entry_price_no DECIMAL(10,6),
    entry_time TIMESTAMP NULL,
    
    current_price_yes DECIMAL(10,6),
    current_price_no DECIMAL(10,6),
    last_price_update TIMESTAMP NULL,
    
    exit_price_yes DECIMAL(10,6) NULL,
    exit_price_no DECIMAL(10,6) NULL,
    exit_time TIMESTAMP NULL,
    exit_reason VARCHAR(100) NULL,
    
    realized_pnl DECIMAL(15,2) NULL,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    
    status ENUM('PENDING', 'OPEN', 'CLOSED', 'CANCELLED', 'REJECTED') DEFAULT 'PENDING',
    
    user_approval ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    user_approval_time TIMESTAMP NULL,
    user_approval_notes VARCHAR(500) NULL,
    
    priority_boost DECIMAL(3,1) DEFAULT 1.0,
    priority_increase_reason VARCHAR(100) NULL,
    
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. TRADE POSITIONS (YES/NO sides)
-- =====================================================

CREATE TABLE IF NOT EXISTS trade_positions (
    position_id INT PRIMARY KEY AUTO_INCREMENT,
    trade_id INT NOT NULL,
    side ENUM('YES', 'NO') NOT NULL,
    
    shares DECIMAL(15,6) NOT NULL,
    avg_entry_price DECIMAL(10,6) NOT NULL,
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    current_price DECIMAL(10,6),
    current_value DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    
    exit_price DECIMAL(10,6) NULL,
    exit_time TIMESTAMP NULL,
    realized_pnl DECIMAL(15,2) NULL,
    
    status ENUM('OPEN', 'CLOSED', 'PARTIAL') DEFAULT 'OPEN',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (trade_id) REFERENCES trades(trade_id) ON DELETE CASCADE,
    
    INDEX idx_trade_id (trade_id),
    INDEX idx_side (side),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. ARBITRAGE OPPORTUNITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    opportunity_id INT PRIMARY KEY AUTO_INCREMENT,
    
    from_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER'),
    to_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER'),
    
    market_id VARCHAR(255) NOT NULL,
    market_name VARCHAR(500) NOT NULL,
    market_side ENUM('YES', 'NO'),
    
    from_price DECIMAL(10,6) NOT NULL,
    to_price DECIMAL(10,6) NOT NULL,
    spread_percent DECIMAL(8,4),
    
    from_liquidity_usd DECIMAL(15,2),
    to_liquidity_usd DECIMAL(15,2),
    min_available_usd DECIMAL(15,2),
    
    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    status ENUM('ACTIVE', 'EXECUTED', 'EXPIRED', 'SKIPPED') DEFAULT 'ACTIVE',
    
    executed_size_usd DECIMAL(15,2) NULL,
    actual_profit DECIMAL(15,2) NULL,
    execution_time TIMESTAMP NULL,
    
    INDEX idx_active (status, found_at DESC),
    INDEX idx_spread (spread_percent DESC),
    INDEX idx_platform_pair (from_platform, to_platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. MARKET DATA SNAPSHOTS (Historical)
-- =====================================================

CREATE TABLE IF NOT EXISTS market_data_snapshots (
    snapshot_id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT,
    
    market_id VARCHAR(255) NOT NULL,
    market_name VARCHAR(500),
    market_platform ENUM('POLYMARKET', 'KALSHI', 'OPINION', 'LIMITLESS', 'OTHER'),
    
    yes_price DECIMAL(10,6),
    no_price DECIMAL(10,6),
    
    liquidity_yes DECIMAL(15,2),
    liquidity_no DECIMAL(15,2),
    total_liquidity DECIMAL(15,2),
    
    volume_24h DECIMAL(15,2),
    trades_24h INT,
    
    is_active BOOLEAN DEFAULT TRUE,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE SET NULL,
    
    INDEX idx_market_id (market_id),
    INDEX idx_captured_time (captured_at DESC),
    INDEX idx_portfolio_time (portfolio_id, captured_at DESC),
    INDEX idx_platform (market_platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. ALERT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS alert_logs (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT NOT NULL,
    
    alert_type VARCHAR(100) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    severity ENUM('INFO', 'WARNING', 'CRITICAL') DEFAULT 'INFO',
    
    related_trade_id INT NULL,
    related_strategy_id INT NULL,
    
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by_user_id INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    FOREIGN KEY (related_trade_id) REFERENCES trades(trade_id) ON DELETE SET NULL,
    FOREIGN KEY (related_strategy_id) REFERENCES strategies(strategy_id) ON DELETE SET NULL,
    
    INDEX idx_portfolio_created (portfolio_id, created_at DESC),
    INDEX idx_severity (severity),
    INDEX idx_unacknowledged (is_acknowledged, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. API CACHE (Rate limiting & optimization)
-- =====================================================

CREATE TABLE IF NOT EXISTS api_cache (
    cache_id INT PRIMARY KEY AUTO_INCREMENT,
    
    endpoint_type VARCHAR(100),
    endpoint_url VARCHAR(500),
    query_params JSON,
    
    market_id VARCHAR(255) NULL,
    market_platform VARCHAR(50) NULL,
    
    response_hash VARCHAR(64) NOT NULL,
    response_data LONGTEXT NOT NULL,
    
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    hit_count INT DEFAULT 0,
    is_valid BOOLEAN DEFAULT TRUE,
    
    INDEX idx_endpoint (endpoint_type, expires_at),
    INDEX idx_market (market_id, market_platform),
    INDEX idx_expires (expires_at),
    UNIQUE KEY unique_hash (response_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. AUDIT LOG (Compliance & debugging)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

INSERT IGNORE INTO users (user_id, username, email, password_hash, initial_capital, created_at) 
VALUES (1, 'admin', 'admin@invbot.local', SHA2('admin123', 256), 10000.00, NOW());

INSERT IGNORE INTO portfolios (portfolio_id, user_id, name, initial_capital, current_balance, created_at)
VALUES (1, 1, 'Main Portfolio', 10000.00, 10000.00, NOW());

-- =====================================================
-- Done!
-- =====================================================
