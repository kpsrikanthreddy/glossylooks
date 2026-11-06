-- =========================================================================
-- Migration 015: Customer CRM, Payment Ledger, and WhatsApp Feedback Enhancements
-- =========================================================================
-- 1. Adds missing columns to public.customers (branch, visit timestamps, latest bill, rating)
-- 2. Backfills public.customers from existing POS orders and appointments
-- 3. Ensures public.payments has all ledger breakdown fields and backfills from orders
-- 4. Enhances public.appointment_feedback for two-way automated WhatsApp feedback tracking
-- 5. Defensively handles processed_webhook_events table & schema cache reload
-- =========================================================================

-- 1. Enhance public.customers
ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS branch_id TEXT;

ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS branch_name TEXT;

ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS first_visit_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS latest_bill_number TEXT;

ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS feedback_rating TEXT;

ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers (mobile);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers (branch_id);

-- 2. Backfill public.customers from existing orders
DO $$
DECLARE
    r RECORD;
    v_clean_mobile TEXT;
    v_existing_id_text TEXT;
BEGIN
    FOR r IN (
        SELECT 
            customer_phone,
            customer_name,
            branch_id,
            bill_number,
            grand_total,
            created_at
        FROM public.orders
        WHERE customer_phone IS NOT NULL AND customer_phone != ''
        ORDER BY created_at ASC
    ) LOOP
        -- Normalize phone to last 10 digits for matching
        v_clean_mobile := RIGHT(REGEXP_REPLACE(r.customer_phone, '\D', '', 'g'), 10);
        IF LENGTH(v_clean_mobile) = 10 THEN
            SELECT id::text INTO v_existing_id_text 
            FROM public.customers 
            WHERE RIGHT(REGEXP_REPLACE(mobile, '\D', '', 'g'), 10) = v_clean_mobile
            LIMIT 1;

            IF v_existing_id_text IS NOT NULL THEN
                UPDATE public.customers
                SET 
                    name = COALESCE(NULLIF(r.customer_name, ''), name),
                    total_spend = COALESCE(total_spend, 0) + COALESCE(r.grand_total, 0),
                    visit_count = COALESCE(visit_count, 0) + 1,
                    last_visit_at = r.created_at,
                    latest_bill_number = COALESCE(r.bill_number, latest_bill_number),
                    branch_id = COALESCE(r.branch_id, branch_id),
                    updated_at = NOW()
                WHERE id::text = v_existing_id_text;
            ELSE
                INSERT INTO public.customers (
                    name,
                    mobile,
                    branch_id,
                    total_spend,
                    visit_count,
                    first_visit_at,
                    last_visit_at,
                    latest_bill_number,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    COALESCE(NULLIF(r.customer_name, ''), 'Salon Guest'),
                    v_clean_mobile,
                    r.branch_id,
                    COALESCE(r.grand_total, 0),
                    1,
                    r.created_at,
                    r.created_at,
                    r.bill_number,
                    'active',
                    r.created_at,
                    NOW()
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- 3. Enhance public.payments and backfill from orders
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    bill_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_mode TEXT NOT NULL DEFAULT 'Cash',
    transaction_ref TEXT,
    status TEXT NOT NULL DEFAULT 'Success',
    refund_reason TEXT,
    notes TEXT,
    recorded_by TEXT,
    branch_id TEXT,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS public.payments
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Backfill missing payments from orders so Ledger is 100% complete
INSERT INTO public.payments (
    order_id,
    bill_number,
    customer_name,
    customer_phone,
    amount,
    payment_mode,
    status,
    subtotal,
    discount,
    tax_amount,
    branch_id,
    created_at
)
SELECT 
    o.id,
    o.bill_number,
    o.customer_name,
    o.customer_phone,
    o.grand_total,
    COALESCE(o.primary_payment_mode, 'Cash'),
    CASE WHEN o.payment_status = 'Cancelled' THEN 'Void'
         WHEN o.payment_status = 'Refunded' THEN 'Refunded'
         ELSE 'Success' END,
    COALESCE(o.subtotal, o.grand_total),
    COALESCE(o.discount, 0),
    COALESCE(o.tax_amount, 0),
    o.branch_id,
    o.created_at
FROM public.orders o
WHERE NOT EXISTS (
    SELECT 1 FROM public.payments p WHERE p.order_id::text = o.id::text
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_bill_number ON public.payments (bill_number);
CREATE INDEX IF NOT EXISTS idx_payments_branch_id ON public.payments (branch_id);

-- 4. Enhance public.appointment_feedback
CREATE TABLE IF NOT EXISTS public.appointment_feedback (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    order_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    rating TEXT,
    notes TEXT,
    reply_status TEXT,
    outgoing_meta_message_id TEXT,
    incoming_meta_message_id TEXT,
    reply_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS order_id TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS reply_status TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS outgoing_meta_message_id TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS incoming_meta_message_id TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS meta_message_id TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS reply_text TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS branch_id TEXT;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS public.appointment_feedback
ADD COLUMN IF NOT EXISTS reply_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_feedback_order_id ON public.appointment_feedback (order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_phone ON public.appointment_feedback (customer_phone);

-- 5. Ensure processed_webhook_events exists with event_id
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_id TEXT,
    event_type TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS public.processed_webhook_events
ADD COLUMN IF NOT EXISTS event_id TEXT;

ALTER TABLE IF EXISTS public.processed_webhook_events
ADD COLUMN IF NOT EXISTS event_type TEXT;

ALTER TABLE IF EXISTS public.processed_webhook_events
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pwe_event_id_unique
ON public.processed_webhook_events (event_id)
WHERE event_id IS NOT NULL;

-- 6. Ensure scheduled_feedback_jobs columns exist defensively
ALTER TABLE IF EXISTS public.scheduled_feedback_jobs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS public.scheduled_feedback_jobs
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS public.scheduled_feedback_jobs
ADD COLUMN IF NOT EXISTS meta_message_id TEXT;

ALTER TABLE IF EXISTS public.scheduled_feedback_jobs
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 7. Reload schema cache for PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
