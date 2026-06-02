# Quick Reference — Render Deployment

## TL;DR (Too Long; Didn't Read)

Your system is ready to deploy to Render as **one unified service** (backend + frontend together).

### In 3 Steps:

#### 1️⃣ **Setup Locally**
```bash
cp .env.example .env
# Edit .env with your credentials (SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, OPENAI_API_KEY)
npm install
npm start
# Test at: http://localhost:3000
```

#### 2️⃣ **Push to GitHub**
```bash
git add .
git commit -m "Ready for Render"
git push origin main
```

#### 3️⃣ **Deploy to Render**
- Go to render.com
- Create Web Service → Select your GitHub repo
- Set build command: `npm install`
- Set start command: `npm start`
- Add 4 environment variables (from your .env)
- Click Deploy!

✅ Done! Your app is now live.

---

## What Changed?

### `server.js`
- ✅ Now serves static files (HTML, CSS, JS)
- ✅ One server handles API + Frontend

### `package.json`
- ✅ Added `"start": "node server.js"`
- ✅ Specified Node.js 18.x

### New Files Created
- ✅ `.env.example` — Environment template
- ✅ `RENDER_DEPLOYMENT_GUIDE.md` — Detailed instructions
- ✅ `DEPLOYMENT_RENDER_CHECKLIST.md` — Pre-deployment checklist
- ✅ `start.sh` / `start.bat` — Local test scripts
- ✅ `render.yaml` — Optional Render config

---

## Environment Variables Needed

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `SUPABASE_URL` | Supabase Settings → API | `https://abc123.supabase.co` |
| `SUPABASE_KEY` | Supabase Settings → API (SERVICE ROLE) | `eyJhbGc...` |
| `JWT_SECRET` | Generate random | `abc123def456...` |
| `OPENAI_API_KEY` | OpenAI Platform | `sk-...` |

**⚠️ Important:** Use SERVICE ROLE key for Supabase, NOT anon key!

---

## Local Testing

### **Windows:**
```bash
start.bat
```

### **Mac/Linux:**
```bash
bash start.sh
```

Or manually:
```bash
npm install
npm start
```

Then visit: **http://localhost:3000**

---

## Deployment URL

Once deployed to Render, your app will be at:
```
https://eskom-theft-detection.onrender.com
(or whatever name you choose)
```

---

## Test After Deployment

✅ Visit `https://your-service.onrender.com/` — should see "Eskom Theft Detection API ✔"
✅ Visit `https://your-service.onrender.com/index.html` — should see landing page
✅ Login and verify all features work
✅ Test chatbot AI
✅ Check browser console for errors

---

## Cost

- **Free:** Starter tier (perfect for testing)
- **~$7/month:** Standard tier (production-ready)
- **Scale as needed:** Add more resources if traffic grows

---

## Single Service Benefits

✅ One deployment (not two)
✅ No CORS issues
✅ Same domain for API + Frontend
✅ Easier maintenance
✅ Lower cost
✅ Better performance

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module 'path'" | Add `const path = require('path');` (already done) |
| `.env` not being read | Check it's in root directory, run `npm start` again |
| Static files not loading | Verify files exist in `pages/`, `css/`, `js/` folders |
| API 401 errors | Check `SUPABASE_KEY` is SERVICE ROLE, not anon |
| Frontend blank page | Check browser console for JS errors, verify `window.location.origin` usage |

---

## Next Actions

1. **Read full guide:** `RENDER_DEPLOYMENT_GUIDE.md`
2. **Go through checklist:** `DEPLOYMENT_RENDER_CHECKLIST.md`
3. **Test locally:** Run `npm start`
4. **Deploy to Render:** Follow the guide
5. **Share the URL** with your team!

---

## Files to Review

| File | Purpose |
|------|---------|
| `SETUP_COMPLETE.md` | What was configured |
| `RENDER_DEPLOYMENT_GUIDE.md` | Complete step-by-step guide |
| `DEPLOYMENT_RENDER_CHECKLIST.md` | Pre-deployment verification |
| `.env.example` | Required environment variables |
| `start.sh` / `start.bat` | Local test scripts |

---

**Ready to deploy? Start with the RENDER_DEPLOYMENT_GUIDE.md! 🚀**
