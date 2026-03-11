# InvBot v2 - Kompletní Projektová Analýza

## 📋 Přehled Projektu

**Cíl**: Automatizovaný bot pro trading na predikčních trzích (Polymarket a dalších) s inteligentním portfolio managementem, risk management a mehrady strategiích pro maximální zisk.

**Typ**: Full-stack web aplikace s backendem (Python/Node.js), databází MySQL a frontendovým dashboard.

---

## 🎯 Hlavní Funkční Požadavky

### 1. Bot Engine (Core Trading Logic)
- [ ] Multi-strategie algoritmy
  - Farmování (spread arbitrage)
  - 15-minutové sázky (HFT)
  - Copy trading (sledování walletů)
  - Penny trading (micro moves)
  - Cross-exchange arbitrage
  - Market depth strategy
  - Near-expiry opportunities

- [ ] Portfolio Management
  - Inicializace: 10,000 USD
  - Alokace per strategie
  - Tracking pozic v reálném čase
  - P&L výpočty (realizované + nerealizované)

- [ ] Risk Management
  - Per-sázka limits (1‰ → 5% portfolia)
  - Stoploss mechanismy (max -10% per sázka)
  - Max portfolio exposure
  - Daily/weekly loss limits
  - Inkrementální zvyšování sázek

### 2. Data Management
- [ ] Real-time market data
  - Ceny z Polymarketu API
  - Liquidity & volume tracking
  - Arbitrage spreads
  - CEX price monitoring (Binance, Coinbase)

- [ ] Historical Data
  - Market snapshots
  - Trade history
  - Performance metrics per strategie

### 3. Dashboard & UI
- [ ] Real-time portfolio view
  - Total capital
  - Current positions (active bets)
  - Open/closed trades
  - Profit/loss cascade
  - Unrealized gains/losses

- [ ] Strategy Management
  - Enable/disable strategie
  - Parameter adjustment
  - Performance analytics per strategie
  - Backtest results

- [ ] Manual Intervention Panel
  - Trade approval/rejection
  - Position sizing override
  - Emergency stoploss
  - Parameter tweaks

### 4. Monitoring & Alerts
- [ ] Real-time notifications
  - Trade execution alerts
  - Loss thresholds crossed
  - Liquidity issues
  - API errors
  - Market opportunities

---

## 🗄️ Databázová Struktura (MySQL)

### Core Tables

#### 1. `portfolios`
```
portfolio_id        | INT PK, AUTO_INCREMENT
user_id             | INT FK
name                | VARCHAR(255)
initial_capital     | DECIMAL(15,2)
current_balance     | DECIMAL(15,2)
locked_capital      | DECIMAL(15,2) -- v otevřených pozicích
unrealized_pnl      | DECIMAL(15,2)
realized_pnl        | DECIMAL(15,2)
created_at          | TIMESTAMP
updated_at          | TIMESTAMP
```

#### 2. `strategies`
```
strategy_id         | INT PK, AUTO_INCREMENT
portfolio_id        | INT FK
name                | VARCHAR(100) -- 'farming', 'crypto_15min', 'copy_trading', etc.
description         | TEXT
enabled             | BOOLEAN
allocated_capital   | DECIMAL(15,2)
current_capital     | DECIMAL(15,2)
roi_percent         | DECIMAL(8,2)
trade_count        | INT
win_rate            | DECIMAL(5,2)
created_at          | TIMESTAMP
updated_at          | TIMESTAMP
```

#### 3. `trades`
```
trade_id            | INT PK, AUTO_INCREMENT
portfolio_id        | INT FK
strategy_id         | INT FK
market_id           | VARCHAR(255) -- Polymarket market ID
market_question     | VARCHAR(500)
order_type          | ENUM('YES', 'NO', 'BOTH')
size_usd            | DECIMAL(15,2)
entry_price_yes     | DECIMAL(10,6)
entry_price_no      | DECIMAL(10,6)
current_price_yes   | DECIMAL(10,6)
current_price_no    | DECIMAL(10,6)
status              | ENUM('PENDING', 'OPEN', 'CLOSED', 'CANCELLED')
entry_time          | TIMESTAMP
exit_time           | TIMESTAMP NULL
realized_pnl        | DECIMAL(15,2) NULL
unrealized_pnl      | DECIMAL(15,2)
roi_percent         | DECIMAL(8,2)
priority_boost      | DECIMAL(3,1) -- 1.0 → 5.0 inkrementálně
user_approval       | ENUM('PENDING', 'APPROVED', 'REJECTED')
approval_time       | TIMESTAMP NULL
created_at          | TIMESTAMP
```

#### 4. `trade_positions` (detail yes/no stran)
```
position_id         | INT PK, AUTO_INCREMENT
trade_id            | INT FK
side                | ENUM('YES', 'NO')
shares              | DECIMAL(15,6)
avg_entry_price     | DECIMAL(10,6)
current_price       | DECIMAL(10,6)
current_value       | DECIMAL(15,2)
unrealized_pnl      | DECIMAL(15,2)
status              | ENUM('OPEN', 'CLOSED', 'PARTIAL')
```

#### 5. `arbitrage_opportunities`
```
opportunity_id      | INT PK, AUTO_INCREMENT
from_platform       | VARCHAR(50) -- 'polymarket', 'kalshi', 'opinion'
to_platform         | VARCHAR(50)
market_id           | VARCHAR(255)
market_name         | VARCHAR(500)
from_price          | DECIMAL(10,6)
to_price            | DECIMAL(10,6)
spread_percent      | DECIMAL(8,4)
liquidity_usd       | DECIMAL(15,2)
found_at            | TIMESTAMP
expires_at          | TIMESTAMP NULL
status              | ENUM('ACTIVE', 'EXECUTED', 'EXPIRED')
```

#### 6. `market_data_snapshots` (historical)
```
snapshot_id         | INT PK, AUTO_INCREMENT
portfolio_id        | INT FK
market_id           | VARCHAR(255)
market_name         | VARCHAR(500)
yes_price           | DECIMAL(10,6)
no_price            | DECIMAL(10,6)
liquidity_yes       | DECIMAL(15,2)
liquidity_no        | DECIMAL(15,2)
volume_24h          | DECIMAL(15,2)
last_updated        | TIMESTAMP
captured_at         | TIMESTAMP
```

#### 7. `alert_logs`
```
alert_id            | INT PK, AUTO_INCREMENT
portfolio_id        | INT FK
alert_type          | VARCHAR(100) -- 'loss_threshold', 'opportunity', 'error'
message             | TEXT
severity            | ENUM('INFO', 'WARNING', 'CRITICAL')
related_trade_id    | INT FK NULL
created_at          | TIMESTAMP
acknowledged        | BOOLEAN DEFAULT FALSE
```

#### 8. `api_cache`
```
cache_id            | INT PK, AUTO_INCREMENT
endpoint            | VARCHAR(500)
market_id           | VARCHAR(255) NULL
response_hash       | VARCHAR(64)
response_json       | LONGTEXT
cached_at           | TIMESTAMP
expires_at          | TIMESTAMP
is_valid            | BOOLEAN
```

#### 9. `users`
```
user_id             | INT PK, AUTO_INCREMENT
username            | VARCHAR(100) UNIQUE
email               | VARCHAR(255) UNIQUE
password_hash       | VARCHAR(255)
polymarket_key      | VARCHAR(500) ENCRYPTED
kalshi_key          | VARCHAR(500) ENCRYPTED
initial_capital     | DECIMAL(15,2)
is_active           | BOOLEAN
created_at          | TIMESTAMP
updated_at          | TIMESTAMP
```

---

## 🏗️ Technologický Stack

### Backend
- **Runtime**: Python 3.11+ (asyncio) nebo Node.js 20+
- **Web Framework**: FastAPI (Python) nebo Express.js (Node)
- **Task Queue**: Celery + Redis (async processing)
- **WebSocket**: Real-time updates
- **APIs**:
  - Polymarket API (REST)
  - CEX APIs (Binance, Coinbase WebSocket)
  - Custom webhook handlers

### Frontend
- **Framework**: React 18 + TypeScript
- **State Management**: Redux Toolkit
- **WebSocket Client**: socket.io-client
- **Charts**: Recharts, TradingView Lightweight Charts
- **UI**: Tailwind CSS + shadcn/ui

### Database & Cache
- **Primary**: MySQL 8.0+
- **Cache**: Redis (3.2+)
- **Message Queue**: RabbitMQ

### Deployment
- **Containers**: Docker + Docker Compose
- **Orchestration**: Docker Compose (development), Kubernetes (production)
- **Monitoring**: Prometheus + Grafana

---

## 📊 Database Indexes (Performance)

```sql
-- Trades
CREATE INDEX idx_trades_portfolio_status ON trades(portfolio_id, status);
CREATE INDEX idx_trades_strategy_status ON trades(strategy_id, status);
CREATE INDEX idx_trades_market ON trades(market_id);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);

-- Market snapshots
CREATE INDEX idx_snapshots_market_time ON market_data_snapshots(market_id, captured_at DESC);
CREATE INDEX idx_snapshots_portfolio ON market_data_snapshots(portfolio_id, captured_at DESC);

-- Arbitrage opportunities
CREATE INDEX idx_arb_active ON arbitrage_opportunities(status, found_at DESC);
CREATE INDEX idx_arb_spread ON arbitrage_opportunities(spread_percent DESC);

-- API Cache
CREATE INDEX idx_cache_endpoint ON api_cache(endpoint, expires_at);
```

---

## 🔄 Workflow Arkitektura

```
┌─────────────────────────────────────────────────────────────┐
│                    POLYMARKET & OTHER APIs                  │
├─────────────────────────────────────────────────────────────┤
│  Real-time Price Feeds → Market Data Snapshots              │
│  Liquidity Updates → Arbitrage Detection                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   REDIS CACHE LAYER                         │
│  Cache: Market prices, Opportunities, API responses         │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐        ┌──────────────────┐
│  STRATEGY        │        │  RISK MONITOR    │
│  ENGINES         │        │  ENGINE          │
│  - Farming       │        │  - Loss checks   │
│  - Crypto 15min  │        │  - Limits        │
│  - Copy Trading  │        │  - Validation    │
│  - Arbitrage     │        │  - Alerts        │
└────────┬────────┘        └────────┬─────────┘
         │                          │
         └──────────────┬───────────┘
                        ▼
         ┌──────────────────────────┐
         │  TRADE EXECUTION QUEUE   │
         │  (RabbitMQ/Celery)       │
         └──────────────┬───────────┘
                        │
         ┌──────────────┴────────────┐
         ▼                           ▼
    ┌─────────┐             ┌──────────────┐
    │ EXECUTE  │             │  UPDATE DB   │
    │ TRADE    │             │  & Cache     │
    └─────────┘             └──────────────┘
         │                           │
         └──────────────┬────────────┘
                        ▼
         ┌──────────────────────────┐
         │   NOTIFICATION SYSTEM    │
         │   - WebSocket updates    │
         │   - Email alerts         │
         │   - Slack notifications  │
         └──────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │  FRONTEND DASHBOARD      │
         │  - React SPA             │
         │  - Real-time data        │
         │  - User controls         │
         └──────────────────────────┘
```

---

## ✅ Kritické Success Faktory

1. **API Rate Limiting** - Polymarket má limity, nutná cache + batch operations
2. **Order Execution Speed** - Millisecond-level response na arbitrage opportunities
3. **Risk Management Strictness** - Automatické emergency stoploss
4. **Data Accuracy** - Synchronizace cen mezi burzami
5. **User Approval Loop** - Prvních X obchodů vyžadují schválení
6. **Error Handling** - Network failures, API downtime, market closures

---

## 📈 Roadmap - Fáze Vývoje

### Fáze 1: MVP (Týدny 1-4)
- [x] Databázová schéma
- [ ] Auth system + user management
- [ ] Polymarket API integration
- [ ] Base strategy engine (farming strategy)
- [ ] Simple portfolio tracking
- [ ] Basic dashboard

### Fáze 2: Advanced Features (Týdny 5-8)
- [ ] 15-minute crypto trading
- [ ] Copy trading engine
- [ ] Arbitrage detection
- [ ] Advanced risk management
- [ ] Email/Slack alerts
- [ ] Performance analytics

### Fáze 3: Optimization & Scale (Týdny 9+)
- [ ] Multi-exchange support
- [ ] ML-based price prediction
- [ ] Backtesting framework
- [ ] Production deployment
- [ ] Performance monitoring

---

## 🚀 Zahájení Programování

Začneme s:
1. Inicializací projektu (Node.js/Python backend)
2. Nastavením MySQL databáze
3. Autentifikací a user management
4. Polymarket API integration
5. Základním bot engine
