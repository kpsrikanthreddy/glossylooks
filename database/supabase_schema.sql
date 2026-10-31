-- =====================================================================
-- The Glossy Looks - Complete Supabase PostgreSQL Schema & Storage Policies
-- Location: 31, Vinayak Nagar, Gachibowli, Hyderabad
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. App Users (Admin & Staff Accounts)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist', 'stylist', 'inventory_staff')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    branch_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Profiles & Availability (1:1 Bidirectionally Linked to Admin Users)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    admin_user_id VARCHAR(50) REFERENCES public.users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100) NOT NULL,
    branch_id VARCHAR(100),
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary_type VARCHAR(20) DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'commission', 'hybrid')),
    base_salary DECIMAL(10, 2) DEFAULT 0.00,
    commission_rate DECIMAL(5, 2) DEFAULT 10.00,
    skills TEXT[] DEFAULT '{}',
    working_hours VARCHAR(100) DEFAULT '10:00 AM - 08:00 PM',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_user_id UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.staff_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_on_leave BOOLEAN DEFAULT FALSE,
    shift_start TIME DEFAULT '10:00:00',
    shift_end TIME DEFAULT '22:00:00',
    notes TEXT,
    UNIQUE (staff_id, date)
);

-- 3. Customers & OTP Sessions
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    birthday DATE,
    address TEXT,
    saved_addresses JSONB DEFAULT '[]'::jsonb,
    preferences TEXT,
    allergies TEXT,
    notes TEXT,
    loyalty_points INT DEFAULT 0,
    total_spend DECIMAL(10, 2) DEFAULT 0.00,
    visit_count INT DEFAULT 0,
    last_visit_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.otp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile VARCHAR(20) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Service Categories, Services & Add-ons
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE,
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
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    add_ons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_ids UUID[] DEFAULT '{}',
    service_names TEXT[] DEFAULT '{}',
    original_price DECIMAL(10, 2) NOT NULL,
    package_price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Appointments & Items
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Confirmed', 'Checked In', 'Service In Progress', 'Completed', 'Cancelled', 'No Show')),
    assigned_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    assigned_staff_name VARCHAR(255),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    final_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_preference VARCHAR(50) DEFAULT 'pay_at_salon',
    notes TEXT,
    booking_source VARCHAR(50) DEFAULT 'website',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.appointment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    duration INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(255)
);

-- 6. Orders, Invoices & Items
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_number VARCHAR(50) UNIQUE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    tax_percent DECIMAL(5, 2) DEFAULT 5.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    tip_amount DECIMAL(10, 2) DEFAULT 0.00,
    grand_total DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    due_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Paid'
        CHECK (payment_status IN ('Paid', 'Partial', 'Pending', 'Refunded', 'Cancelled')),
    primary_payment_mode VARCHAR(50) NOT NULL DEFAULT 'UPI',
    cashier_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    product_id UUID,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(20) DEFAULT 'service' CHECK (item_type IN ('service', 'product')),
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(255),
    commission_amount DECIMAL(10, 2) DEFAULT 0.00
);

-- 7. Payments & Refunds
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    bill_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    transaction_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Success',
    refund_reason TEXT,
    notes TEXT,
    recorded_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Products, Suppliers, Purchase Orders & Inventory Movements
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'pcs',
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    min_stock_alert DECIMAL(10, 2) NOT NULL DEFAULT 5,
    purchase_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    expiry_date DATE,
    location VARCHAR(100),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    is_retail BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_cost DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Ordered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    movement_type VARCHAR(50) NOT NULL
        CHECK (movement_type IN ('stock_in', 'stock_out', 'damaged', 'wastage', 'service_usage', 'pos_sale', 'adjustment')),
    quantity DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    performed_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Gallery Portfolio
CREATE TABLE IF NOT EXISTS public.gallery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    artist_name VARCHAR(255),
    service_type VARCHAR(100),
    image_url TEXT NOT NULL,
    video_url TEXT,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    is_approved BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Enquiries, Offers & Reviews
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    service_interest VARCHAR(255),
    message TEXT,
    status VARCHAR(50) DEFAULT 'New',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    coupon_code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('flat', 'percentage')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0.00,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    customer_area VARCHAR(255),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    service_rendered VARCHAR(255),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Print Devices & Print Jobs (MOZZ Print Architecture)
CREATE TABLE IF NOT EXISTS public.print_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_name VARCHAR(255) NOT NULL,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    branch VARCHAR(100) DEFAULT '31, Vinayak Nagar, Gachibowli, Hyderabad',
    printer_name VARCHAR(255) NOT NULL,
    printer_type VARCHAR(50) NOT NULL CHECK (printer_type IN ('thermal', 'a4')),
    paper_size VARCHAR(20) DEFAULT '80mm',
    is_online BOOLEAN DEFAULT FALSE,
    auto_print_bill BOOLEAN DEFAULT TRUE,
    auto_print_slip BOOLEAN DEFAULT TRUE,
    copies INT DEFAULT 1,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES public.print_devices(id) ON DELETE SET NULL,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('bill', 'service_ticket')),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Printing', 'Printed', 'Failed', 'Retried')),
    payload JSONB NOT NULL,
    retry_count INT DEFAULT 0,
    printed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Salon Settings & Audit Logs
CREATE TABLE IF NOT EXISTS public.salon_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name VARCHAR(255) DEFAULT 'The Glossy Looks',
    salon_type VARCHAR(255) DEFAULT 'Professional Women Salon & Bridal Studio',
    address TEXT DEFAULT '31, Vinayak Nagar, Gachibowli',
    city TEXT DEFAULT 'Hyderabad, Telangana - 500032',
    phone VARCHAR(50) DEFAULT '9848012345',
    whatsapp VARCHAR(50) DEFAULT '9848012345',
    opening_hours VARCHAR(100) DEFAULT '10:00 AM to 10:00 PM (Monday to Sunday)',
    google_maps_url TEXT DEFAULT 'https://share.google/TWPbPEEVlN5mPfqpL',
    announcement_text TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. WhatsApp Business Coexistence Integration (Legacy Global)
CREATE TABLE IF NOT EXISTS public.whatsapp_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id VARCHAR(100) NOT NULL DEFAULT 'tgl-gachibowli-main',
    waba_id VARCHAR(100),
    phone_number_id VARCHAR(100),
    display_phone_number VARCHAR(50),
    masked_phone_number VARCHAR(50),
    display_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'connecting', 'connected', 'error', 'disconnected')),
    connected_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Salon Branches (Multi-Branch Coexistence Architecture)
CREATE TABLE IF NOT EXISTS public.salon_branches (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Branch WhatsApp Business Coexistence Integrations
CREATE TABLE IF NOT EXISTS public.branch_whatsapp_integrations (
    id VARCHAR(100) PRIMARY KEY,
    branch_id VARCHAR(100) NOT NULL REFERENCES public.salon_branches(id) ON DELETE CASCADE,
    configured_business_number VARCHAR(50) NOT NULL,
    waba_id VARCHAR(100),
    phone_number_id VARCHAR(100),
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

CREATE INDEX IF NOT EXISTS idx_branch_wa_branch ON public.branch_whatsapp_integrations(branch_id);
CREATE INDEX IF NOT EXISTS idx_salon_branches_manager ON public.salon_branches(manager_id);

-- 16. WhatsApp Message Logs
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
    id VARCHAR(100) PRIMARY KEY,
    appointment_id VARCHAR(100),
    order_id VARCHAR(100),
    branch_id VARCHAR(100) NOT NULL REFERENCES public.salon_branches(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_wml_appointment ON public.whatsapp_message_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_wml_branch ON public.whatsapp_message_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_wml_meta_id ON public.whatsapp_message_logs(meta_message_id);

-- 17. Customer Feedback & Review Responses
CREATE TABLE IF NOT EXISTS public.appointment_feedback (
    id VARCHAR(100) PRIMARY KEY,
    appointment_id VARCHAR(100) NOT NULL UNIQUE,
    branch_id VARCHAR(100) NOT NULL REFERENCES public.salon_branches(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    rating VARCHAR(20) NOT NULL CHECK (rating IN ('good', 'average', 'bad')),
    reply_text TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notification_read BOOLEAN DEFAULT FALSE,
    meta_message_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_afb_branch ON public.appointment_feedback(branch_id);
CREATE INDEX IF NOT EXISTS idx_afb_rating ON public.appointment_feedback(rating);

-- 18. Durable Scheduled Feedback Jobs
CREATE TABLE IF NOT EXISTS public.scheduled_feedback_jobs (
    id VARCHAR(100) PRIMARY KEY,
    appointment_id VARCHAR(100) NOT NULL UNIQUE,
    branch_id VARCHAR(100) NOT NULL REFERENCES public.salon_branches(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_sfj_status_sched ON public.scheduled_feedback_jobs(status, scheduled_at);

-- 19. Processed Webhook Events (Idempotency)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id VARCHAR(100) PRIMARY KEY,
    event_id VARCHAR(150) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pwe_event_id ON public.processed_webhook_events(event_id);


-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can view active services, categories, approved gallery, and reviews
CREATE POLICY "Public services read" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Public categories read" ON public.service_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public gallery read" ON public.gallery_items FOR SELECT USING (is_approved = true);
CREATE POLICY "Public reviews read" ON public.reviews FOR SELECT USING (is_published = true);

-- =====================================================================
-- SUPABASE STORAGE BUCKET POLICIES
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-media', 'gallery-media', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public Access Gallery Media" ON storage.objects FOR SELECT USING (bucket_id = 'gallery-media');
CREATE POLICY "Public Access Service Images" ON storage.objects FOR SELECT USING (bucket_id = 'service-images');

-- =====================================================================
-- INITIAL PRODUCTION SEED: OWNER MADU MOUNIKA & GACHIBOWLI MAIN BRANCH
-- =====================================================================
INSERT INTO public.salon_branches (id, name, code, address, city, phone, whatsapp_number, is_active)
VALUES (
    'tgl-gachibowli-main',
    'Gachibowli Main Flagship',
    'GCB-01',
    '31, Vinayak Nagar, Gachibowli',
    'Hyderabad, Telangana - 500032',
    '8985799459',
    '8985799459',
    true
) ON CONFLICT (id) DO UPDATE SET
    phone = '8985799459',
    whatsapp_number = '8985799459';

INSERT INTO public.users (id, user_id, email, password_hash, role, name, phone, branch_id, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'TGL-OWN01',
    'owner@theglossylooks.com',
    'admin123',
    'owner',
    'Madu Mounika',
    '8985799459',
    'tgl-gachibowli-main',
    true
) ON CONFLICT (email) DO UPDATE SET
    name = 'Madu Mounika',
    user_id = 'TGL-OWN01',
    phone = '8985799459',
    branch_id = 'tgl-gachibowli-main';

INSERT INTO public.staff (id, user_id, admin_user_id, name, phone, email, role, branch_id, joining_date, salary_type, base_salary, commission_rate, skills, working_hours, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'TGL-OWN01',
    'Madu Mounika',
    '8985799459',
    'owner@theglossylooks.com',
    'Salon Director & Master Stylist',
    'tgl-gachibowli-main',
    '2024-01-01',
    'monthly',
    85000.00,
    15.00,
    ARRAY['Bridal Makeup', 'Airbrush Art', 'Hair Couture', 'Aesthetics', 'Salon Management'],
    '10:00 AM - 08:00 PM',
    true
) ON CONFLICT (user_id) DO UPDATE SET
    name = 'Madu Mounika',
    phone = '8985799459',
    email = 'owner@theglossylooks.com',
    admin_user_id = 'TGL-OWN01';

INSERT INTO public.branch_whatsapp_integrations (
    id, branch_id, configured_business_number, waba_id, phone_number_id,
    display_name, display_phone_number, masked_phone_number, status,
    connected_at, last_verified_at, diagnostics
) VALUES (
    'bwa-gcb-01',
    'tgl-gachibowli-main',
    '8985799459',
    '1608729824244675',
    '1379025201957313',
    'THE GLOSSY LOOKS',
    '+91 89857 99459',
    '+91 ******9459',
    'connected',
    '2026-10-30T07:45:00.000Z',
    '2026-10-30T07:45:00.000Z',
    'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.'
) ON CONFLICT (id) DO UPDATE SET
    waba_id = '1608729824244675',
    phone_number_id = '1379025201957313',
    configured_business_number = '8985799459',
    status = 'connected';

