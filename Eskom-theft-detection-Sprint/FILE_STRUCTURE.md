# 📂 Complete File Structure & Directory Guide

## Project Root Structure

```
Eskom-theft-detection-mobile-field-app/
│
├── 📄 README.md                          [Project overview]
├── 📄 migration.sql                       [Database migrations]
├── 📄 package.json                        [Dependencies]
├── 📄 server.js                           [Backend server]
│
├── ✨ DASHBOARD_DESIGN.md                 [NEW: Design guide]
├── ✨ STYLING_REFERENCE.md                [NEW: CSS reference]
├── ✨ IMPLEMENTATION_SUMMARY.md           [NEW: Project summary]
├── ✨ BEFORE_AFTER.md                     [NEW: Comparison]
├── ✨ QUICK_START.md                      [NEW: Testing guide]
├── ✨ DELIVERY_CHECKLIST.md               [NEW: Verification]
│
└── 📁 Directory Structure...
```

---

## 📁 Frontend Directory Structure

### **pages/ Directory**

```
pages/
│
├── ✨ login.html
│   └── Beautiful purple gradient login interface
│       - Hero section on left
│       - Login form on right
│       - Feature highlights
│       - Demo credentials
│       - Responsive design
│       ⬇️ Connects to: js/auth.js
│
├── ✏️ dashboard.html (UPDATED)
│   └── Admin/Commander/Investigator Dashboard
│       - Blue gradient topbar
│       - 280px sidebar with navigation
│       - Alert banner (role-specific)
│       - 4-6 stat cards
│       - Recent cases section
│       - Team performance (admin/commander only)
│       - Quick actions (admin only)
│       ⬇️ Connects to: js/dashboard.js
│
├── ✨ user-dashboard.html (NEW)
│   └── Community Reporter Dashboard
│       - Green gradient topbar
│       - Welcome section
│       - 4 stat cards
│       - My Recent Reports
│       - How It Works guide
│       - FAQ section
│       ⬇️ Uses inline JavaScript for mock data
│
├── caseList.html
│   └── Cases list view
│
├── map.html
│   └── Google Maps integration
│
├── report.html
│   └── Report generation
│
├── record.html
│   └── Investigator field recording
│
├── assign.html
│   └── Case assignment interface
│
├── evaluations.html
│   └── Investigator performance evaluations
│
<!-- commander.html removed — consolidated into dashboard.html -->
│
├── admin.html
│   └── User management
│
└── resolved.html
    └── Resolved cases view
```

### **css/ Directory**

```
css/
│
├── ✏️ dashboard.css (UPDATED - EXPANDED)
│   └── Complete styling for:
│       - Admin Dashboard (Blue theme)
│       - User Dashboard (Green theme)
│       - All components
│       - All breakpoints
│       ├── CSS Variables & Colors
│       ├── Layout & Sidebar
│       ├── Topbar & Topbar Styles
│       ├── Cards & Components
│       ├── Responsive Breakpoints
│       │   - Desktop (1024px+)
│       │   - Tablet (768-1023px)
│       │   - Mobile (480-767px)
│       │   - Extra Small (<480px)
│       └── Animations & Transitions
│
├── style.css
│   └── Base styles
│
├── assign.css
├── caseList.css
├── report.css
├── resolved.css
└── [other stylesheets]
```

### **js/ Directory**

```
js/
│
├── ✏️ auth.js (UPDATED)
│   └── Authentication & role routing
│       ├── Login form handler
│       ├── Role selection validation
│       ├── API call to /auth/login
│       ├── Token storage (localStorage)
│       ├── Role storage (localStorage)
│       └── Role-based redirection:
│           - user → user-dashboard.html
│           - investigator → dashboard.html
│           - commander → dashboard.html
│           - admin → dashboard.html
│
├── ✏️ dashboard.js (UPDATED - EXPANDED)
│   └── Dashboard initialization & data
│       ├── Role-based sidebar rendering
│       ├── Role info configuration
│       ├── Statistics loading (with mock fallback)
│       │   - Total cases: 47
│       │   - High risk: 12
│       │   - In progress: 24
│       │   - Resolved: 23
│       ├── Case list rendering
│       │   - 5 realistic sample cases
│       │   - CS-2024-0847 through 0843
│       │   - Mock data fallback system
│       ├── Team performance rendering
│       │   - 4 investigator profiles
│       │   - Performance metrics
│       │   - Resolution rates (75-100%)
│       ├── Alert banner rendering
│       │   - Admin: High-risk alert
│       │   - Commander: Assignment alert
│       │   - Investigator: My cases alert
│       └── DOM initialization
│
├── main.js
├── cases.js
├── commander.js
├── evaluations.js
├── map.js
├── record.js
├── report.js
└── [other scripts]
```

---

## 📚 Documentation Structure

### **Documentation Files Created**

```
Documentation/
│
├── ✨ DASHBOARD_DESIGN.md (300+ lines)
│   ├── Project Overview
│   ├── Dashboard Comparison
│   ├── Design Principles
│   ├── Color Palette Reference
│   ├── Layout Structure
│   ├── Role-Based Redirection Flow
│   ├── Mock Data Structure
│   ├── Authentication Integration
│   ├── Key Features Breakdown
│   ├── Getting Started
│   ├── Responsive Breakpoints
│   ├── Typography Specifications
│   └── Quality Checklist
│
├── ✨ STYLING_REFERENCE.md (500+ lines)
│   ├── Color Systems
│   │   - Admin palette
│   │   - User palette
│   ├── Typography Specifications
│   │   - Font stack
│   │   - Type hierarchy
│   ├── Component Styles
│   │   - Cards
│   │   - Buttons
│   │   - Badges
│   │   - Input fields
│   ├── Spacing System
│   ├── Shadow System
│   ├── Border Radius Scale
│   ├── Responsive Breakpoints
│   ├── Transitions & Animations
│   ├── Accessibility Guidelines
│   ├── Grid System
│   └── Implementation Examples
│
├── ✨ IMPLEMENTATION_SUMMARY.md (400+ lines)
│   ├── Project Status
│   ├── Files Delivered
│   ├── Dashboard Details
│   ├── Role Hierarchy
│   ├── Mock Data
│   ├── Color Schemes
│   ├── Authentication Flow
│   ├── How to Test
│   ├── File Structure
│   ├── Quality Checklist
│   ├── Next Steps
│   └── Support Info
│
├── ✨ BEFORE_AFTER.md (400+ lines)
│   ├── Design Transformation
│   ├── Component Improvements
│   ├── Visual Enhancements
│   ├── Responsive Design Improvements
│   ├── Code Quality Improvements
│   ├── User Satisfaction Metrics
│   └── Implementation Statistics
│
├── ✨ QUICK_START.md (350+ lines)
│   ├── Get Started in 5 Minutes
│   ├── Test Each Dashboard
│   ├── Test Responsive Design
│   ├── Visual Features Guide
│   ├── Debug Checklist
│   ├── What to Test
│   ├── Performance Checks
│   ├── Screenshot Guide
│   ├── Common Issues & Solutions
│   ├── Success Indicators
│   └── Troubleshooting
│
└── ✨ DELIVERY_CHECKLIST.md (500+ lines)
    ├── Deliverables Summary
    ├── Design Specifications
    ├── Authentication & Routing
    ├── Responsive Design
    ├── Visual Quality
    ├── Mock Data
    ├── Features Implemented
    ├── Documentation Provided
    ├── Quality Assurance
    ├── Success Metrics
    ├── Technical Stack
    ├── Deployment Ready
    ├── Project Statistics
    └── Final Notes
```

---

## 🎯 File Dependencies & Connections

### **Login Flow**

```
login.html
    ↓
    ├── Loads: css/style.css
    ├── Loads: Google Fonts
    │
    └── User enters credentials + role
        ↓
        └── js/auth.js
            ├── Form submission handler
            ├── Email validation
            ├── Role selection validation
            │
            ├── POST to /api/auth/login
            │   ├── Returns: { token, role }
            │   └── Stores in localStorage
            │
            └── Redirect based on role:
                ├── user → pages/user-dashboard.html
                ├── admin → pages/dashboard.html
                ├── commander → pages/dashboard.html
                └── investigator → pages/dashboard.html
```

### **Admin Dashboard Flow**

```
pages/dashboard.html
    ├── Loads: css/dashboard.css
    ├── Loads: Google Fonts
    ├── Loads: lucide icons
    │
    └── DOMContentLoaded event
        └── js/dashboard.js
            ├── Check token (localStorage)
            ├── Get userRole (localStorage)
            │
            ├── buildSidebar()
            │   └── Filter navigation by role
            │
            ├── setRoleInfo()
            │   ├── Set topbar title
            │   ├── Set role badge
            │   └── Hide restricted sections
            │
            ├── loadAlertBanner()
            │   └── Render role-specific alert
            │
            ├── loadStats()
            │   ├── Attempt API call
            │   └── Fallback to mock data
            │
            ├── loadCases()
            │   ├── Attempt API call
            │   └── Render 5 mock cases
            │
            └── loadTeamPerformance()
                ├── Only for admin/commander
                ├── Attempt API call
                └── Render 4 investigator profiles
```

### **Community Dashboard Flow**

```
pages/user-dashboard.html
    ├── Loads: inline CSS (in <style> tag)
    ├── Loads: Google Fonts
    │
    └── DOMContentLoaded event
        └── Inline JavaScript
            ├── Check token (localStorage)
            ├── Load mock statistics
            ├── Render mock cases
            └── Display UI elements
```

---

## 🔐 Data Flow Architecture

### **Authentication Data**

```
User Credentials
    ↓
login.html (form)
    ↓
auth.js (validation)
    ↓
Backend API (authentication)
    ↓
Response: { token, role }
    ↓
localStorage
    ├── token (for API authorization)
    └── userRole (for content filtering)
    ↓
Dashboard initialization
    └── Role-specific content rendering
```

### **Dashboard Data**

```
Dashboard Initialization
    ↓
js/dashboard.js
    ├── Try: Fetch from API
    │   └── /api/dashboard/stats
    │   └── /api/cases
    │   └── /api/commander/stats
    │
    └── Catch: Use Mock Data
        ├── 47 total cases
        ├── 5 sample cases
        ├── 4 investigator profiles
        └── System statistics
    ↓
Render to DOM
    ├── Update stat cards
    ├── Populate case list
    ├── Display team performance
    └── Show alert banner
```

---

## 📊 Component Map

### **Shared Components** (Both Dashboards)

```
├── Sidebar
│   ├── Logo
│   ├── Navigation Menu (role-filtered)
│   └── Role Badge + Logout

├── Topbar
│   ├── Title & Subtitle
│   └── Role Badge

├── Stat Cards
│   ├── Icon
│   ├── Label
│   ├── Number
│   └── Description

└── Case Card
    ├── Case Reference
    ├── Status Badges
    ├── Description
    ├── Investigator
    └── View Button
```

### **Admin Dashboard Only**

```
├── Alert Banner
│   ├── Icon
│   ├── Title
│   └── Description

├── Team Performance
│   ├── Investigator Name
│   ├── Avatar
│   ├── Performance Metrics
│   └── Progress Bar

└── Quick Actions
    ├── User Management
    ├── Assign Cases
    └── Evaluations
```

### **User Dashboard Only**

```
├── Welcome Section
│   ├── Headline
│   ├── Description
│   └── CTA Buttons

├── How It Works
│   ├── Step 1: Submit
│   ├── Step 2: Assign
│   ├── Step 3: Investigate
│   └── Step 4: Resolve

└── FAQ Section
    ├── Expandable Question 1
    ├── Expandable Question 2
    ├── Expandable Question 3
    └── Expandable Question 4
```

---

## 🎨 Styling Organization

### **CSS File Structure**

```
dashboard.css

1. Reset & Defaults
   ├── * { margin: 0; padding: 0; }
   └── body { font-family: Inter; }

2. Layout
   ├── .layout { display: flex; }
   ├── .main { flex: 1; }
   └── .sidebar { width: 280px; }

3. Sidebar Styling
   ├── .logo
   ├── .menu
   ├── .role-box
   └── .logout

4. Main Content
   ├── .topbar
   ├── .cards
   ├── .content
   └── .section

5. Components
   ├── .card
   ├── .stat-card
   ├── .stat-icon
   ├── .stat-content
   ├── .case
   ├── .team
   ├── .member
   └── .badge

6. Colors
   ├── .blue, .red, .green, .orange
   └── .high, .mid, .low, .open, .assigned, .resolved

7. Animations
   ├── Hover effects
   ├── Transitions
   └── Transforms

8. Responsive
   ├── @media (max-width: 1024px)
   ├── @media (max-width: 768px)
   └── @media (max-width: 480px)
```

---

## 🔗 API Integration Points

### **Endpoints Used** (When backend connects)

```
Dashboard.js API Calls:

GET /api/dashboard/stats
    ├── Returns statistics
    ├── totalCases
    ├── byRisk { HIGH, MID, LOW }
    └── byOutcome { OPEN, RESOLVED }

GET /api/cases
    ├── Returns case array
    ├── case_number
    ├── suspect_name
    ├── risk_level
    ├── outcome
    ├── description
    └── investigators { full_name, email }

GET /api/commander/stats
    ├── Returns team data
    └── investigatorPerformance []
        ├── full_name
        ├── email
        ├── assigned (count)
        └── resolved (count)

POST /api/auth/login (from auth.js)
    ├── Request { email, password, role }
    └── Response { token, role }
```

### **Fallback System**

```
If API fails → Use Mock Data

Mock Cases:
├── CS-2024-0847 (HIGH)
├── CS-2024-0846 (MID)
├── CS-2024-0845 (HIGH)
├── CS-2024-0844 (LOW)
└── CS-2024-0843 (MID)

Mock Team:
├── John Mthembu (75%)
├── Sarah Khumalo (83%)
├── Thabo Ndlela (100%)
└── Lesego Mkhize (78%)

Mock Stats:
├── Total: 47
├── High: 12
├── Open: 24
└── Resolved: 23
```

---

## 📱 Responsive Breakpoint System

### **CSS Media Queries**

```
/* Desktop First Approach */

Base: 1024px+
    ├── .sidebar { width: 280px; }
    ├── .cards { grid-template-columns: repeat(4, 1fr); }
    └── .topbar { display: flex; justify-content: space-between; }

Tablet: 768px - 1023px
    ├── .sidebar { width: 240px; }
    ├── .cards { grid-template-columns: repeat(2, 1fr); }
    └── .content { grid-template-columns: 1fr; }

Mobile: 480px - 767px
    ├── .layout { flex-direction: column; }
    ├── .sidebar { width: 100%; height: auto; }
    ├── .menu { display: flex; gap: 8px; }
    └── .cards { grid-template-columns: 1fr; }

Extra Small: <480px
    ├── .menu a { flex-wrap: wrap; }
    ├── .card { padding: 12px; }
    ├── Button stacking (vertical)
    └── Minimal padding everywhere
```

---

## ✨ Summary

### **File Locations Quick Reference**

| Purpose | File | Type |
|---------|------|------|
| Login Interface | `pages/login.html` | HTML |
| Admin Dashboard | `pages/dashboard.html` | HTML |
| User Dashboard | `pages/user-dashboard.html` | HTML |
| Styling | `css/dashboard.css` | CSS |
| Authentication | `js/auth.js` | JavaScript |
| Dashboard Logic | `js/dashboard.js` | JavaScript |
| Design Guide | `DASHBOARD_DESIGN.md` | Markdown |
| CSS Reference | `STYLING_REFERENCE.md` | Markdown |
| Testing Guide | `QUICK_START.md` | Markdown |
| Project Summary | `IMPLEMENTATION_SUMMARY.md` | Markdown |
| Before/After | `BEFORE_AFTER.md` | Markdown |
| Delivery Checklist | `DELIVERY_CHECKLIST.md` | Markdown |

---

**Complete file structure documented and organized!** 📂✅
