# Unified Render Deployment — Setup Complete! 🚀

## What's Been Done

I've fully configured your Eskom Theft Detection System for **unified deployment** on Render. Here's what changed:

### 1. **Server Configuration** (`server.js`)
✅ Added static file serving middleware:
- `app.use(express.static(path.join(__dirname, 'pages')))` — serves HTML pages
- `app.use(express.static(path.join(__dirname, 'css')))` — serves stylesheets
- `app.use(express.static(path.join(__dirname, 'js')))` — serves JavaScript
- `app.use(express.static(__dirname))` — serves root files (index.html)

**Result:** Your Node.js backend now serves both:
- ✅ API routes (`/api/cases`, `/api/login`, etc.)
- ✅ Frontend files (HTML, CSS, JS)

### 2. **Package Configuration** (`package.json`)
✅ Updated with:
- `"start": "node server.js"` — Render will use this to start
- `"engines": { "node": "18.x" }` — specifies Node.js version
- Proper project metadata

### 3. **Environment Template** (`.env.example`)
✅ Created template with all required variables:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `JWT_SECRET`
- `OPENAI_API_KEY`

### 4. **Deployment Configuration** (`render.yaml`)
✅ Optional but helpful — auto-configuration file for Render

### 5. **Documentation**
✅ Created 3 comprehensive guides:

| File | Purpose |
|------|---------|
| [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) | Complete step-by-step deployment guide |
| [DEPLOYMENT_RENDER_CHECKLIST.md](DEPLOYMENT_RENDER_CHECKLIST.md) | Checklist to ensure nothing is missed |
| [start.sh](start.sh) | Bash script for local testing (Linux/Mac) |
| [start.bat](start.bat) | Batch script for local testing (Windows) |

---

## How to Deploy Now

### **Quick Steps:**

1. **Prepare Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials:
   #   - SUPABASE_URL
   #   - SUPABASE_KEY (service role key!)
   #   - JWT_SECRET (generate random string)
   #   - OPENAI_API_KEY
   ```

2. **Test Locally**
   ```bash
   npm install
   npm start
   # Visit: http://localhost:3000
   ```

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Configure unified Render deployment"
   git push origin main
   ```

4. **Deploy to Render**
   - Go to [render.com](https://render.com)
   - Sign in / Create account
   - New Web Service → Connect GitHub repo
   - Fill in configuration (see guide for details)
   - Set environment variables
   - Deploy!

5. **Test Production**
   - Visit `https://your-service.onrender.com/`
   - Login and verify functionality
   - Test API and chatbot

---

## Architecture Overview

### Before (Separate Services)
```
Frontend (separate static host)     Backend (Render)
     ↓                                    ↓
user.com ──────→ (CORS) ────────→ api.user.com
```
❌ 2 services, 2 costs, 2 deployments, CORS issues

### After (Unified Service)
```
Render Web Service
├── Backend API Routes
│   ├── /api/cases
│   ├── /api/login
│   ├── /api/chatbot
│   └── ...
└── Frontend Static Files
    ├── pages/*.html
    ├── css/*.css
    └── js/*.js
```
✅ 1 service, 1 cost, 1 deployment, no CORS!

---

## Key Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `server.js` | ✏️ Modified | Added static file serving |
| `package.json` | ✏️ Modified | Added start script + Node 18 |
| `.env.example` | ✨ Created | Environment template |
| `render.yaml` | ✨ Created | Optional Render config |
| `RENDER_DEPLOYMENT_GUIDE.md` | ✨ Created | Step-by-step guide |
| `DEPLOYMENT_RENDER_CHECKLIST.md` | ✨ Created | Pre-deployment checklist |
| `start.sh` | ✨ Created | Local dev (Mac/Linux) |
| `start.bat` | ✨ Created | Local dev (Windows) |

---

## Important Notes

### ⚠️ Security

1. **Never commit `.env`** — It's in `.gitignore`, make sure it stays there
2. **Use SERVICE ROLE key**, not anon key, for `SUPABASE_KEY`
3. **Generate random `JWT_SECRET`**: 
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### 🔌 API URLs

All frontend code should use `window.location.origin` for API calls:

```javascript
// ✅ Good (works anywhere)
const response = await fetch(`${window.location.origin}/api/cases`);

// ❌ Avoid (breaks in production)
const response = await fetch('http://localhost:3000/api/cases');
```

### 📍 Frontend File Structure

The server serves files in this order:
1. `/pages/*.html` → accessible as `/pages/dashboard.html`
2. `/css/*.css` → accessible as `/css/dashboard.css`
3. `/js/*.js` → accessible as `/js/dashboard.js`
4. `/index.html` → accessible as `/index.html`

So links should be:
- `<link rel="stylesheet" href="../css/dashboard.css">`
- `<script src="../js/dashboard.js"></script>`

---

## Troubleshooting

### Can't start locally?
- Ensure `.env` is properly filled
- Run `npm install` first
- Check Node.js version: `node --version` (should be 18+)

### Deployment fails on Render?
- Check build logs in Render dashboard
- Verify environment variables are set
- Ensure `package.json` syntax is valid
- Confirm `server.js` can be found at root

### Frontend not loading?
- Check browser console for JS errors
- Verify API URLs use `window.location.origin`
- Test static files: `https://your-app/index.html`

### API returning 401/403?
- Verify JWT_SECRET matches between local and Render
- Check Supabase key is SERVICE ROLE, not anon
- Ensure token is properly sent in headers

---

## Next Steps

1. **Review the deployment guide** → `RENDER_DEPLOYMENT_GUIDE.md`
2. **Complete the checklist** → `DEPLOYMENT_RENDER_CHECKLIST.md`
3. **Test locally first** → Run `npm start`
4. **Create .env file** with your actual credentials
5. **Push to GitHub** → Make sure `.env` is NOT committed
6. **Deploy to Render** → Follow the guide
7. **Test in production** → Login, create cases, use chatbot
8. **Share the URL** with your team!

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **Express Static Files**: https://expressjs.com/en/starter/static-files.html
- **Supabase Docs**: https://supabase.com/docs
- **OpenAI API**: https://platform.openai.com/docs

---

## Summary

Your application is now **ready to deploy as a unified service**. You have:

✅ Backend serving API + Frontend
✅ Environment configuration templates
✅ Comprehensive deployment guide
✅ Pre-deployment checklist
✅ Local testing scripts
✅ Production-ready setup

**Estimated deployment time:** 5-10 minutes on Render

**Cost:** Free tier available (or ~$7/month for more power)

**Result:** Single URL for entire application + better performance!

---

**Questions? Issues?** Check the RENDER_DEPLOYMENT_GUIDE.md or DEPLOYMENT_RENDER_CHECKLIST.md for detailed help.

Good luck with your deployment! 🚀
