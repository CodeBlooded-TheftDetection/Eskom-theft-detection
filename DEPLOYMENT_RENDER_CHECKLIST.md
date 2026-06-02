# Render Deployment Checklist

Complete this checklist before deploying to Render:

## Pre-Deployment (Local Setup)

- [ ] Clone the repository locally
- [ ] Copy `.env.example` to `.env`
- [ ] Update `.env` with your credentials:
  - [ ] `SUPABASE_URL` (from Supabase Settings)
  - [ ] `SUPABASE_KEY` (Service Role key, NOT anon key)
  - [ ] `JWT_SECRET` (random 32+ character string)
  - [ ] `OPENAI_API_KEY` (from OpenAI platform)
- [ ] Run `npm install` to install dependencies
- [ ] Test locally: Run `npm start` or `node server.js`
- [ ] Verify at `http://localhost:3000`:
  - [ ] Landing page loads
  - [ ] Login page works
  - [ ] API health check returns "Eskom Theft Detection API ✔"
- [ ] Commit and push to GitHub
  - [ ] Do NOT commit `.env` file (it's in `.gitignore`)
  - [ ] Ensure `package.json` has "start" script
  - [ ] Ensure `server.js` exports correctly

## GitHub Preparation

- [ ] Repository is public or GitHub integration is authorized
- [ ] All code is pushed to `main` branch
- [ ] `.gitignore` includes `.env` and `node_modules/`
- [ ] `package.json` exists at root level
- [ ] `server.js` exists at root level

## Supabase Setup

- [ ] Supabase project created
- [ ] Database schema imported (run `migration.sql`)
- [ ] Tables created:
  - [ ] `users`
  - [ ] `cases`
  - [ ] `investigator_evaluations`
  - [ ] `tips`
  - [ ] `map_markers`
  - [ ] `properties`
- [ ] Service Role key copied (for backend use)
- [ ] Project URL copied

## OpenAI Setup

- [ ] OpenAI account created
- [ ] API key generated
- [ ] API key saved securely (you'll need it for Render)

## Render Setup

- [ ] Render account created at [render.com](https://render.com)
- [ ] GitHub account connected to Render
- [ ] New Web Service created from repository
- [ ] Build command set to: `npm install`
- [ ] Start command set to: `npm start`
- [ ] Environment variables configured in Render dashboard:
  - [ ] `PORT=3000`
  - [ ] `NODE_ENV=production`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_KEY`
  - [ ] `JWT_SECRET`
  - [ ] `OPENAI_API_KEY`

## Post-Deployment Testing

- [ ] Visit `https://your-service.onrender.com/` → health check works
- [ ] Visit `https://your-service.onrender.com/index.html` → landing page loads
- [ ] Visit `https://your-service.onrender.com/pages/login.html` → login page loads
- [ ] Try login with test user credentials
- [ ] Test API endpoints:
  - [ ] GET `/` → "Eskom Theft Detection API ✔"
  - [ ] POST `/api/test` → "POST WORKING"
  - [ ] GET `/api/cases` (with authentication token) → returns cases
- [ ] Test database connectivity:
  - [ ] Create a new case
  - [ ] Assign investigator
  - [ ] Update case status
- [ ] Test AI chatbot:
  - [ ] Ask for case summary
  - [ ] Request high-risk cases
  - [ ] Try action prompts (if admin)
- [ ] Check browser console for errors
- [ ] Check Render logs for errors

## Frontend Configuration

- [ ] All API URLs use `window.location.origin` or Render URL
- [ ] No hardcoded `localhost:3000` references
- [ ] CORS headers configured properly
- [ ] All static files (CSS, JS, HTML) accessible from backend

## Production Considerations

- [ ] Enable auto-deploy from main branch (optional)
- [ ] Set up monitoring alerts (optional)
- [ ] Configure custom domain (if applicable)
- [ ] Plan for backups:
  - [ ] Enable Supabase backups
  - [ ] Download backup weekly
- [ ] Set up error tracking (optional)
- [ ] Plan for scalability if needed

## Documentation

- [ ] Share Render URL with team
- [ ] Provide login credentials to admins
- [ ] Document how to revert deployment (if needed)
- [ ] Record any custom configurations

## Rollback Plan (If Issues Occur)

- [ ] Have local backup of database
- [ ] Have recent git commit to roll back to
- [ ] Know how to stop/pause Render service
- [ ] Have previous working version saved

---

**Deployment Date:** ______________

**Deployed By:** ______________

**Notes:**
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

Once all items are checked, your application is ready for production!
