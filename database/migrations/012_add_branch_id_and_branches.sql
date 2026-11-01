-- =========================================================================
-- Migration 012: Add branch_id column to orders and appointments,
-- and ensure salon_branches table exists with Gachibowli and Kondapur branches.
-- =========================================================================

-- 1. Ensure branch_id exists on orders
ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- 2. Ensure branch_id exists on appointments
ALTER TABLE IF EXISTS public.appointments 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- 3. Ensure branch_id exists on whatsapp_message_logs and appointment_feedback
ALTER TABLE IF EXISTS public.whatsapp_message_logs 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- 4. Ensure salon_branches table exists
CREATE TABLE IF NOT EXISTS public.salon_branches (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(255),
    phone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    manager_id TEXT,
    manager_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Seed branches
INSERT INTO public.salon_branches (id, name, code, address, city, phone, whatsapp_number, manager_name, is_active)
VALUES
  ('tgl-gachibowli-main', 'Gachibowli Main Flagship', 'GCB-01', '31, Vinayak Nagar, Gachibowli', 'Hyderabad, Telangana - 500032', '8985799459', '8985799459', 'Madu Mounika', true),
  ('brn-1793346038689', 'Kondapur Branch', 'KND-02', 'Road No 2, Kondapur', 'Hyderabad, Telangana - 500084', '9491914422', '9491914422', 'Madu Mounika', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  whatsapp_number = EXCLUDED.whatsapp_number,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;
