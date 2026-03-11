# 🚀 Quick Start Guide - InvBot v2

## ✅ Backend (Already Running)

Server is running on **http://localhost:3000**

Test it:
```bash
curl http://localhost:3000/health
```

---

## 🎨 Frontend - Get It Running in 3 Steps

### Step 1: Install Dependencies (2-5 minutes)
```bash
cd frontend
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

You'll see:
```
➜ Local: http://localhost:5173/
```

### Step 3: Open in Browser
- Click the link or open **http://localhost:5173**
- Login with: `testuser` / (your test password)
- See your dashboard!

---

## 📝 Common Commands

```bash
# Start development (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check TypeScript errors
npx tsc --noEmit
```

---

## 🔧 Troubleshooting

### Port 5173 Already in Use?
```bash
npm run dev -- --port 5174
```

### Can't Connect to Backend?
1. Check backend is running: `curl http://localhost:3000/health`
2. Check `.env.local` has correct API URL
3. Restart both frontend and backend

### npm install Errors?
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📂 Important Files

- **`src/Dashboard.tsx`** - Main component
- **`src/services/api.ts`** - Backend API client
- **`src/store.ts`** - State management
- **`src/styles.css`** - Styling
- **`vite.config.ts`** - Vite config
- **`.env.local`** - Configuration

---

## 🌐 API Integration

The frontend automatically connects to backend API:
- **Login**: POST `/auth/login`
- **Profile**: GET `/users/me`
- **Portfolios**: GET/POST `/portfolios`
- **Trades**: GET/POST `/trades`
- **Strategies**: GET/POST `/strategies`

All requests include JWT token automatically ✅

---

## 📊 What You'll See

**Login Page**
- Email/username field
- Password field
- Sign in button

**Dashboard** (after login)
- Your user profile information
- Portfolio list with stats
- Trading features showcase
- Logout button

---

## 💡 Tips

1. **Browser DevTools** (F12) shows API calls in Network tab
2. **Console** (F12) shows errors and logs
3. **localStorage** in DevTools shows stored tokens
4. **VS Code** has full TypeScript autocomplete

---

## 🎯 Next: Add More Pages

After getting it running, you can add:
- Portfolio detail pages
- Strategy management
- Trade history
- Market data browser
- Analytics charts

See `frontend/README.md` for more details.

---

## ⏱️ Expected Timeline

| Task | Time |
|------|------|
| npm install | 2-5 min |
| npm run dev | < 1 min |
| Open browser | < 1 sec |
| **Total** | **~5 minutes** |

---

## 🆘 Need Help?

1. Check `frontend/INSTALLATION.md` for detailed setup
2. Review `frontend/README.md` for documentation
3. See `PROJECT_STATUS.md` for architecture overview
4. Check browser console (F12) for error details

---

**You're all set! Run `npm run dev` and start building.** 🚀
