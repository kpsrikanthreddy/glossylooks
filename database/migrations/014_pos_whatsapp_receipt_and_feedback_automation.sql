-- =========================================================================
-- Migration 014: POS WhatsApp Receipt & 2-Minute Feedback Automation
-- =========================================================================
-- 1. Adds dedicated receipt and feedback delivery columns to public.orders
-- 2. Adds job_type and template_name to public.scheduled_feedback_jobs
-- 3. Adds scheduled_at and unique idempotent constraints to whatsapp_message_logs
-- =========================================================================

-- 1. Orders table updates for separate receipt & feedback tracking
ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS receipt_whatsapp_status TEXT DEFAULT 'pending';

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS receipt_whatsapp_message_id TEXT;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS receipt_whatsapp_error TEXT;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS receipt_whatsapp_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS feedback_whatsapp_status TEXT DEFAULT 'scheduled';

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS feedback_whatsapp_message_id TEXT;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS feedback_whatsapp_error TEXT;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS feedback_whatsapp_scheduled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS feedback_whatsapp_sent_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing orders so receipt_whatsapp_status matches existing whatsapp_status
UPDATE public.orders 
SET receipt_whatsapp_status = COALESCE(whatsapp_status, 'pending')
WHERE receipt_whatsapp_status IS NULL OR receipt_whatsapp_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_receipt_wa_status 
ON public.orders (receipt_whatsapp_status);

CREATE INDEX IF NOT EXISTS idx_orders_feedback_wa_status 
ON public.orders (feedback_whatsapp_status);

-- 2. Scheduled Feedback Jobs table updates
CREATE TABLE IF NOT EXISTS public.scheduled_feedback_jobs (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    order_id TEXT,
    branch_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    job_type TEXT DEFAULT 'customer_feedback',
    template_name TEXT DEFAULT 'glossylooks_customer_feedback',
    attempts INTEGER DEFAULT 0,
    meta_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS public.scheduled_feedback_jobs 
ADD COLUMN IF NOT EXISTS order_id TEXT;

ALTER TABLE IF EXISTS public.scheduled_feedback_jobs 
ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'customer_feedback';

ALTER TABLE IF EXISTS public.scheduled_feedback_jobs 
ADD COLUMN IF NOT EXISTS template_name TEXT DEFAULT 'glossylooks_customer_feedback';

CREATE INDEX IF NOT EXISTS idx_sfj_order_id 
ON public.scheduled_feedback_jobs (order_id);

CREATE INDEX IF NOT EXISTS idx_sfj_status_scheduled 
ON public.scheduled_feedback_jobs (status, scheduled_at);

-- Prevent duplicate scheduled jobs for the same order and job type
CREATE UNIQUE INDEX IF NOT EXISTS idx_sfj_order_job_template 
ON public.scheduled_feedback_jobs (order_id, job_type, template_name) 
WHERE order_id IS NOT NULL;

-- 3. WhatsApp Message Logs table updates
ALTER TABLE IF EXISTS public.whatsapp_message_logs 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Ensure unique idempotent log per order, job_type, and template_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_wml_order_job_template 
ON public.whatsapp_message_logs (order_id, job_type, template_name) 
WHERE order_id IS NOT NULL;

-- 4. Processed Webhook Events table (for delivery webhook deduplication)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pwe_event_id 
ON public.processed_webhook_events(event_id);
