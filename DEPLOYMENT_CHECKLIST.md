# 🚀 Quick Deployment Checklist

**Time to Deploy: ~15 minutes**

---

## ✅ Pre-Deployment (5 min)

- [ ] Read `FEATURE_SUMMARY.md` (optional but recommended)
- [ ] Prepare Google Cloud Console for API key
- [ ] Have Supabase SQL Editor open
- [ ] Back up your database (recommended)

---

## ✅ Step 1: Database Migration (2 min)

**File:** `migration-case-creation.sql`

1. Open Supabase Dashboard
2. Click **SQL Editor** → **+ New Query**
3. Copy ALL contents from `migration-case-creation.sql`
4. Paste into editor
5. Click **▶ Execute**
6. Wait for: `Query executed successfully`

**Verify Success:**
```
Check: Supabase should show no errors
Look for: "Query executed successfully" message
```

---

## ✅ Step 2: Google API Configuration (5 min)

**File to Update:** `pages/admin.html` (around line 10)

### Get API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable APIs:
   - ✅ Maps JavaScript API
   - ✅ Places API  
   - ✅ Geocoding API
4. Create API Key (Credentials → Create Credentials → API Key)
5. Restrict to your domain (important for security)

### Add to Code
Find this line in admin.html (approximately line 10):
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY&libraries=places"></script>
```

Replace `YOUR_GOOGLE_API_KEY` with your actual key from Google Cloud Console.

**Example:**
```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD_example_key_abc123&libraries=places"></script>
```

---

## ✅ Step 3: Test the Feature (3 min)

1. Refresh admin page (clear cache with Ctrl+Shift+Delete if needed)
2. Click the new green **"Create Case"** button
3. You should see:
   - [ ] Modal form appears
   - [ ] Case number preview shown (e.g., "Case 1")
   - [ ] Address field has autocomplete
4. Fill test form:
   - Suspect Name: "Test Person"
   - Description: "Test case for verification"
   - Risk Level: "HIGH"
   - Address: Type "cape town" and select from suggestions
5. Click **"Create Case"**
6. You should see: ✅ Success message
7. Check database:
   - [ ] New case appears in `cases` table
   - [ ] Case number is "Case 1"
   - [ ] Property saved (if address added)

---

## ✅ Step 4: Verify All Works (5 min)

### Test Case Creation
```
Try to create 2 cases rapidly
Expected: Case 1, then Case 2 (no duplicates)
If problem: Check server logs
```

### Test Address Autocomplete  
```
Type "123 main" in address field
Expected: Dropdown with suggestions appears
If problem: Check Google API key is correct
```

### Test Error Handling
```
Try submitting empty form
Expected: "Suspect name is required" message
If problem: Check browser console (F12)
```

### Test Case Numbers
```
Create Case A → should be "Case X"
Create Case B → should be "Case X+1"
Expected: Sequential with no gaps
If problem: Check migration SQL ran
```

---

## ⚠️ Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Address dropdown not appearing | Verify Google API key is correct and Places API is enabled |
| "case_number column does not exist" error | Run migration SQL in Supabase |
| Case number is still "CASE-0001" format | Clear browser cache (Ctrl+Shift+Delete) and refresh |
| Getting permission denied error | Verify you're admin role |
| Form won't submit | Check all required fields are filled |
| Coordinates not saving | Check Google API key and Places API status |

---

## 📋 Deployment Sign-Off

**Pre-Deployment**
- [ ] Database backup complete
- [ ] Google API key ready
- [ ] Team notified of changes

**Deployment**
- [ ] Database migration executed
- [ ] Google API key added to admin.html
- [ ] Admin page tested locally

**Post-Deployment**
- [ ] Feature works in test environment
- [ ] Case numbers format correct
- [ ] Address autocomplete functional
- [ ] Error messages working
- [ ] Team trained on feature

---

## 📞 If You Need Help

**For SQL errors:**
- Check Supabase SQL Editor for error message
- Verify table names are correct
- Try running individual statements

**For JavaScript errors:**
- Open browser console (F12)
- Look for red error messages
- Check Google API key validity

**For API errors:**
- Check server is running (Node.js)
- Verify JWT token is valid
- Check database connection

---

## ✅ You're Done! 🎉

The Create Case feature is now live in your admin dashboard.

### What's Available Now:
- ✅ Create Case button in admin panel
- ✅ Modal form with case and property fields
- ✅ Auto-generated case numbers (Case 1, Case 2, etc.)
- ✅ Google Places address autocomplete
- ✅ Professional, responsive UI
- ✅ Full database integration

### Next Steps:
1. Train admins/commanders on the feature
2. Share `CREATE_CASE_QUICK_REFERENCE.md` with users
3. Monitor error logs for first week
4. Gather user feedback

---

## 📚 Quick Reference

**Key Files:**
- Code: `server.js`, `pages/admin.html`
- Database: `migration-case-creation.sql`
- Docs: `CREATE_CASE_SETUP_GUIDE.md`
- User Guide: `CREATE_CASE_QUICK_REFERENCE.md`

**Key Endpoints:**
- `GET /api/cases/next-number` - Get next case number
- `POST /api/cases` - Create case
- `POST /api/cases/:caseId/properties` - Add property to case

**Key Features:**
- Case number: Auto-generated, unique, "Case N" format
- Address: Google Places autocomplete
- Coordinates: Auto-captured from Google
- Validation: 3-layer (client, server, database)

---

**Status:** ✅ Ready to Deploy  
**Version:** 1.0.0  
**Last Updated:** 2026-05-22

**Estimated Setup Time:** 15 minutes  
**Estimated Learning Time:** 5 minutes
