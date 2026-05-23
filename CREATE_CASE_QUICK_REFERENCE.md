# Create Case Feature — Quick Reference

## 🚀 Quick Start

### 1. **Open Admin Dashboard**
   - Click "User Management" in sidebar
   - Look for the green "Create Case" button

### 2. **Click "Create Case"**
   - A modal form appears with all required fields
   - Case number is shown automatically at the top

### 3. **Fill in Case Details**
   - **Suspect Name** (required): Full name of person suspected
   - **Description** (required): Detailed case information
   - **Risk Level** (required): Choose LOW, MID, or HIGH

### 4. **Add Property (Optional but Recommended)**
   - Start typing the address in the "Property Address" field
   - Real-time suggestions appear as dropdown
   - Click to select an address
   - Coordinates auto-populate (you won't see them, but they're there)
   - Add any additional property details if needed

### 5. **Click "Create Case"**
   - Form validates all required fields
   - Case and property save to database
   - Success message shows
   - Modal closes automatically

---

## 📋 What Gets Saved

### Case Information
- ✅ Unique case number (auto-generated: "Case 1", "Case 2", etc.)
- ✅ Suspect name
- ✅ Full description
- ✅ Risk level (HIGH/MID/LOW)
- ✅ Status: Always starts as OPEN
- ✅ Creator: Logged-in admin
- ✅ Created date: Current timestamp

### Property Information (If Address Provided)
- ✅ Address (formatted from Google)
- ✅ Coordinates (latitude/longitude)
- ✅ Additional details (notes)
- ✅ Link to case

---

## ✨ Key Features

### Auto-Generated Case Numbers
- System automatically creates "Case 1", "Case 2", etc.
- **You cannot manually edit the case number**
- Preview shows what number will be created
- Prevents duplicate case numbers

### Google Places Address Search
- Type any address and get real-world suggestions
- Works like Google Maps search
- South Africa-focused
- Autocompletes with coordinates

### Error Prevention
- Form won't submit without required fields
- If something goes wrong, friendly error message appears
- Can retry immediately

### Professional Design
- Clean, modern interface
- Responsive (works on phone, tablet, desktop)
- Loading animation while saving
- Clear confirmation messages

---

## 🎯 Use Cases

### Scenario 1: Create Case with No Property Yet
1. Click "Create Case"
2. Fill suspect, description, risk level
3. Leave address field empty
4. Submit
5. ✅ Case created (property can be linked later)

### Scenario 2: Create Case with Known Location
1. Click "Create Case"
2. Fill all case fields
3. Type "123 Main Street, Cape Town" in address field
4. Click suggestion from dropdown
5. Add any notes about the property
6. Submit
7. ✅ Case AND property created

### Scenario 3: Bulk Case Creation
1. Create Case 1 → "Case 1" appears
2. Create Case 2 → "Case 2" appears
3. System prevents "Case 1" duplicate
4. All sequential with no gaps

---

## ⚠️ Important Notes

### Case Number Format
```
✅ Correct:  Case 1, Case 2, Case 10, Case 99
❌ Wrong:    CASE-0001, case1, Case01
```

### Required Fields
- **Suspect Name**: Cannot be empty
- **Description**: Must have details
- **Risk Level**: Must select one

### Cannot Be Changed After Creation
- Case Number: Permanent, auto-generated
- Risk Level: Can be updated later in Case Detail page

### Addresses
- Must select from Google suggestions
- Free-typing may not work for address autocomplete
- If address not found, leave empty and add later

---

## 🔍 Where to Find Your Cases

After creating a case:
- **Case List**: Navigate to "Case List" page
- **Case Detail**: Click case to see full details
- **Map View**: Shows property location on map (if address added)
- **Case Number**: Always visible (e.g., "Case 5")

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Address dropdown not appearing | Check your internet connection, or skip address for now |
| Form won't submit | Make sure Suspect Name, Description, and Risk Level are all filled |
| Can't find my address in suggestions | Try shorter search, or just type the street address |
| Getting an error message | Read the error text, fix the issue shown, and try again |
| Case didn't save | Check your internet, or refresh the page and try again |

---

## 💡 Tips

1. **Always fill in suspect name** - even if just initials or description
2. **Be detailed in description** - helps investigators understand case
3. **Set correct risk level** - affects case prioritization
4. **Add address if known** - enables mapping and location analysis
5. **Check case number preview** - confirms what will be created

---

## 🔐 Security

- Only admins and commanders can create cases
- Your identity is recorded (who created it)
- Case numbers prevent fraud/duplicates
- Addresses come from trusted Google Maps data

---

**Need help?** Check the detailed setup guide or ask your system administrator.

**Last Updated:** 2026-05-22
