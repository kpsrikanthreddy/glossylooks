# The Glossy Looks — Professional Women Salon & Admin Management System

A mobile-first, enterprise-grade salon website, customer portal, POS billing engine, and comprehensive 11-module salon management system built for **The Glossy Looks**, Gachibowli, Hyderabad.

---

## 🌸 Business Information

- **Brand Name**: The Glossy Looks
- **Category**: Professional Women Salon & Bridal Studio
- **Location**: 31, Vinayak Nagar, Gachibowli, Hyderabad, Telangana – 500032
- **Operating Hours**: 10:00 AM – 10:00 PM (Monday to Sunday)
- **Direct Phone / WhatsApp**: Configured dynamically in Admin → Settings → WhatsApp Integration
- **Google Maps**: [https://share.google/TWPbPEEVlN5mPfqpL](https://share.google/TWPbPEEVlN5mPfqpL)

---

## 🎨 Visual Identity & Palette

Designed around an opulent luxury salon aesthetic:
- **Salon Noir**: `#120B0F` (Dark Plum / Charcoal Black)
- **Royal Plum**: `#5B132B` / `#3B0E27`
- **Champagne Gold**: `#D4AF37`
- **Blush Rose**: `#F3D7D7`
- **Warm Cream**: `#FAF7F2`

---

## 🚀 Key Features

### 1. Customer Website (Mobile-First)
- **Marketplace Header**: Instant search with live dropdown suggestions across all services and benefits, location selector popup for Gachibowli branch, customer profile shortcut, and booking bag badge.
- **Hero Promotional Banner**: Elegant original Indian bridal artwork with quick CTAs for bookings, consultation enquiries, and dedicated makeup menu.
- **6 Core Categories** (Strict compliance: *Laser* and *Body Toning* removed):
  1. **Salon** (Hair styling, keratin, cuts, botox)
  2. **Spa** (Aromatherapy, deep tissue, scalp therapy)
  3. **Facials** (Hydra-glow, 24K gold, organic fruit)
  4. **Makeup** (Bridal, couture, and occasion)
  5. **Body Polishing** (Ubtan scrub, glow polish)
  6. **Mani & Pedi** (Crystal spa, gel extensions)
- **Dedicated 7-Item Makeup Studio Modal**:
  - *Bridal Makeup* (HD & Airbrush)
  - *Party Makeup*
  - *Engagement Makeup*
  - *Reception Makeup*
  - *Hair Styling*
  - *Saree Draping*
  - *Makeup Trial*
- **Service Menu Catalog**: Filterable tabs, duration, regular and discount pricing, and quick-add actions.
- **Curated Sections**: Most booked services, package combos, verified Google reviews, Instagram-style artist gallery, and interactive Gachibowli location card.
- **Multi-Service Booking Drawer**: Staff preference selection, date and time slots, customer phone/name input, payment mode selection, and instant WhatsApp confirmation link with pre-filled message.
- **Bottom Mobile Navigation Bar**: 5 thumb-friendly tabs (`Home`, `Services`, `Book`, `Orders`, `Profile`).

### 2. Customer Member Portal & OTP Authentication
- **Mobile Number OTP Verification**: Instant verification with 4-digit code (pre-configured for demo with `1234` or any 4 digits).
- **Private Member Dashboard**:
  - Upcoming appointment cards with live status indicators (`Pending`, `Confirmed`, `In Progress`) and receipt slip view.
  - Salon history with **1-Click Rebook** feature (reloads previous services into cart).
  - Past POS Orders & Invoices with item breakdowns, payment modes, and printable 80mm receipts.
  - Skin Care profile, birthday, allergies, and preference tracker.
  - Saved Gachibowli address.

### 3. Comprehensive Admin & Salon Operations Portal (`/admin`)
Access via the **"Salon Operations Login"** button or `/admin`. Demo mode provides 1-click role switching for quick testing.

- **Role-Based Access Control (RBAC)**:
  - `Owner / Admin` (Full salon control)
  - `Manager` (Appointments, CRM, Menu, Inventory)
  - `Receptionist / Cashier` (POS Billing, Appointments, Customer Check-in)
  - `Makeup Artist / Stylist` (Personal appointments, gallery uploads)
  - `Inventory Staff` (Stock counts, purchase orders, vendor deliveries)

- **11 Enterprise Modules with Full CRUD & Audit Trails**:
  1. **Dashboard**: Daily revenue metrics, appointment statuses, quick POS actions, low stock alerts, stylist attendance.
  2. **Customer Management (CRM)**: Customer database, VIP tagging, notes, allergies, loyalty points, visit counts, direct WhatsApp chat.
  3. **Appointment Management**: Centralized calendar and list views, staff assignments, status workflow, and 1-click conversion to POS bill.
  4. **Service & Menu Management**: Price updates, duration adjustments, category assignment, availability toggling, image management.
  5. **POS & Quick Billing**: 
     - Multi-item service & retail checkout
     - Staff commission assignment per item
     - Discounts and payment modes (Cash, UPI, Card, Split)
     - 80mm ESC/POS thermal receipt and service slip generation
  6. **Staff & Attendance**: Stylist profiles, specialties, contact info, shift timing, and daily clock-in/clock-out tracking.
  7. **Inventory & Consumables**: Salon backbar and retail products, stock alerts, unit costs, and barcode identifiers.
  8. **Suppliers & Purchase Orders**: Vendor registry, PO drafting, and stock delivery receiving.
  9. **Offers, Packages & Memberships**: Promotional discounts and curated multi-service bridal packages.
  10. **Gallery & Reviews Management**: Artist lookbook approvals, client testimonial curation, and public showcase control.
  11. **Print Device Management & Audit Logs**:
      - ESC/POS thermal printer setup (IP/Bluetooth/USB)
      - MOZZ PrintAgent live status tracking
      - Complete immutable audit log of all system edits and deletions

---

## 🖨️ Thermal Receipt & Hardware Print Agent

The system includes a dedicated 80mm thermal receipt generator that outputs both formatted customer bills and stylist service job tickets.

### MOZZ Standalone Desktop Print Agent
Located in `/print-agent/`:
- Polls the salon server every 3 seconds for queued print jobs.
- Directly routes ESC/POS byte streams to local USB, Network (Raw port 9100), or Bluetooth thermal receipt printers without showing browser print dialogs.
- Includes automatic reconnect and job status callback (`Printed`, `Failed`).

To run the print agent on the salon counter computer:
```bash
cd print-agent
npm install
npm run start
```

---

## 🗄️ Database Architecture & Supabase Migration

The backend is built around a clean Repository Pattern (`ISalonRepository`). Data is stored persistently in `/data/salon_store.json` by default, and can be connected directly to Supabase / PostgreSQL.

### Applying Supabase Migrations
1. Create a project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Copy the entire contents of `/database/supabase_schema.sql` and run it.
4. The migration script creates:
   - All relational tables (`customers`, `appointments`, `services`, `orders`, `inventory_items`, `audit_logs`, etc.)
   - Foreign key constraints, indexes, and triggers
   - Row-Level Security (RLS) policies
   - Storage buckets: `gallery-media` and `service-images`
5. Configure your `.env`:
   ```env
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

---

## 📱 Mobile App (Android / iOS) Conversion Guide

The architecture has been engineered from the ground up for zero-rewrite conversion to native mobile apps using **Capacitor** or **React Native / Expo**:

1. **Mobile-First Responsive Layout**: All drawers, modals, headers, and grids use responsive breakpoints with touch-friendly 44px+ hit targets.
2. **Decoupled API Client (`src/lib/api.ts`)**: All UI components consume clean async methods that work seamlessly inside native webviews or native JavaScript runtimes.
3. **Hardware Printer Abstraction**: The print queue API enables mobile devices (tablets or POS handhelds) to dispatch print jobs to the counter printer without needing direct Bluetooth pairing on each staff phone.
4. **Capacitor Conversion Steps**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   npx cap init "The Glossy Looks" "com.theglossylooks.salon"
   npm run build
   npx cap add android
   npx cap add ios
   npx cap sync
   ```

---

## 🛠️ Development & Execution

```bash
# Start full-stack server (Node.js Express + Vite on port 3000)
npm run dev

# Check TypeScript types
npm run lint

# Compile production bundle
npm run build
```

© The Glossy Looks — Gachibowli, Hyderabad.
