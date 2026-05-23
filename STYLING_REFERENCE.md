# 🎨 Dashboard Styling Reference Guide

## Color Systems

### Admin Dashboard Color Palette

```css
/* Primary Colors */
--admin-primary: #1e3a8a;      /* Deep Blue - Authority */
--admin-primary-light: #3b82f6; /* Bright Blue - Accent */
--admin-primary-dark: #1e40af;  /* Darker Blue - Depth */

/* Status Colors */
--status-high: #dc2626;         /* Red - High Risk/Urgent */
--status-mid: #f97316;          /* Orange - Medium Priority */
--status-low: #10b981;          /* Green - Low Risk/Safe */

/* UI Colors */
--bg-light: #f8fafc;            /* Very Light Blue-Gray Background */
--bg-white: #ffffff;            /* Pure White */
--border: #e2e8f0;              /* Light Blue-Gray Border */
--border-dark: #cbd5e1;         /* Darker Border on Hover */

/* Text Colors */
--text-primary: #0f172a;        /* Very Dark Blue */
--text-secondary: #64748b;      /* Medium Gray */
--text-tertiary: #9ca3af;       /* Light Gray */

/* Shadow Colors */
--shadow-sm: rgba(0, 0, 0, 0.05);
--shadow-md: rgba(0, 0, 0, 0.08);
--shadow-lg: rgba(59, 130, 246, 0.15);
```

### User Dashboard Color Palette

```css
/* Primary Colors */
--user-primary: #065f46;        /* Dark Green - Trust */
--user-primary-light: #059669;  /* Teal Green - Accent */
--user-primary-bright: #10b981; /* Bright Green - CTA */

/* Secondary Colors */
--user-secondary: #0369a1;      /* Blue - Information */
--user-info: #dbeafe;           /* Light Blue */

/* Status Colors */
--status-pending: #fef3c7;      /* Light Yellow - Pending */
--status-assigned: #bfdbfe;     /* Light Blue - Assigned */
--status-progress: #fed7aa;     /* Light Orange - In Progress */
--status-resolved: #d1fae5;     /* Light Green - Resolved */

/* UI Colors */
--bg-light: #f0fdf4;            /* Very Light Green Background */
--bg-white: #ffffff;            /* Pure White */
--border: #d1fae5;              /* Light Green Border */
--border-dark: #10b981;         /* Green on Hover */

/* Text Colors */
--text-primary: #065f46;        /* Dark Green */
--text-secondary: #6b7280;      /* Medium Gray */
--text-tertiary: #9ca3af;       /* Light Gray */

/* Shadow Colors */
--shadow-sm: rgba(0, 0, 0, 0.04);
--shadow-md: rgba(16, 185, 129, 0.1);
--shadow-lg: rgba(5, 150, 105, 0.15);
```

---

## Typography Specifications

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Hierarchy

#### Headings
```css
h1 {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

h3 {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0;
}

h4 {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
}
```

#### Body Text
```css
p {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0;
}

small, .text-sm {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
}

.text-xs {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
}

.text-tiny {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

---

## Component Styles

### Cards

#### Admin Dashboard Card
```css
.card {
  background: white;
  padding: 20px;
  border-radius: 14px;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
```

#### Stat Card
```css
.stat-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  padding: 20px;
  border-radius: 14px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: #cbd5e1;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
```

### Buttons

#### Primary Button (Admin)
```css
.btn-primary {
  padding: 12px 20px;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(30, 58, 138, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}
```

#### Secondary Button (Admin)
```css
.btn-secondary {
  padding: 12px 20px;
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #eff6ff;
  transform: translateY(-1px);
}
```

#### Primary Button (User)
```css
.btn-primary-user {
  padding: 12px 20px;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
  transition: all 0.3s;
}

.btn-primary-user:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(5, 150, 105, 0.35);
}
```

### Badges

#### Risk Level Badge
```css
.badge-high {
  background: #fee2e2;
  color: #b91c1c;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-mid {
  background: #fef3c7;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.badge-low {
  background: #dcfce7;
  color: #15803d;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}
```

#### Status Badge (User)
```css
.status-pending {
  background: #fef3c7;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-assigned {
  background: #bfdbfe;
  color: #1e40af;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.status-progress {
  background: #fed7aa;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.status-resolved {
  background: #d1fae5;
  color: #065f46;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}
```

### Input Fields

```css
input, select {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  transition: all 0.3s;
}

input:focus, select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}
```

---

## Spacing System

```css
/* Base Unit: 4px */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

---

## Shadow System

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.08);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);

/* Admin Dashboard Specific */
--shadow-admin: 0 10px 30px rgba(30, 58, 138, 0.2);

/* User Dashboard Specific */
--shadow-user: 0 10px 30px rgba(0, 0, 0, 0.1);
```

---

## Border Radius Scale

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-xl: 14px;
--radius-full: 50%;
```

---

## Responsive Breakpoints

```css
/* Desktop */
@media (min-width: 1024px) {
  /* Full layouts, all columns visible */
}

/* Tablet */
@media (max-width: 1023px) and (min-width: 768px) {
  /* 2-column layouts */
  /* Sidebar width: 240px */
  /* Adjusted grid: 2 columns */
}

/* Mobile */
@media (max-width: 767px) {
  /* 1-column layouts */
  /* Horizontal topbar sidebar */
  /* Touch-friendly spacing */
  /* Full-width components */
}

/* Small Mobile */
@media (max-width: 480px) {
  /* Extra compact */
  /* Minimal padding */
  /* Single column everywhere */
  /* Stack buttons vertically */
}
```

---

## Transition & Animation

```css
/* Standard Transition */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Fast Interaction */
transition: all 0.2s ease-out;

/* Smooth Fade */
transition: opacity 0.3s ease-in-out;

/* Progress Bar Animation */
transition: width 0.4s ease-out;

/* Hover Effects */
transform: translateY(-2px);
transform: translateX(4px);
transform: scale(1.02);
```

---

## Accessibility Considerations

### Color Contrast
- Body text on white: 18:1 (AAA)
- Buttons: 7:1+ (AA)
- Border emphasis: 7:1+ (AA)

### Focus States
```css
:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Alternative for custom components */
box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
```

### Font Sizing for Readability
- Minimum body font: 13px
- Line height: 1.5-1.6 for body text
- Letter spacing: Normal to -0.02em for headers

---

## Grid System

### Admin Dashboard Grid
```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Responsive */
@media (min-width: 1024px) {
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 768px) {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 480px) {
  grid-template-columns: 1fr;
}
```

### User Dashboard Grid
```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

/* Responsive */
@media (max-width: 1024px) {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

---

## Implementation Examples

### Create a Custom Card Component
```css
.custom-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.1);
  transform: translateY(-4px);
}
```

### Create a Status Indicator
```css
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-indicator.active { background: #d1fae5; color: #065f46; }
.status-indicator.pending { background: #fef3c7; color: #92400e; }
.status-indicator.error { background: #fee2e2; color: #991b1b; }
```

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
