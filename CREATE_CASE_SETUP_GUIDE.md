# Create Case Feature — Setup Guide

## Overview
The "Create Case" feature is now fully implemented with:
- ✅ Auto-generated case numbers in "Case 1", "Case 2" format
- ✅ Database-level duplicate prevention via UNIQUE constraint
- ✅ Google Places API address autocomplete
- ✅ Linked property creation
- ✅ Professional, responsive UI

## Implementation Checklist

### 1. **Database Migration** (Required First)
Run these SQL statements in your Supabase SQL Editor to add necessary columns and constraints:

```sql
-- File: migration-case-creation.sql
-- Copy and paste all statements from this file into Supabase SQL Editor
```

**What gets added:**
- `case_number` UNIQUE constraint to prevent duplicates
- `properties_id` array field to link properties to cases
- `latitude` and `longitude` fields for property location data
- Case number format validation check
- Indexes for better performance

**To execute:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents from `migration-case-creation.sql`
3. Paste and run

### 2. **Google Places API Configuration** (Required for Address Autocomplete)

#### Step 1: Get API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create an API Key (Credentials → Create Credentials → API Key)
5. **Important:** Restrict the key to:
   - Application Type: HTTP referrers
   - Website Restrictions: Add your domain(s)
   - API restrictions: Select the 3 APIs above

#### Step 2: Add API Key to Admin Page
Replace the placeholder in `pages/admin.html`:

**Find this line (around line 10):**
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY&libraries=places"></script>
```

**Replace `YOUR_GOOGLE_API_KEY` with your actual key:**
```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD_your_actual_key_here&libraries=places"></script>
```

### 3. **Backend API Endpoints** (Already Implemented)

The following endpoints are ready to use:

#### POST `/api/cases`
Creates a new case
```json
{
  "suspect_name": "John Doe",
  "description": "Theft at substation XYZ",
  "risk_level": "HIGH",
  "outcome": "OPEN"
}
```

#### GET `/api/cases/next-number`
Returns the next case number for preview
```json
{
  "nextCaseNumber": "Case 5"
}
```

#### POST `/api/cases/:caseId/properties`
Creates a property linked to a case
```json
{
  "address": "123 Main Street, Cape Town",
  "additional_details": "Back entrance notes",
  "latitude": -33.9249,
  "longitude": 18.4241
}
```

### 4. **Case Number Generation Logic**

The system automatically:
1. Queries the database for existing case numbers
2. Finds the maximum number
3. Generates the next number
4. Returns format: "Case N" (e.g., "Case 1", "Case 2", "Case 42")

**Database Constraint:** The `case_number` column has a UNIQUE constraint to prevent duplicates at the database level, even with concurrent requests.

**Race Condition Handling:**
- If two admins create cases simultaneously, the database constraint ensures only one "Case X" is created
- If a duplicate is detected, the API returns HTTP 409 with retry instruction
- Frontend retries automatically with a fresh number fetch

### 5. **Address Autocomplete Behavior**

The Google Places integration provides:
- ✅ Real-time search as user types
- ✅ Dropdown list of matching addresses (SA-specific)
- ✅ Selection populates latitude/longitude automatically
- ✅ Formatted address display

**Data Flows:**
1. User types in address field
2. Google Autocomplete Service fetches predictions
3. Filtered to South Africa (`componentRestrictions: { country: 'za' }`)
4. User clicks suggestion
5. Place Details API fetches coordinates
6. Coordinates saved to hidden fields
7. On form submit, all data sent to backend

### 6. **Form Validation**

**Required Fields:**
- Suspect Name ✓
- Description ✓
- Risk Level ✓

**Optional Fields:**
- Property Address (but recommended)
- Additional Property Details

**Risk Level Options:**
- LOW
- MID
- HIGH

### 7. **Testing the Feature**

#### Test Case 1: Create Basic Case (No Property)
1. Navigate to Admin Page
2. Click "Create Case" button
3. Fill: Suspect Name, Description, Risk Level
4. Click "Create Case"
5. Verify case created in database

#### Test Case 2: Create Case with Address
1. Navigate to Admin Page
2. Click "Create Case" button
3. Fill all case fields
4. Type address (e.g., "123 Main St, Cape Town")
5. Select from dropdown
6. Verify latitude/longitude populated (check browser console)
7. Submit
8. Verify case + property created

#### Test Case 3: Duplicate Prevention
1. Create Case 1
2. Immediately create another case (simulate concurrent creation)
3. Verify database only has "Case 1" and "Case 2" (no duplicates)
4. Check server logs for any 409 errors

#### Test Case 4: Case Number Sequencing
1. Create Case A → should be "Case 1"
2. Create Case B → should be "Case 2"
3. Create Case C → should be "Case 3"
4. Verify sequence is unbroken in database

### 8. **Professional UI Features**

**Modal Design:**
- Clean, modern card layout
- Prominent "Auto-generated Case Number" preview
- Clear section headers (Case Details, Property Information)
- Semantic HTML and accessibility

**Loading States:**
- Button shows "⏳ Creating..." during submission
- Status messages show on success/error
- Auto-dismisses after success

**Error Handling:**
- Validates all required fields
- Shows clear error messages
- Handles API errors gracefully
- Suggests retry on race condition errors

**Responsive Design:**
- Works on mobile (modal scales to 95vw)
- Touch-friendly inputs
- Readable on all screen sizes

### 9. **Security Considerations**

✅ **Authentication:** All endpoints require valid JWT token
✅ **Authorization:** Only admin/commander can create cases
✅ **Input Validation:** Backend validates all fields
✅ **Database Constraints:** UNIQUE constraint prevents duplicates
✅ **Google Places:** API key restricted to your domain(s)

### 10. **Troubleshooting**

| Issue | Solution |
|-------|----------|
| Address dropdown not showing | Check Google API key is valid and Places API enabled |
| "Case number already exists" error | Retry the form (should succeed with next number) |
| Cases not saving to database | Verify JWT token is valid and migration SQL ran |
| Coordinates not populating | Check browser console for Google API errors |
| Form not submitting | Ensure all required fields filled (Suspect, Description, Risk Level) |

### 11. **Next Steps**

1. ✅ Run migration SQL
2. ✅ Add Google API key to admin.html
3. ✅ Test the feature thoroughly
4. ✅ Train admins on the new feature
5. Future: Add case edit/update functionality
6. Future: Add property linking to existing cases

### 12. **File Changes Summary**

| File | Changes |
|------|---------|
| `server.js` | New case number generation, GET /api/cases/next-number, improved POST /api/cases |
| `pages/admin.html` | New "Create Case" modal, Google Places integration, comprehensive JavaScript |
| `migration-case-creation.sql` | Database schema updates (run in Supabase) |

---

## Key Features Implemented

### ✨ Case Number Generation
- Format: "Case 1", "Case 2", "Case N"
- Auto-increments based on latest in database
- Previewed to user before submission
- UNIQUE constraint prevents duplicates

### 🗺️ Address Autocomplete
- Google Places integration
- South Africa-focused search
- Real-time dropdown suggestions
- Automatic coordinate capture

### 📝 Form Validation
- Client-side: Checks required fields
- Server-side: Validates risk levels, outcomes
- Database-side: Enforces constraints

### 🔒 Race Condition Handling
- Database UNIQUE constraint
- HTTP 409 response on duplicate
- Client-side automatic retry
- User-friendly error messages

### 🎨 Professional UI
- Modern modal design
- Loading states
- Success/error notifications
- Fully responsive
- Accessibility-friendly

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the browser console for errors
3. Check server logs: `node server.js`
4. Verify database constraints: `SELECT * FROM cases LIMIT 1;`

---

**Status:** ✅ Implementation Complete  
**Last Updated:** 2026-05-22  
**Version:** 1.0.0
