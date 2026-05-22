# DEPLOYMENT GUIDE — Vercel Node.js Full-Stack Setup

## What Changed

Your project has been restructured from a **frontend-only** deployment to a **unified Node.js + Express backend** that serves both the API and static frontend files.

### Key Improvements

✅ **Single Deployment Unit**: Backend + frontend deployed together  
✅ **Relative API URLs**: Frontend calls `/api/*` (same origin)  
✅ **Proper Static Serving**: Express serves `index.html`, CSS, JS from root  
✅ **Security**: Direct file access to `server.js`, `.env` blocked  
✅ **Environment Variables**: Uses `process.env.SUPABASE_URL` and `process.env.SUPABASE_KEY`  

---

## Deployment Architecture

```
Vercel Deployment (eskom-theft-detection.vercel.app)
         │
         ├─ Node.js Runtime (server.js)
         │     ├─ /api/* endpoints → Supabase
         │     └─ Static routes → index.html, /pages/*, /js/*, /css/*
         │
         └─ Environment Variables (stored in Vercel)
               ├─ SUPABASE_URL
               ├─ SUPABASE_KEY
               ├─ JWT_SECRET
               └─ PORT (auto-set by Vercel)
```

---

## Updated Files

### Backend (Node.js Entrypoint)
- **server.js**:
  - Now exports the Express `app` for Vercel's Node runtime
  - Serves static files (`/index.html`, `/pages/`, `/js/`, `/css/`)
  - Blocks direct access to `server.js`, `package.json`, `.env`
  - Exports as module: `module.exports = app`

### Frontend (Updated for Relative URLs)
All frontend files now use **relative API paths**:
```js
// OLD (localhost only)
const BASE_URL = "http://localhost:3000";
const res = await fetch(`${BASE_URL}/api/cases`, {...});

// NEW (deployment-ready)
const BASE_URL = '';  // or omit entirely
const res = await fetch('/api/cases', {...});
```

**Updated Files**:
- `js/auth.js`, `js/dashboard.js`, `js/cases.js`, `js/assign.js`
- `js/commander.js`, `js/map.js`, `js/evaluations.js`, `js/report.js`
- `pages/admin.html`, `pages/cases.html`, `pages/caseList.html`
- `pages/evaluations.html`, `pages/record.html`, `pages/report.html`
- `pages/resolved.html`

### Deployment Config
- **vercel.json** (NEW):
  ```json
  {
    "version": 3,
    "builds": [
      { "src": "server.js", "use": "@vercel/node" }
    ],
    "routes": [
      { "src": "/(.*)", "dest": "/server.js" }
    ]
  }
  ```

### Package Configuration
- **package.json**:
  - `"main": "server.js"` (Vercel entrypoint)
  - `"start": "node server.js"` (Vercel start script)

---

## How to Deploy to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Refactor: unified Node.js backend + frontend"
git push origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Import Project"** → Select your GitHub repo
3. Vercel auto-detects `vercel.json` and `server.js`

### Step 3: Configure Environment Variables
In Vercel dashboard → **Settings** → **Environment Variables**, add:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_KEY = your-service-role-key
JWT_SECRET = your-jwt-secret-key
```

⚠️ **Use your Service Role key** (not the public key) for `SUPABASE_KEY` so server-side operations work.

### Step 4: Deploy
Click **"Deploy"**. Vercel runs:
1. `npm install` (installs dependencies from package.json)
2. `npm start` (runs Node.js server)
3. Server listens on `process.env.PORT` (Vercel manages this)

---

## Fixing the 500 Error

The previous deployment failed because:
- ❌ Frontend files were served as static (no backend routing)
- ❌ API calls to `localhost:3000` failed on Vercel
- ❌ No `vercel.json` route mapping

**Now fixed**:
- ✅ Server handles both API and static file routing
- ✅ Frontend uses relative paths (`/api/*`)
- ✅ `vercel.json` maps all requests to `server.js`
- ✅ Supabase credentials passed via environment variables

---

## Testing Locally Before Deployment

```bash
# Install dependencies
npm install

# Set environment variables (Windows PowerShell)
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_KEY = "your-service-role-key"
$env:JWT_SECRET = "your-jwt-secret"

# Start the server
npm start

# Visit http://localhost:3000
# - Login page at /
# - API calls to /api/* are routed to Express endpoints
# - Static files served automatically
```

---

## Troubleshooting

### 500 Error on Vercel
- Check Vercel Logs: Dashboard → **Deployments** → Select build → **Logs**
- Verify all env vars are set correctly
- Ensure `SUPABASE_KEY` is the **service role key** (not public anon key)

### API calls return 404
- Ensure `BASE_URL = ''` (empty string) in frontend files
- Verify fetch URLs use `/api/*` (relative paths)
- Check server.js has the correct endpoints (e.g., `/api/cases`)

### Static files (CSS, JS) not loading
- Vercel should serve them automatically via Express.static
- If not, check that files are in project root `/css/`, `/js/`, `/pages/`

---

## Local Development Workflow

After deployment, to continue developing locally:

```bash
# Pull latest from GitHub
git pull origin main

# Install/update dependencies
npm install

# Run with env vars (as shown above)
npm start

# Make changes to frontend (js, css, html)
# Changes reflect immediately in browser (refresh)

# Make changes to API (server.js)
# Restart: Ctrl+C, then npm start
```

---

## What the Server Does Now

### 1. **Serves Frontend**
```
GET /                    → index.html
GET /pages/cases.html    → Served as-is
GET /css/style.css       → Served as-is
GET /js/dashboard.js     → Served as-is
```

### 2. **Routes API Calls**
```
POST /api/auth/login              → Authenticate user
GET  /api/cases                   → Fetch cases
PUT  /api/cases/:id               → Update case
GET  /api/investigators           → Fetch team
POST /api/users                   → Create user (admin)
GET  /api/dashboard/stats         → Fetch stats
... (and more)
```

### 3. **Blocks Sensitive Files**
```
GET  /server.js           → 404 (blocked)
GET  /.env                → 404 (blocked)
GET  /package.json        → 404 (blocked)
```

---

## Summary

Your project is now deployment-ready as a **unified Node.js + Express application**. The backend renders the frontend while exposing secure API endpoints. Deploy with confidence to Vercel! 🚀

---

**For issues or questions**, check:
- Vercel Logs (real-time error output)
- Browser Console (frontend JS errors)
- Supabase Dashboard (database connectivity)
