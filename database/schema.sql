-- =====================================================================
-- The Glossy Looks - Complete PostgreSQL / Supabase Database Schema
-- Branch: 31, Vinayak Nagar, Gachibowli, Hyderabad
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users and Authentication (Admin & Staff Accounts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist', 'stylist', 'staff')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Profiles
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(50) NOT NULL,
    joining_date DATE NOT NULL,
    salary_type VARCHAR(20) DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'commission', 'hybrid')),
    base_salary DECIMAL(10, 2) DEFAULT 0.00,
    commission_rate DECIMAL(5, 2) DEFAULT 10.00, -- percentage
    skills TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    total_spend DECIMAL(10, 2) DEFAULT 0.00,
    visit_count INT DEFAULT 0,
    last_visit_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Service Categories
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Services
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE,
    salon_group TEXT,
    salon_subcategory TEXT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    benefits TEXT,
    duration_minutes INT NOT NULL DEFAULT 45,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    is_popular BOOLEAN DEFAULT FALSE,
    is_bridal_festive BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Packages & Combos
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_ids UUID[] DEFAULT '{}',
    original_price DECIMAL(10, 2) NOT NULL,
    package_price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Appointments & Bookings
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' 
        CHECK (status IN ('Pending', 'Confirmed', 'Checked In', 'Service In Progress', 'Completed', 'Cancelled', 'No Show')),
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    final_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    booking_source VARCHAR(50) DEFAULT 'website' 
        CHECK (booking_source IN ('website', 'pos', 'whatsapp', 'walkin', 'phone')),
    is_printed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Appointment Services Join Table
CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL
);

-- 9. Orders & POS Invoices
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    tax_percent DECIMAL(5, 2) DEFAULT 5.00, -- GST
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    grand_total DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    due_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Paid' 
        CHECK (payment_status IN ('Paid', 'Partial', 'Pending', 'Refunded', 'Cancelled')),
    primary_payment_mode VARCHAR(50) NOT NULL DEFAULT 'UPI' 
        CHECK (primary_payment_mode IN ('Cash', 'UPI', 'Card', 'Split Payment', 'Pay Later')),
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0.00
);

-- 11. Payments & Splits
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Other')),
    transaction_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Success',
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Inventory Items & Consumables
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'pcs',
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    min_stock_alert DECIMAL(10, 2) NOT NULL DEFAULT 5,
    cost_per_unit DECIMAL(10, 2) DEFAULT 0.00,
    supplier_name VARCHAR(255),
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Inventory Ledger & Stock Movement
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL 
        CHECK (transaction_type IN ('stock_in', 'stock_out', 'damaged', 'service_usage', 'adjustment')),
    quantity DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Print Devices (MOZZ Print Agent Architecture)
CREATE TABLE print_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_name VARCHAR(255) NOT NULL,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    branch VARCHAR(100) DEFAULT 'Gachibowli, Hyderabad',
    printer_name VARCHAR(255) NOT NULL,
    printer_type VARCHAR(50) NOT NULL CHECK (printer_type IN ('thermal', 'a4')),
    is_online BOOLEAN DEFAULT FALSE,
    auto_print_bill BOOLEAN DEFAULT TRUE,
    auto_print_slip BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Print Queue & Jobs
CREATE TABLE print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES print_devices(id) ON DELETE SET NULL,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('bill', 'service_ticket')),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Printing', 'Printed', 'Failed', 'Retried')),
    payload JSONB NOT NULL,
    retry_count INT DEFAULT 0,
    printed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Salon Content & Settings
CREATE TABLE salon_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name VARCHAR(255) DEFAULT 'The Glossy Looks',
    salon_type VARCHAR(255) DEFAULT 'Professional Women Salon',
    address TEXT DEFAULT '31, Vinayak Nagar, Gachibowli, Hyderabad',
    phone VARCHAR(50) DEFAULT '9848012345',
    whatsapp VARCHAR(50) DEFAULT '9848012345',
    opening_hours VARCHAR(100) DEFAULT '10:00 AM to 10:00 PM (Daily)',
    google_maps_url TEXT DEFAULT 'https://share.google/TWPbPEEVlN5mPfqpL',
    announcement_text TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Bridal & Work Portfolio Gallery
CREATE TABLE gallery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Salon Branches (Multi-Branch Architecture)
CREATE TABLE salon_branches (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    manager_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Branch WhatsApp Business Coexistence Integrations
CREATE TABLE branch_whatsapp_integrations (
    id VARCHAR(100) PRIMARY KEY,
    branch_id VARCHAR(100) NOT NULL REFERENCES salon_branches(id) ON DELETE CASCADE,
    configured_business_number VARCHAR(50) NOT NULL,
    waba_id VARCHAR(50),
    phone_number_id VARCHAR(50),
    display_name VARCHAR(255),
    display_phone_number VARCHAR(50),
    masked_phone_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'pairing', 'connected', 'failed')),
    connected_at TIMESTAMP WITH TIME ZONE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    diagnostics TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branch_wa_branch_id ON branch_whatsapp_integrations(branch_id);
CREATE INDEX idx_salon_branches_manager ON salon_branches(manager_id);

-- 20. WhatsApp Message Delivery Logs
CREATE TABLE whatsapp_message_logs (
    id VARCHAR(100) PRIMARY KEY,
    appointment_id VARCHAR(100),
    order_id VARCHAR(100),
    branch_id VARCHAR(100) NOT NULL REFERENCES salon_branches(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    recipient_number VARCHAR(50) NOT NULL,
    sender_phone_number_id VARCHAR(50) NOT NULL,
    meta_message_id VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'pending_approval')),
    error_message TEXT,
    diagnostics TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wml_appointment ON whatsapp_message_logs(appointment_id);
CREATE INDEX idx_wml_branch ON whatsapp_message_logs(branch_id);
CREATE INDEX idx_wml_meta_id ON whatsapp_message_logs(meta_message_id);

-- 21. Customer Feedback & Review Responses
CREATE TABLE appointment_feedback (
    id VARCHAR(100) PRIMARY KEY,
    appointment_id VARCHAR(100) NOT NULL UNIQUE,
    branch_id VARCHAR(100) NOT NULL REFERENCES salon_branches(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    rating VARCHAR(20) NOT NULL CHECK (rating IN ('good', 'average', 'bad')),
    reply_text TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notification_read BOOLEAN DEFAULT FALSE,
    meta_message_id VARCHAR(100)
);

CREATE INDEX idx_afb_branch ON appointment_feedback(branch_id);
CREATE INDEX idx_afb_rating ON appointment_feedback(rating);

-- 22. Durable Scheduled Feedback Jobs (Survives Restarts & Reboots)
CREATE TABLE scheduled_feedback_jobs (
    id VARCHAR(100) PRIMARY KEY,
    appointment_id VARCHAR(100) NOT NULL UNIQUE,
    branch_id VARCHAR(100) NOT NULL REFERENCES salon_branches(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
    attempts INT DEFAULT 0,
    error TEXT,
    message_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sfj_status_sched ON scheduled_feedback_jobs(status, scheduled_at);

-- 23. Processed Webhook Events (Idempotency & Deduplication)
CREATE TABLE processed_webhook_events (
    id VARCHAR(100) PRIMARY KEY,
    event_id VARCHAR(150) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pwe_event_id ON processed_webhook_events(event_id);

