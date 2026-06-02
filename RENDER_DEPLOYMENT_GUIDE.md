# Render Deployment Guide — Unified Backend + Frontend

This guide will help you deploy the Eskom Theft Detection System as a **single unified service** on Render, where the Node.js backend serves both the API and the static frontend files.

## Why This Approach?

✅ **Single deployment** — No need to manage separate frontend/backend services
✅ **Lower cost** — Use only 1 service instead of 2
✅ **Simpler URLs** — Everything under one domain
✅ **Automatic CORS** — No cross-origin issues
✅ **Production-ready** — Express serves static files efficiently

---

## Prerequisites

Before deploying, you'll need:

1. **Render Account** — Sign up for free at [render.com](https://render.com)
2. **GitHub Repository** — Your code pushed to GitHub (public or private)
3. **Supabase Account** — Database already set up at [supabase.com](https://supabase.com)
4. **OpenAI API Key** — From [platform.openai.com](https://platform.openai.com)
5. **Environment variables ready**:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (service role key, not anon key)
   - `JWT_SECRET` (generate a random 32+ character string)
   - `OPENAI_API_KEY`

---

## Step 1: Prepare Your GitHub Repository

### 1.1 Ensure your repo has the correct structure:

```
Eskom-theft-detection/
├── server.js                 # Main Express server
├── package.json              # Node.js dependencies + start script
├── .env.example             # Template (don't commit secrets!)
├── pages/                   # HTML pages (served as static files)
│   ├── dashboard.html
│   ├── admin.html
│   └── ...
├── css/                     # Stylesheets
│   ├── dashboard.css
│   ├── chatbot.css
│   └── ...
├── js/                      # JavaScript files
│   ├── dashboard.js
│   ├── chatbot.js
│   └── ...
├── index.html              # Landing page (root)
└── migration.sql           # Database schema (optional reference)
```

### 1.2 Create `.gitignore` to protect secrets:

```bash
# If you don't have one, create it at the root:
```

**`.gitignore` contents:**
```
node_modules/
.env
.env.local
.DS_Store
*.log
dist/
build/
```

### 1.3 Push to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

---

## Step 2: Set Up Supabase

If you haven't already:

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (or use existing one)
3. Run your migration SQL to create tables:
   - Go to **SQL Editor**
   - Paste the contents of `migration.sql`
   - Click **Run**
4. Get your credentials:
   - **SUPABASE_URL** — Copy from Project Settings → API → Project URL
   - **SUPABASE_KEY** — Copy the **SERVICE ROLE KEY** (not the anon key!)

⚠️ **Important**: Use the SERVICE ROLE key, not the anon key. This allows your server to bypass RLS for your own RBAC.

---

## Step 3: Create Render Web Service

### 3.1 Log in to Render Dashboard

Go to [dashboard.render.com](https://dashboard.render.com)

### 3.2 Create a New Web Service

1. Click **New** → **Web Service**
2. Select **Deploy an existing repository** or **Connect a public GitHub repo**
3. Authorize GitHub if prompted
4. Select your `Eskom-theft-detection` repository
5. Click **Connect**

### 3.3 Configure the Service

Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `eskom-theft-detection` (or your choice) |
| **Environment** | `Node` |
| **Region** | Pick closest to your users (e.g., `Frankfurt` for SA users) |
| **Branch** | `main` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Starter` (free tier, or upgrade as needed) |

### 3.4 Add Environment Variables

Scroll down to **Environment Variables** and click **Add Environment Variable** for each:

1. **PORT** = `3000`
2. **NODE_ENV** = `production`
3. **SUPABASE_URL** = `https://your-project.supabase.co` (your actual URL)
4. **SUPABASE_KEY** = `your-service-role-key` (your actual key)
5. **JWT_SECRET** = `generate-a-random-32-char-string-here` (make it random!)
6. **OPENAI_API_KEY** = `sk-...` (your actual OpenAI key)

**Example JWT_SECRET generator** (run in terminal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.5 Deploy

Click **Create Web Service**

Render will:
- Install dependencies (`npm install`)
- Start your server (`npm start`)
- Assign a public URL (e.g., `eskom-theft-detection.onrender.com`)

**Build takes ~2-3 minutes.** You'll see logs in real-time.

---

## Step 4: Verify Deployment

Once the deploy succeeds, test these URLs:

1. **Health check** (API):
   ```
   https://eskom-theft-detection.onrender.com/
   ```
   Should return: `Eskom Theft Detection API ✔`

2. **Landing page** (Frontend):
   ```
   https://eskom-theft-detection.onrender.com/index.html
   ```
   Should show your landing page

3. **Login page**:
   ```
   https://eskom-theft-detection.onrender.com/pages/login.html
   ```
   Should show the login form

4. **API test** (POST):
   ```bash
   curl -X POST https://eskom-theft-detection.onrender.com/api/test
   ```
   Should return: `POST WORKING`

---

## Step 5: Update Frontend URLs

If your frontend currently references `localhost:3000`, update it to use the Render URL.

### Check and update all instances:

Search for `localhost:3000` or `http://localhost:3000` in these files:

- `js/auth.js`
- `js/main.js`
- `js/dashboard.js`
- Any other JS file making API calls

**Replace with:**
```javascript
// Old:
const API_URL = 'http://localhost:3000';

// New:
const API_URL = window.location.origin;
```

Or hardcode for production:
```javascript
const API_URL = 'https://eskom-theft-detection.onrender.com';
```

**Using `window.location.origin` is best** — it automatically adapts to wherever the frontend is served from.

---

## Step 6: Enable Auto-Deployments (Optional)

To automatically redeploy when you push to GitHub:

1. In Render dashboard, go to your service
2. Click **Settings** → **Build & Deploy**
3. Enable **Auto-Deploy** from `main` branch
4. Any push to `main` will trigger a new build

---

## Step 7: Monitor Your Deployment

### View Logs:
1. Go to your Render service dashboard
2. Click **Logs** tab
3. See real-time server output

### Common Issues & Fixes:

| Issue | Fix |
|-------|-----|
| Build fails: `npm install` error | Check `package.json` syntax, ensure all dependencies are listed |
| Port 3000 already in use | Render assigns a port automatically; use `process.env.PORT` in `server.js` ✅ (already done) |
| API returns 401 Unauthorized | Verify `SUPABASE_KEY` is the **SERVICE ROLE** key, not anon key |
| Frontend shows blank page | Check browser console for JS errors; verify `window.location.origin` in API calls |
| Chatbot returns 404 | Ensure `/api/chatbot` route exists and `OPENAI_API_KEY` is set |

---

## Step 8: Database Backup & Recovery

### Supabase Automatic Backups:
- Supabase keeps automatic backups (check your plan)
- Go to **Project Settings** → **Backups** to download

### Manual Backup:
```bash
# Export your database schema + data
pg_dump -h your-db-host -U postgres -d your_db > backup.sql
```

---

## Custom Domain (Optional)

To use `app.mycompany.com` instead of `eskom-theft-detection.onrender.com`:

1. **Add custom domain** in Render dashboard:
   - Service → Settings → Custom Domains
   - Add your domain
   
2. **Update DNS** with your domain registrar:
   - Add CNAME record pointing to Render's assigned hostname
   - Render will provide exact instructions

---

## Performance Optimization

### For Production:

1. **Enable compression** (add to `server.js` before routes):
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Upgrade from Starter** if you get high traffic:
   - Render dashboard → Service → **Plan** → upgrade to Standard ($7/month)

3. **Scale horizontally** if needed:
   - Render dashboard → Service → **Scaling** → increase instance count

4. **CDN for static files** (advanced):
   - Consider Cloudflare or Render's Edge Cache

---

## Troubleshooting

### "Build Command Failed"
- Check `package.json` syntax
- Ensure all dependencies are correctly spelled
- Verify Node.js version is 18.x+

### "Cannot find module 'dotenv'"
- Run `npm install` locally first
- Check `package.json` includes it

### "SUPABASE_URL is undefined"
- Verify environment variable is set in Render dashboard
- Restart the service after adding env vars
- Double-check spelling (case-sensitive!)

### "Cannot POST /api/..."
- Ensure the route exists in `server.js`
- Check the route is defined AFTER middleware
- Look at server logs for exact error

### "Mixed Content" errors in browser
- All API URLs must be HTTPS (not HTTP)
- Use `window.location.origin` in frontend JS

---

## Next Steps

### 1. **Test all features**:
   - Login with test user
   - Create a case
   - Assign investigator
   - Use the chatbot AI

### 2. **Set up monitoring** (optional):
   - Enable alerts in Render dashboard
   - Monitor response times and error rates

### 3. **Enable analytics** (optional):
   - Add Google Analytics to `index.html`
   - Track user behavior

### 4. **Back up regularly**:
   - Download Supabase backups weekly
   - Keep a local copy of your database

---

## Support

**Issues?**
- Check Render status page: [status.render.com](https://status.render.com)
- Review server logs in Render dashboard
- Test API endpoints with Postman or curl
- Check browser console for frontend errors

---

## Summary

You now have:
✅ Single unified service (backend + frontend)
✅ Automatic CORS handling
✅ Production-ready deployment
✅ Auto-scaling capability
✅ Live monitoring & logs

**Your app is now live at:**
```
https://eskom-theft-detection.onrender.com
```

Share this URL with your team and start detecting electricity theft! 🚀
