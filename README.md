# InvBot v2

AI-powered Polymarket prediction market trading bot with advanced strategies and risk management.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for MySQL/Redis)
- MySQL 8.0+
- Redis 7+

### Installation

1. **Clone & Install Dependencies**
```bash
cd /home/ahorak/www/invbotv2
npm install
```

2. **Start Services (Docker)**
```bash
docker-compose up -d mysql redis
```

3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Initialize Database**
```bash
mysql -h localhost -u root -ppassword < database_schema.sql
```

5. **Run Application**
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Project Structure

```
invbotv2/
├── src/
│   ├── bot/              # Bot engines & strategies
│   ├── config/           # Configuration files
│   ├── database/         # Database connections
│   ├── middleware/       # Express middleware
│   ├── modules/          # Feature modules
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   └── index.ts          # Entry point
├── database_schema.sql   # MySQL schema
├── docker-compose.yml    # Docker setup
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## API Endpoints

### Health Check
- `GET /health` - Server status

### Authentication (To be implemented)
- `POST /api/auth/login`
- `POST /api/auth/register`

### Portfolios (To be implemented)
- `GET /api/portfolios` - List user portfolios
- `POST /api/portfolios` - Create portfolio
- `GET /api/portfolios/:id` - Get portfolio details
- `GET /api/portfolios/:id/stats` - Portfolio statistics

### Trades (To be implemented)
- `GET /api/portfolios/:id/trades` - List trades
- `POST /api/portfolios/:id/trades` - Create trade
- `POST /api/trades/:id/approve` - Approve trade
- `POST /api/trades/:id/close` - Close trade

### Strategies (To be implemented)
- `GET /api/portfolios/:id/strategies` - List strategies
- `POST /api/portfolios/:id/strategies` - Create strategy
- `GET /api/strategies/:id/performance` - Strategy performance

## Strategies Implemented

### Phase 1 (Current)
- [ ] Farming Strategy (Spread Arbitrage)
- [ ] Basic Portfolio Tracking
- [ ] Risk Management Framework

### Phase 2
- [ ] 15-Minute Crypto Trading
- [ ] Copy Trading
- [ ] Penny Trading
- [ ] Cross-Exchange Arbitrage

### Phase 3
- [ ] Market Depth Strategy
- [ ] Near-Expiry Opportunities
- [ ] Small Exchange Trading
- [ ] Advanced Risk Management

## Database

The application uses MySQL 8.0+ with the following main tables:
- `users` - User accounts
- `portfolios` - Trading portfolios
- `strategies` - Trading strategies
- `trades` - Individual trades
- `trade_positions` - Position details (YES/NO sides)
- `market_data_snapshots` - Historical market data
- `arbitrage_opportunities` - Detected arbitrage opportunities
- `alert_logs` - System alerts
- `audit_log` - Compliance logging

See `database_schema.sql` for full structure.

## Configuration

Key environment variables:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=invbot_v2

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d

ENABLE_TRADING=false    # Safety: start with false
ENABLE_NOTIFICATIONS=true
TEST_MODE=true
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run dev
```

### Testing
```bash
npm run test
npm run test:watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Formatting
```bash
npm run format
```

## Monitoring

### Logs
Logs are written to `./logs/app.log` and console.

### Docker Logs
```bash
docker-compose logs -f app
docker-compose logs -f mysql
docker-compose logs -f redis
```

## API Examples

### Health Check
```bash
curl http://localhost:3000/health
```

### Get Version
```bash
curl http://localhost:3000/api/version
```

## Performance Targets

- **Portfolio Management**: 1ms average response time
- **Market Data Sync**: Sub-second updates
- **Trade Execution**: <1 second from detection to execution
- **Risk Checks**: Real-time validation before execution

## Security Notes

1. Never commit `.env` файл with real API keys
2. API keys are encrypted in database
3. All passwords hashed with SHA256
4. JWT tokens for API authentication
5. Rate limiting on API endpoints (to be implemented)

## Troubleshooting

### MySQL Connection Error
```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs mysql

# Restart
docker-compose restart mysql
```

### Port Already in Use
```bash
# Change port in docker-compose.yml OR
# Kill process on port
lsof -i :3000  # Find PID
kill -9 <PID>
```

## Future Enhancements

1. WebSocket for real-time updates
2. AI-powered strategy optimization
3. Backtesting framework
4. Advanced charting
5. Multi-account management
6. Mobile app
7. Community strategy sharing
8. Automated arbitrage detection

## License

MIT

## Support

For issues and questions, refer to the project documentation and GitHub issues.
