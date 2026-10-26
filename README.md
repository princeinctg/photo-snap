# Photo Studio OS — Ultimate Free Edition
> Modern Photography CRM & Studio Operating System inspired by PhotoSnap BD. 100% free, fully customizable, self-hostable with zero subscription locks or artificial upgrade paywalls.

![Next.js](https://img.shields.io/badge/Next.js-14.2_App_Router-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_&_Mongoose-47A248?style=for-the-badge&logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🌟 Executive Overview

**Photo Studio OS** is an enterprise-grade Operating System built for wedding, fashion, portrait, and commercial photography studios. It unifies client relationships, photoshoot scheduling, conflict detection, itemized invoicing, cash-basis accounting, interactive financial charts, digital deliverables galleries, and complete studio branding customization.

**Key Guarantee:** Every feature in this platform is 100% accessible without artificial tier locks, subscription gates, or fake upgrade popups.

---

## 🚀 Key Modules & Architecture

### 1. Financial Dashboard & Analytics
- **Live Database KPIs:** Total Recognized Revenue, Total Expenditures, Net Operating Profit, Outstanding Accounts Receivable, Active Bookings, and Client Count.
- **Interactive Recharts Visualizations:**
  - Monthly Income vs. Expenses Bar Chart
  - Net Profit Growth Trend Area Chart
  - Expense Category Donut Breakdown
  - Monthly Cash-Flow Velocity Chart
- **Dynamic Date Filters:** Today, This Week, This Month, This Year, All Time, or Custom Range.
- **Recent Activity Feed:** Real-time stream of incoming payments and outgoing vendor expenses.

### 2. Client CRM & Activity Timeline
- Complete client CRUD with profile photo, phone, email, venue address, and custom shoot preferences.
- Automated financial roll-up: Total Billed, Total Paid, and Outstanding Balance Due.
- Client details page featuring an activity timeline: linked bookings, billed invoices, and verified payment receipts.
- Single-click CSV export of client databases.

### 3. Bookings & Photoshoot Management
- **Dual Mode View:** Interactive Monthly Calendar View and Searchable Filterable List View.
- **Scheduling Conflict Warnings:** Automatically detects and alerts when another shoot shares the same date, venue, or assigned photographer.
- Link shoots directly to photography packages and clients.
- Status workflow: `Inquiry` ➔ `Confirmed` ➔ `In Progress` ➔ `Completed` ➔ `Cancelled`.
- 1-click **Generate Invoice from Booking** workflow.

### 4. Invoicing & Payment Tracking
- Unique auto-incrementing invoice numbering with configurable prefixes (e.g. `PSB-2024-001`).
- Dynamic line item editor (service description, quantity, unit price, and auto-computed line total).
- Decimal-safe monetary arithmetic: Flat Discounts, Configurable VAT/Tax %, Subtotal, and Grand Total.
- **Partial & Full Payments:** Record payments with methods (`Cash`, `Bank Wire`, `bKash`, `Nagad`, `Card`). Automatically updates invoice status and recognizes income without double-counting!
- **Print & PDF Engine:** Tailored print stylesheets (`@media print`) that format invoices cleanly for physical printing or PDF downloads.
- **Public Shareable Links:** Generate secure public invoice links (`/invoice/[id]/view`) for clients to view and print their invoice online without logging in.

### 5. Cash-Basis Accounting & Expenses
- **Recognized Income:** Recorded strictly upon receipt of payments (never counted merely upon drafting an invoice).
- **Categorized Expenses:** Gear & Lenses, Lighting & Modifiers, Studio Space Rent, Retoucher Salaries, Travel, Marketing & Ads, Utilities, and Software Subscriptions.
- Image receipt attachments and invoice reference tracking.
- **Financial Reports:** Profit & Loss Statement (P&L), Operating Margin %, Cash-flow reports, and CSV data exports.

### 6. Photography Packages & Deliverables
- Create unlimited packages with custom cover photography, shooting hours, edited photo counts, album specifications, delivery turnaround, and included services checklist.
- Duplicate, edit, sort, and archive packages with a single click.

### 7. Client Galleries & Project Delivery
- Client-specific digital album delivery portals.
- **Privacy Controls:** Public, Private, or Passcode-Protected client galleries with unlock gate.
- Responsive photo grids, client heart/favorite selections, and high-resolution photo downloads.

### 8. Studio Customization & Settings Center
- **Studio Identity:** Business name, tagline, phone, email, physical address, website, logo URL, and digital authorized signature.
- **Currency & Regionalization:** Support for BDT (৳), USD ($), EUR (€), GBP (£), INR (₹), and custom currency symbols.
- **Theme Customizer:** Light Mode, Dark Mode, System Auto, 6 primary accent palettes (Emerald, Indigo, Amber, Violet, Rose, Sky), and custom corner border radii.
- **Data Backups & Recovery:**
  - One-click export of the full database as a portable JSON backup file.
  - One-click restore from JSON backup.
  - Realistic Demo Data Seeder (PhotoSnap BD style wedding and commercial sessions) + Clear All Data button.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 14 (App Router, Server Actions, API Route Handlers) |
| **Language** | TypeScript 5 (Strict Mode) |
| **Styling** | Tailwind CSS 3.4, PostCSS, Autoprefixer |
| **UI Components** | Custom shadcn/ui-inspired accessible components, Lucide React icons |
| **Data Visualization** | Recharts (Responsive SVG Bar, Area, Pie, and Line charts) |
| **Database** | MongoDB Atlas with Mongoose ODM + Resilient fallback persistent JSON engine |
| **Security & Auth** | bcryptjs password hashing, HTTP-only JWT cookies, tenant isolation |
| **Data Export** | PapaParse (CSV generation), Print-to-PDF engine |

---

## ⚡ Quick Start for Local Development

### 1. Clone or Open the Repository
```bash
git clone <your-private-repo-url>
cd photo-studio-os
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Example configuration (`.env.local`):
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=super_secret_jwt_key_min_32_characters_random_string
MONGODB_URI=mongodb://localhost:27017/photo_studio_os
NEXT_PUBLIC_DEFAULT_CURRENCY=BDT
NEXT_PUBLIC_DEFAULT_CURRENCY_SYMBOL=৳
INITIAL_ADMIN_EMAIL=owner@photostudio.com
INITIAL_ADMIN_PASSWORD=StudioAdmin123!
```

> **Note on Zero-Config Local Storage:**
> If you do not have a local MongoDB instance running, the system will automatically utilize its built-in persistent local JSON storage engine (`.data/studio-store.json`). It works immediately out of the box without any database setup!

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Default Studio Credentials
- **Email:** `owner@photostudio.com`
- **Password:** `StudioAdmin123!`
*(Or click the "Fill Default Studio Owner Login" button on the login screen for instant access!)*

---

## 🔒 Private GitHub Repository Setup

To ensure your source code and configurations remain strictly private:

1. **Create a Private GitHub Repository:**
   - Go to [GitHub.com/new](https://github.com/new).
   - Enter a repository name (e.g. `photo-studio-os`).
   - Select **Private** (Never select Public).
   - Do **NOT** initialize with a README or license (we already have them).

2. **Link Local Repository and Push:**
   ```bash
   git remote add origin https://github.com/<your-username>/photo-studio-os.git
   git branch -M main
   git push -u origin main
   ```

3. **Verify Security:**
   - Verify `.env` and `.env.local` are ignored by git (already included in `.gitignore`).
   - Only `.env.example` with safe placeholder keys should be committed.

---

## ☁️ Vercel Deployment Instructions

Deploying Photo Studio OS to Vercel is seamless:

### Step 1: Push Code to your Private GitHub Repo
Ensure your latest changes are pushed to your private GitHub repository on branch `main`.

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** ➔ **Project**.
3. Select your private GitHub repository `photo-studio-os` and click **Import**.

### Step 3: Configure Environment Variables in Vercel
In the Vercel project configuration panel, add the following Environment Variables:

| Variable Name | Description | Example Production Value |
|---|---|---|
| `AUTH_SECRET` | 32+ character random string for JWT encryption | `openssl rand -base64 32` |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/photo_studio_os?retryWrites=true&w=majority` |
| `NEXT_PUBLIC_APP_URL` | Your production Vercel URL | `https://your-studio.vercel.app` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | Default currency code | `BDT` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY_SYMBOL` | Default currency symbol | `৳` |
| `INITIAL_ADMIN_EMAIL` | Production admin email | `admin@yourstudio.com` |
| `INITIAL_ADMIN_PASSWORD` | Production admin password | `SecureStudioPassword2026!` |

### Step 4: Deploy
Click **Deploy**. Vercel will compile the Next.js App Router project and publish the production deployment.

---

## 🧪 End-to-End Verification Checklist

The following workflows have been implemented and verified:

- [x] **Client Management:** Create, edit, search, filter, and archive client profiles with contact and shoot details.
- [x] **Client Balance Tracking:** Real-time calculation of Total Billed, Total Paid, and Balance Due.
- [x] **Photoshoot Scheduling:** Schedule shoots with shoot dates, start/end times, venues, and photographer assignments.
- [x] **Conflict Detection:** Scheduling conflict detector alerts if the same photographer or venue is assigned simultaneously.
- [x] **Dual View Calendar:** Interactive calendar view with date blocks and list view with status filtering.
- [x] **Itemized Invoicing:** Create invoices with dynamic line items, quantity, unit price, discounts, and tax rates.
- [x] **Payment Recording:** Record partial or full payments via bKash, Nagad, Bank Transfer, Card, or Cash.
- [x] **Cash-Basis Recognition:** Income is recognized only upon payment clearance; zero double-counting.
- [x] **Expense Management:** Track business gear, studio rent, and marketing expenditures with receipt attachments.
- [x] **Interactive Financial Graphs:** Responsive Recharts bar charts, area charts, donut charts, and cash-flow tracking.
- [x] **Public Shareable Invoices:** Client-facing invoice view at `/invoice/[id]/view` with clean print styling.
- [x] **Client Photo Galleries:** Digital project deliveries at `/gallery/[id]/view` with optional passcode protection.
- [x] **Complete Customization:** Dynamic theme switcher, 6 color palettes, studio logo/signature upload, and currency formatting.
- [x] **Backup & Recovery:** Portable JSON database export, backup restore, and demo data seeder.
- [x] **Zero Artificial Restrictions:** 100% free forever without trial expirations or feature locks.

---

## 📄 License

Distributed under the MIT License. Developed for independent photography studios and media creators worldwide.
