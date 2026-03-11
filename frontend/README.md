# InvBot v2 Frontend

React + Vite dashboard for AI-powered Polymarket trading bot.

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` if you need to change the API endpoint (default: `http://localhost:3000/api/v1`).

### Running Locally

Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

Production files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Architecture

### Components
- `Dashboard.tsx` - Main dashboard component with login and user profile
- Responsive design with dark theme

### Services
- `services/api.ts` - API client with axios and token management
- Automatic token refresh on 401 errors
- Request/response interceptors

### State Management
- `store.ts` - Zustand stores for:
  - Auth (user, tokens, loading, error)
  - Portfolio (portfolios, selected, loading, error)
  - Markets (market data, selected market, loading, error)
- Persistent auth store (tokens saved to localStorage)

### Styling
- `styles.css` - Dark theme with CSS custom properties
- Fully responsive (mobile, tablet, desktop)
- Modern UI with gradients and hover effects

## API Integration

The frontend connects to the backend API at `/api/v1` with endpoints:

### Authentication
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/refresh` - Refresh token

### Users
- `GET /users/me` - Get profile
- `PUT /users/me` - Update profile
- `POST /users/me/change-password` - Change password
- `POST /users/me/api-keys` - Add API key
- `GET /users/me/api-keys` - List API keys
- `DELETE /users/me/api-keys/:platform` - Delete API key

### Portfolios
- `GET /portfolios` - List portfolios
- `GET /portfolios/:id` - Get portfolio
- `POST /portfolios` - Create portfolio
- `PUT /portfolios/:id` - Update portfolio
- `DELETE /portfolios/:id` - Delete portfolio

### Strategies
- `GET /strategies` - List strategies
- `GET /strategies/:id` - Get strategy
- `POST /strategies` - Create strategy
- `PUT /strategies/:id` - Update strategy
- `DELETE /strategies/:id` - Delete strategy

### Trades
- `GET /trades` - List trades
- `GET /trades/:id` - Get trade
- `POST /trades` - Create trade
- `POST /trades/:id/approve` - Approve trade
- `POST /trades/:id/close` - Close trade
- `GET /trades/metrics` - Get trade metrics

## Features

✅ User authentication with JWT tokens
✅ Dashboard with user profile display
✅ Portfolio management (list, create, edit, delete)
✅ Real-time market data display
✅ Trading strategies management
✅ Trade approval workflow
✅ API key management for integrations
✅ Responsive design
✅ Automatic token refresh
✅ Error handling and loading states

## Next Steps

1. Create additional pages:
   - Login/Register pages
   - Portfolio detail view
   - Strategy management page
   - Market data browser
   - Trade history page

2. Implement real-time features:
   - WebSocket for live updates
   - Real-time market data
   - Trade notifications

3. Add advanced UI:
   - Charts for portfolio performance
   - Strategy backtesting results
   - Market analysis visualizations
   - Trading charts

## Development Notes

- TypeScript strict mode enabled
- React 18 with hooks
- Vite for fast development and optimized builds
- Axios with global interceptors
- Zustand for simple, lightweight state management
- CSS custom properties for theming

## Environment Variables

- `VITE_API_URL` - Backend API base URL (default: `http://localhost:3000/api/v1`)
- `VITE_ENABLE_TRADING` - Enable/disable trading features (default: `true`)
- `VITE_ENABLE_STRATEGIES` - Enable/disable strategy features (default: `true`)
