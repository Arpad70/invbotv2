# 🚀 InvBot v2 Frontend - Installation Guide

This guide walks you through setting up and running the InvBot v2 frontend dashboard.

## Prerequisites

- **Node.js**: version 18 or higher
  - Download from: https://nodejs.org/
  - Verify: `node --version` (should show v18+)

- **npm**: comes with Node.js
  - Verify: `npm --version` (should show 9+)

- **Backend Running**: The API must be running on `localhost:3000`
  - See [../README.md](../README.md) for backend setup

## Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This will install all required packages:
- react@18.2.0
- vite@5.0.8
- typescript@5.3.3
- axios@1.6.0
- zustand@4.4.0
- react-router-dom@6.20.0
- And more...

Installation takes 2-5 minutes depending on internet speed.

## Step 2: Configure Environment (Optional)

The frontend comes with a default `.env.local` file configured for localhost development.

To customize, edit `frontend/.env.local`:

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1

# Feature Flags
VITE_ENABLE_TRADING=true
VITE_ENABLE_STRATEGIES=true
```

## Step 3: Start Development Server

```bash
npm run dev
```

Expected output:
```
  VITE v5.0.8  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

The dashboard will automatically open at `http://localhost:5173`

## Step 4: Test the Dashboard

1. **Login Page** should display
   - Enter username: `testuser`
   - Enter password: (use any password from your test data)
   - Click "Sign In"

2. **Dashboard** should show:
   - User profile information
   - Portfolio list (if any portfolios exist)
   - Trading features section

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Ensure backend is running on `localhost:3000`
2. Check `VITE_API_URL` in `.env.local` is correct
3. Restart both frontend and backend

### Port Already in Use

If port 5173 is in use:

```bash
# Use a different port
npm run dev -- --port 5174
```

### Dependencies Issues

If you get dependency errors:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend Connection Failed

If the frontend can't connect to the backend:

1. **Check backend is running**:
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok"}`

2. **Check API URL** in `.env.local`

3. **Check browser console** for error details (F12)

## Build for Production

### Create Optimized Build

```bash
npm run build
```

Output will be in `frontend/dist/` directory.

### Preview Production Build

```bash
npm run preview
```

This runs the production build locally for testing.

## Production Deployment

To deploy the frontend:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder** to your hosting:
   - GitHub Pages
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Your own server

3. **Configure backend URL** for production:
   - Create `.env.production.local`
   - Set `VITE_API_URL` to production API URL
   - Rebuild: `npm run build`

## Project Structure

```
frontend/
├── src/
│   ├── Dashboard.tsx       # Main dashboard component
│   ├── main.tsx            # React app entry point
│   ├── styles.css          # Global styles (dark theme)
│   ├── store.ts            # Zustand state management
│   ├── utils.ts            # Utility functions
│   └── services/
│       └── api.ts          # API client with interceptors
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # NPM dependencies
├── .env.local              # Local environment variables
└── README.md               # Frontend documentation
```

## Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code (if eslint is configured)
npm run lint
```

## Next Steps

After the frontend is running:

1. **Create a test portfolio**
   - Click "+ New Portfolio" button
   - Fill in portfolio details
   - Submit the form

2. **Explore the APIs**
   - Open browser Developer Tools (F12)
   - Check "Network" tab to see API calls
   - Monitor login and data fetching

3. **Customize the theme**
   - Edit CSS custom properties in `src/styles.css`
   - Change colors under `:root`
   - Reload the page to see changes

4. **Extend the dashboard**
   - Add new pages in `src/` directory
   - Create new components as `.tsx` files
   - Use Zustand stores for state management
   - Call API methods from `services/api.ts`

## Getting Help

- Check [README.md](./README.md) for API integration details
- Review [src/services/api.ts](./src/services/api.ts) for available API methods
- Check browser console (F12) for error messages
- Review backend logs for API errors

## Important Notes

⚠️ **Development Only**: This guide is for local development. For production:
- Don't commit `.env.local` files
- Use proper secret management
- Enable HTTPS
- Set up proper CORS policies
- Use environment-specific builds

🔒 **Security**: 
- Tokens are stored in localStorage (use sessionStorage in production)
- Never expose API keys in client code
- Use HTTPS in production
- Implement proper authentication/authorization

Happy trading! 🚀
